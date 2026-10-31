package in.amanahpay.auth;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;

@RestController @RequestMapping("/api/v1/auth")
public class AuthController {
  private final JdbcTemplate db; private final OtpMailService mail; private final SecureRandom rng=new SecureRandom();
  @Value("${amanah.otp-pepper}") String pepper; @Value("${amanah.jwt-secret}") String jwtSecret;
  @Value("${amanah.jwt-issuer}") String issuer; @Value("${amanah.app-base-url}") String appUrl;
  @Value("${amanah.otp-ttl-minutes}") int otpMins; @Value("${amanah.otp-resend-seconds}") int cooldown;
  @Value("${amanah.refresh-days}") int refreshDays;
  public AuthController(JdbcTemplate db, OtpMailService mail){this.db=db;this.mail=mail;}
  public record Signup(@Email @NotBlank String email,@NotBlank String businessName){}
  public record Login(@Email @NotBlank String email){}
  public record Verify(@Email @NotBlank String email,@NotBlank @Pattern(regexp="[0-9]{6}") String code,@NotBlank String purpose){}
  @PostMapping("/signup/request") @ResponseStatus(HttpStatus.ACCEPTED)
  @Transactional
  public Map<String,String> signup(@Valid @RequestBody Signup req,HttpServletRequest http){String email=norm(req.email());rateLimit(email,http);
    List<Map<String,Object>> existing=db.queryForList("SELECT id,status,role FROM users WHERE email=?",email);
    if(existing.isEmpty()){
      KeyHolder merchantKey=new GeneratedKeyHolder();db.update(c->{var ps=c.prepareStatement("INSERT INTO merchants(business_name,status) VALUES(?, 'PENDING')",new String[]{"id"});ps.setString(1,req.businessName().trim());return ps;},merchantKey);
      Long merchant=Objects.requireNonNull(merchantKey.getKey()).longValue();db.update("INSERT INTO users(merchant_id,email,role,status) VALUES(?,?,'OWNER','PENDING')",merchant,email);
      sendOtp(email,"SIGNUP",http);
    } else if("PENDING".equals(existing.getFirst().get("status")) && "OWNER".equals(existing.getFirst().get("role"))) sendOtp(email,"SIGNUP",http);
    audit("otp_requested",email,http); return Map.of("message","If this address can receive a code, one will arrive shortly.");}
  @PostMapping("/login/request") @ResponseStatus(HttpStatus.ACCEPTED)
  public Map<String,String> login(@Valid @RequestBody Login req,HttpServletRequest http){String email=norm(req.email());rateLimit(email,http);if(db.queryForObject("SELECT COUNT(*) FROM users WHERE email=? AND status='ACTIVE'",Integer.class,email)>0)sendOtp(email,"LOGIN",http);audit("otp_requested",email,http);return Map.of("message","If this address can receive a code, one will arrive shortly.");}
  @PostMapping("/otp/verify") public Map<String,Object> verify(@Valid @RequestBody Verify req,HttpServletRequest http,HttpServletResponse response){String email=norm(req.email());String purpose=req.purpose().toUpperCase(Locale.ROOT);String id=hash(email);Integer failed=db.queryForObject("SELECT COUNT(*) FROM login_attempts WHERE identifier_hash=? AND success=FALSE AND created_at>DATE_SUB(NOW(),INTERVAL 30 MINUTE)",Integer.class,id);if(failed!=null&&failed>=10){audit("lockout",email,http);throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Try again later");}
    var rows=db.query("SELECT id,code_hash,attempts,expires_at FROM otp_codes WHERE identifier_hash=? AND purpose=? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1",(rs,n)->new Object[]{rs.getLong(1),rs.getString(2),rs.getInt(3),rs.getTimestamp(4).toInstant()},id,purpose);
    if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid or expired code");Object[] row=rows.getFirst();long otpId=(long)row[0];String correct=(String)row[1];int tries=(int)row[2];Instant expires=(Instant)row[3];
    if(tries>=5||Instant.now().isAfter(expires)||!MessageDigest.isEqual(correct.getBytes(StandardCharsets.US_ASCII),hmac(req.code()).getBytes(StandardCharsets.US_ASCII))){db.update("UPDATE otp_codes SET attempts=attempts+1, consumed_at=IF(attempts+1>=5,NOW(),consumed_at) WHERE id=?",otpId);recordAttempt(email,http,false);audit("otp_failed",email,http);throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid or expired code");}
    recordAttempt(email,http,true);
    db.update("UPDATE otp_codes SET consumed_at=NOW() WHERE id=?",otpId);List<Map<String,Object>> users=db.query("SELECT id,merchant_id,role FROM users WHERE email=?",(rs,n)->{Map<String,Object> m=new HashMap<>();m.put("id",rs.getLong(1));m.put("merchantId",rs.getObject(2)==null?0L:rs.getLong(2));m.put("role",rs.getString(3));return m;},email);if(users.isEmpty())throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    Map<String,Object> user=users.getFirst();db.update("UPDATE users SET status='ACTIVE' WHERE id=?",user.get("id"));if("OWNER".equals(user.get("role")))db.update("UPDATE merchants SET status='ACTIVE' WHERE id=?",user.get("merchantId"));audit("otp_verified",email,http);audit("login",email,http);
    String raw=UUID.randomUUID()+"."+Base64.getUrlEncoder().withoutPadding().encodeToString(random(32));String family=UUID.randomUUID().toString();db.update("INSERT INTO refresh_tokens(user_id,family_id,token_hash,expires_at,created_ip,user_agent) VALUES(?,?,?,?,?,?)",user.get("id"),family,sha(raw),java.sql.Timestamp.from(Instant.now().plusSeconds(refreshDays*86400L)),ip(http),http.getHeader("User-Agent"));cookie(response,raw,http);return tokenResponse(user);}
  @PostMapping("/refresh") public Map<String,Object> refresh(@CookieValue(value="amanah_refresh",required=false)String raw,HttpServletRequest http,HttpServletResponse response){if(raw==null)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);String h=sha(raw);var rs=db.query("SELECT id,user_id,family_id,revoked_at,expires_at FROM refresh_tokens WHERE token_hash=?",(r,n)->new Object[]{r.getLong(1),r.getLong(2),r.getString(3),r.getTimestamp(4)==null?null:r.getTimestamp(4).toInstant(),r.getTimestamp(5).toInstant()},h);if(rs.isEmpty())throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);Object[] row=rs.getFirst();if(row[3]!=null){db.update("UPDATE refresh_tokens SET revoked_at=NOW() WHERE family_id=?",row[2]);audit("reuse_detected","",http);throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);}if(Instant.now().isAfter((Instant)row[4]))throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    String next=UUID.randomUUID()+"."+Base64.getUrlEncoder().withoutPadding().encodeToString(random(32));db.update("INSERT INTO refresh_tokens(user_id,family_id,token_hash,expires_at,created_ip,user_agent) VALUES(?,?,?,?,?,?)",row[1],row[2],sha(next),java.sql.Timestamp.from(Instant.now().plusSeconds(refreshDays*86400L)),ip(http),http.getHeader("User-Agent"));Long newid=db.queryForObject("SELECT id FROM refresh_tokens WHERE token_hash=?",Long.class,sha(next));db.update("UPDATE refresh_tokens SET revoked_at=NOW(),replaced_by=? WHERE id=?",newid,row[0]);var u=db.queryForMap("SELECT id,merchant_id,role,email FROM users WHERE id=?",row[1]);cookie(response,next,http);audit("refresh",(String)u.get("email"),http);return tokenResponse(Map.of("id",u.get("id"),"merchantId",u.get("merchant_id"),"role",u.get("role")));}
  @PostMapping("/logout") public Map<String,String> logout(@CookieValue(value="amanah_refresh",required=false)String raw,HttpServletRequest http,HttpServletResponse response){if(raw!=null)db.update("UPDATE refresh_tokens SET revoked_at=NOW() WHERE token_hash=?",sha(raw));response.addHeader("Set-Cookie","amanah_refresh=; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=0");audit("logout","",http);return Map.of("message","Logged out");}
  @PostMapping("/logout-all") public Map<String,String> logoutAll(@RequestHeader(value="Authorization",required=false)String auth,HttpServletRequest http,HttpServletResponse response){Map<String,Object> claims=claims(auth);long userId=Long.parseLong(claims.get("sub").toString());db.update("UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=? AND revoked_at IS NULL",userId);response.addHeader("Set-Cookie","amanah_refresh=; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=0");audit("logout_all","",http);return Map.of("message","All sessions logged out");}
  @GetMapping("/me") public Map<String,Object> me(@RequestHeader(value="Authorization",required=false)String auth){Map<String,Object> claims=claims(auth);List<Map<String,Object>> rows=db.query("SELECT u.id,u.email,u.role,u.merchant_id,m.business_name FROM users u LEFT JOIN merchants m ON m.id=u.merchant_id WHERE u.id=? AND u.status='ACTIVE'",(r,n)->{Map<String,Object> x=new HashMap<>();x.put("id",r.getLong(1));x.put("email",r.getString(2));x.put("role",r.getString(3));x.put("merchantId",r.getObject(4)==null?0L:r.getLong(4));x.put("businessName",Objects.toString(r.getString(5),""));return x;},Long.valueOf(claims.get("sub").toString()));if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);Map<String,Object> out=new HashMap<>(rows.getFirst());out.put("permissions",List.of("plans:read","customers:read"));return out;}
  private void sendOtp(String email,String purpose,HttpServletRequest req){String id=hash(email);Integer recent=db.queryForObject("SELECT COUNT(*) FROM otp_codes WHERE identifier_hash=? AND created_at>DATE_SUB(NOW(),INTERVAL ? SECOND)",Integer.class,id,cooldown);if(recent!=null&&recent>0)return;db.update("UPDATE otp_codes SET consumed_at=NOW() WHERE identifier_hash=? AND purpose=? AND consumed_at IS NULL",id,purpose);String code=String.format("%06d",rng.nextInt(1_000_000));db.update("INSERT INTO otp_codes(identifier_hash,channel,purpose,code_hash,expires_at,ip) VALUES(?,'EMAIL',?,?,DATE_ADD(NOW(),INTERVAL ? MINUTE),?)",id,purpose,hmac(code),otpMins,ip(req));mail.send(email,"Your Amanah Pay verification code","Your verification code is "+code+". It expires in "+otpMins+" minutes.");}
  private void rateLimit(String email,HttpServletRequest req){String id=hash(email),clientIp=ip(req);Integer emailCount=db.queryForObject("SELECT COUNT(*) FROM login_attempts WHERE identifier_hash=? AND created_at>DATE_SUB(NOW(),INTERVAL 1 HOUR)",Integer.class,id);Integer ipCount=db.queryForObject("SELECT COUNT(*) FROM login_attempts WHERE ip=? AND created_at>DATE_SUB(NOW(),INTERVAL 1 HOUR)",Integer.class,clientIp);if((emailCount!=null&&emailCount>=5)||(ipCount!=null&&ipCount>=20)){audit("otp_rate_limited",email,req);throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Too many requests");}recordAttempt(email,req,true);}
  private void recordAttempt(String email,HttpServletRequest req,boolean success){db.update("INSERT INTO login_attempts(identifier_hash,ip,success) VALUES(?,?,?)",hash(email),ip(req),success);}
  private Map<String,Object> tokenResponse(Map<String,Object> u){String jwt=Jwts.builder().issuer(issuer).subject(String.valueOf(u.get("id"))).claim("role",u.get("role")).claim("merchantId",u.get("merchantId")).id(UUID.randomUUID().toString()).issuedAt(new Date()).expiration(Date.from(Instant.now().plusSeconds(900))).signWith(Keys.hmacShaKeyFor(Base64.getDecoder().decode(jwtSecret))).compact();return Map.of("accessToken",jwt,"expiresIn",900,"user",u);}
  private Map<String,Object> claims(String auth){try{return Jwts.parser().verifyWith(Keys.hmacShaKeyFor(Base64.getDecoder().decode(jwtSecret))).build().parseSignedClaims(auth.replaceFirst("(?i)^Bearer ","")).getPayload();}catch(Exception e){throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);}}
  private void cookie(HttpServletResponse r,String v,HttpServletRequest q){boolean secure=Arrays.asList(q.getHeader("X-Forwarded-Proto")==null?"http":q.getHeader("X-Forwarded-Proto")).contains("https");r.addHeader("Set-Cookie","amanah_refresh="+v+"; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age="+(refreshDays*86400)+(secure?"; Secure":""));}
  private void audit(String ev,String email,HttpServletRequest q){db.update("INSERT INTO audit_logs(event_type,email_masked,ip,user_agent) VALUES(?,?,?,?)",ev,email==null||email.isBlank()?null:email.replaceAll("(^.).*(@.*$)","$1***$2"),ip(q),q.getHeader("User-Agent"));}
  private String hmac(String s){try{Mac m=Mac.getInstance("HmacSHA256");m.init(new SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));return HexFormat.of().formatHex(m.doFinal(s.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
  private String hash(String s){return sha(s);} private String sha(String s){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
  private byte[] random(int n){byte[] b=new byte[n];rng.nextBytes(b);return b;} private String norm(String e){return e.trim().toLowerCase(Locale.ROOT);}private String ip(HttpServletRequest r){return r.getRemoteAddr();}
}

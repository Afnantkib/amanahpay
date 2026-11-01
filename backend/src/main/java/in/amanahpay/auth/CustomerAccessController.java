package in.amanahpay.auth;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/customer")
public class CustomerAccessController {
  private final JdbcTemplate db;
  private final OtpMailService mail;
  private final SecureRandom random = new SecureRandom();
  @Value("${amanah.otp-pepper}") private String pepper;
  @Value("${amanah.jwt-secret}") private String jwtSecret;
  @Value("${amanah.jwt-issuer}") private String issuer;
  @Value("${amanah.otp-ttl-minutes}") private int otpMinutes;
  @Value("${amanah.otp-resend-seconds}") private int cooldown;
  @Value("${spring.profiles.active:}") private String activeProfiles;
  public CustomerAccessController(JdbcTemplate db, OtpMailService mail) { this.db=db; this.mail=mail; }

  public record VerifyRequest(@NotBlank String token, @NotBlank String code) {}
  public record PaymentReport(@NotBlank String note) {}

  @PostMapping("/link/{token}/otp/request")
  public Map<String,String> requestOtp(@PathVariable String token, HttpServletRequest request) {
    LinkInfo link=validLink(token);
    if(link.email==null || link.email.isBlank()) throw new ResponseStatusException(HttpStatus.CONFLICT,"Ask the merchant to add your email address");
    String email=link.email.trim().toLowerCase(Locale.ROOT);
    String key=sha(email+":"+link.id);
    Integer recent=db.queryForObject("SELECT COUNT(*) FROM otp_codes WHERE identifier_hash=? AND purpose='CUSTOMER' AND created_at>DATE_SUB(NOW(),INTERVAL ? SECOND)",Integer.class,key,cooldown);
    if(recent==null || recent==0){
      db.update("UPDATE otp_codes SET consumed_at=NOW() WHERE identifier_hash=? AND purpose='CUSTOMER' AND consumed_at IS NULL",key);
      String code=String.format("%06d",random.nextInt(1_000_000));
      db.update("INSERT INTO otp_codes(identifier_hash,channel,purpose,code_hash,expires_at,ip) VALUES(?,'EMAIL','CUSTOMER',?,DATE_ADD(NOW(),INTERVAL ? MINUTE),?)",key,hmac(code),otpMinutes,request.getRemoteAddr());
      mail.send(email,"Your Amanah Pay plan verification code","Use "+code+" to view your payment offer. This code expires in "+otpMinutes+" minutes.");
    }
    return Map.of("message","If this offer is valid, a verification code has been sent.","email",mask(email));
  }

  @PostMapping("/otp/verify")
  public Map<String,Object> verify(@Valid @RequestBody VerifyRequest body,HttpServletRequest request) {
    LinkInfo link=validLink(body.token());String email=Objects.requireNonNullElse(link.email,"").trim().toLowerCase(Locale.ROOT);String key=sha(email+":"+link.id);
    var rows=db.query("SELECT id,code_hash,attempts,expires_at FROM otp_codes WHERE identifier_hash=? AND purpose='CUSTOMER' AND consumed_at IS NULL ORDER BY id DESC LIMIT 1",(r,n)->new Object[]{r.getLong(1),r.getString(2),r.getInt(3),r.getTimestamp(4).toInstant()},key);
    if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid or expired code");Object[] row=rows.getFirst();long otpId=(long)row[0];
    if((int)row[2]>=5||Instant.now().isAfter((Instant)row[3])||!MessageDigest.isEqual(((String)row[1]).getBytes(StandardCharsets.US_ASCII),hmac(body.code()).getBytes(StandardCharsets.US_ASCII))){db.update("UPDATE otp_codes SET attempts=attempts+1,consumed_at=IF(attempts+1>=5,NOW(),consumed_at) WHERE id=?",otpId);audit("customer_otp_failed",email,request);throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid or expired code");}
    db.update("UPDATE otp_codes SET consumed_at=NOW() WHERE id=?",otpId);db.update("UPDATE magic_links SET used_at=NOW() WHERE id=?",link.id);audit("customer_otp_verified",email,request);
    String access=Jwts.builder().issuer(issuer).subject(String.valueOf(link.customerId)).claim("role","CUSTOMER").claim("scope","CUSTOMER_PLAN").claim("planId",link.planId).claim("customerId",link.customerId).id(UUID.randomUUID().toString()).issuedAt(new Date()).expiration(Date.from(Instant.now().plusSeconds(1800))).signWith(Keys.hmacShaKeyFor(Base64.getDecoder().decode(jwtSecret))).compact();
    return Map.of("accessToken",access,"expiresIn",1800,"plan",plan(link.planId));
  }

  @GetMapping("/plan") public Map<String,Object> getPlan(HttpServletRequest request){return plan(authorizedPlan(request));}

  @GetMapping("/account/plans")
  public List<Map<String,Object>> accountPlans(HttpServletRequest request) {
    long accountId = authorizedAccount(request);
    List<Long> ids = db.query("SELECT p.id FROM plans p JOIN customers c ON c.id=p.customer_id WHERE c.customer_account_id=? ORDER BY p.created_at DESC,p.id DESC",
        (r,n) -> r.getLong(1), accountId);
    return ids.stream().map(this::plan).toList();
  }

  @GetMapping("/account/offers/{token}")
  public Map<String,Object> accountOffer(@PathVariable String token,HttpServletRequest request) {
    LinkInfo link=validLink(token);
    authorizedAccountPlan(link.planId,request);
    return plan(link.planId);
  }

  @GetMapping("/account/plans/{planId}/agreement")
  public ResponseEntity<byte[]> accountAgreement(@PathVariable long planId,HttpServletRequest request) {
    authorizedAccountPlan(planId,request);
    Map<String,Object> offer=plan(planId);
    String text=Objects.toString(offer.get("agreement"),agreementText(offer));
    return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN)
        .header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=amanah-plan-agreement.txt")
        .body(text.getBytes(StandardCharsets.UTF_8));
  }

  @PostMapping("/account/plans/{planId}/accept") @Transactional
  public Map<String,Object> acceptAccountPlan(@PathVariable long planId,HttpServletRequest request) {
    long customerId = authorizedAccountPlan(planId,request);
    Map<String,Object> offer = plan(planId);
    if (!"PENDING".equals(offer.get("status"))) throw new ResponseStatusException(HttpStatus.CONFLICT,"Offer is no longer awaiting acceptance");
    String snapshot = agreementText(offer);
    db.update("UPDATE plans SET status='ACTIVE',agreement_snapshot=?,accepted_at=NOW() WHERE id=? AND status='PENDING'",snapshot,planId);
    db.update("INSERT INTO customer_consents(plan_id,customer_id,consent_text,ip,user_agent) VALUES(?,?,?,?,?)",planId,customerId,"I reviewed the fixed total price and schedule and agree to this merchant's offer.",request.getRemoteAddr(),request.getHeader("User-Agent"));
    db.update("INSERT INTO plan_events(plan_id,event_type,detail) VALUES(?,'CUSTOMER_ACCEPTED',JSON_OBJECT('ip',?))",planId,request.getRemoteAddr());
    return Map.of("status","ACTIVE","agreement",snapshot,"plan",plan(planId));
  }

  @PostMapping("/account/plans/{planId}/payment-report")
  public Map<String,String> reportAccountPayment(@PathVariable long planId,@Valid @RequestBody PaymentReport body,HttpServletRequest request) {
    authorizedAccountPlan(planId,request);
    return reportPaymentForPlan(planId,body);
  }

  @PostMapping("/plan/accept") @Transactional
  public Map<String,Object> accept(HttpServletRequest request){long planId=authorizedPlan(request);Map<String,Object> p=plan(planId);if(!"PENDING".equals(p.get("status")))throw new ResponseStatusException(HttpStatus.CONFLICT,"Offer is no longer awaiting acceptance");String snapshot=agreementText(p);Object customerId=request.getAttribute("amanah.customerId");db.update("UPDATE plans SET status='ACTIVE',agreement_snapshot=?,accepted_at=NOW() WHERE id=? AND status='PENDING'",snapshot,planId);db.update("INSERT INTO customer_consents(plan_id,customer_id,consent_text,ip,user_agent) VALUES(?,?,?,?,?)",planId,customerId,"I reviewed the fixed total price and schedule and agree to this merchant's offer.",request.getRemoteAddr(),request.getHeader("User-Agent"));db.update("INSERT INTO plan_events(plan_id,event_type,detail) VALUES(?,'CUSTOMER_ACCEPTED',JSON_OBJECT('ip',?))",planId,request.getRemoteAddr());return Map.of("status","ACTIVE","agreement",snapshot,"plan",plan(planId));}

  @PostMapping("/plan/payment-report")
  public Map<String,String> reportPayment(@Valid @RequestBody PaymentReport body,HttpServletRequest request){long planId=authorizedPlan(request);return reportPaymentForPlan(planId,body);}

  @GetMapping("/plan/agreement")
  public ResponseEntity<byte[]> agreement(HttpServletRequest request){Map<String,Object> p=plan(authorizedPlan(request));String text=Objects.toString(p.get("agreement"),agreementText(p));return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=amanah-plan-agreement.txt").body(text.getBytes(StandardCharsets.UTF_8));}

  private long authorizedPlan(HttpServletRequest request){Object scope=request.getAttribute("amanah.scope"),planId=request.getAttribute("amanah.planId"),customer=request.getAttribute("amanah.customerId");if(!"CUSTOMER_PLAN".equals(scope)||planId==null||customer==null)throw new AccessDeniedException("Customer plan access required");Long valid=db.queryForObject("SELECT COUNT(*) FROM plans WHERE id=? AND customer_id=?",Long.class,Long.valueOf(planId.toString()),Long.valueOf(customer.toString()));if(valid==null||valid==0)throw new AccessDeniedException("Plan scope does not match");return Long.parseLong(planId.toString());}
  private long authorizedAccount(HttpServletRequest request){Object scope=request.getAttribute("amanah.scope"),account=request.getAttribute("amanah.customerAccountId");if(!"CUSTOMER_ACCOUNT".equals(scope)||account==null)throw new AccessDeniedException("Customer account access required");return Long.parseLong(account.toString());}
  private long authorizedAccountPlan(long planId,HttpServletRequest request){long accountId=authorizedAccount(request);List<Long> ids=db.query("SELECT c.id FROM plans p JOIN customers c ON c.id=p.customer_id WHERE p.id=? AND c.customer_account_id=?",(r,n)->r.getLong(1),planId,accountId);if(ids.isEmpty())throw new AccessDeniedException("Plan does not belong to this customer account");return ids.getFirst();}
  private Map<String,String> reportPaymentForPlan(long planId,PaymentReport body){var next=db.query("SELECT id,amount_paise FROM installments WHERE plan_id=? AND status IN ('UPCOMING','DUE','OVERDUE') ORDER BY due_date,id LIMIT 1",(r,n)->new long[]{r.getLong(1),r.getLong(2)},planId);if(next.isEmpty())throw new ResponseStatusException(HttpStatus.CONFLICT,"No unpaid installment found");long[] due=next.getFirst();db.update("INSERT INTO payments(plan_id,installment_id,amount_paise,status,reference,payment_method) VALUES(?,?,?,'REPORTED',?,'UPI')",planId,due[0],due[1],body.note().substring(0,Math.min(110,body.note().length())));db.update("UPDATE installments SET status='DUE' WHERE id=?",due[0]);db.update("INSERT INTO plan_events(plan_id,event_type,detail) VALUES(?,'PAYMENT_SELF_REPORTED',JSON_OBJECT('note',?,'installmentId',?))",planId,body.note(),due[0]);return Map.of("status","REPORTED","message","Thanks. Your merchant will confirm the payment.");}
  private Map<String,Object> plan(long planId){Map<String,Object> p=db.queryForMap("SELECT p.id,p.customer_id,p.status,p.item_name,p.total_amount_paise,p.down_payment_paise,p.installment_count,p.agreement_snapshot,m.business_name,m.upi_id FROM plans p JOIN merchants m ON m.id=p.merchant_id WHERE p.id=?",planId);List<Map<String,Object>> rows=db.queryForList("SELECT id,amount_paise,status,DATE_FORMAT(due_date,'%Y-%m-%d') dueDate FROM installments WHERE plan_id=? ORDER BY due_date,id",planId);String upi=Objects.toString(p.get("upi_id"),"");long duePaise=rows.stream().filter(r->!"PAID".equals(r.get("status"))).findFirst().map(r->((Number)r.get("amount_paise")).longValue()).orElse(0L);String payLink=upi.isBlank()||duePaise==0?"":"upi://pay?pa="+enc(upi)+"&pn="+enc(Objects.toString(p.get("business_name"),"Merchant"))+"&am="+String.format(Locale.ROOT,"%.2f",duePaise/100.0)+"&cu=INR&tn="+enc("Amanah installment for plan "+planId);Map<String,Object> result=new HashMap<>();result.put("id",p.get("id"));result.put("status",p.get("status"));result.put("itemName",p.get("item_name"));result.put("merchantName",p.get("business_name"));result.put("upiId",upi);result.put("nextDuePaise",duePaise);result.put("totalPricePaise",p.get("total_amount_paise"));result.put("downPaymentPaise",p.get("down_payment_paise"));result.put("installmentCount",p.get("installment_count"));result.put("installments",rows);result.put("upiLink",payLink);result.put("agreement",p.get("agreement_snapshot"));return result;}
  private LinkInfo validLink(String raw){var rows=db.query("SELECT ml.id,ml.plan_id,ml.customer_id,c.email FROM magic_links ml JOIN customers c ON c.id=ml.customer_id WHERE ml.token_hash=? AND ml.revoked_at IS NULL AND ml.expires_at>NOW()",(r,n)->new LinkInfo(r.getLong(1),r.getLong(2),r.getLong(3),r.getString(4)),sha(raw));if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Offer link is invalid or expired");return rows.getFirst();}
  private record LinkInfo(long id,long planId,long customerId,String email){}
  private String agreementText(Map<String,Object> p){return "Amanah Pay — Merchant sale offer\nMerchant: "+p.get("merchantName")+"\nItem: "+p.get("itemName")+"\nFixed total price (paise): "+p.get("totalPricePaise")+"\nDown payment (paise): "+p.get("downPaymentPaise")+"\nInstallments: "+p.get("installmentCount")+"\nSchedule: "+p.get("installments")+"\nAccepted by customer at: "+Instant.now()+"\n";}
  private String hmac(String code){try{Mac m=Mac.getInstance("HmacSHA256");m.init(new SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));return HexFormat.of().formatHex(m.doFinal(code.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
  private String sha(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
  private String enc(String value){return java.net.URLEncoder.encode(value,StandardCharsets.UTF_8);}
  private String mask(String email){int at=email.indexOf('@');return at<1?"***":email.substring(0,1)+"***"+email.substring(at);}
  private void audit(String event,String email,HttpServletRequest req){db.update("INSERT INTO audit_logs(event_type,email_masked,ip,user_agent) VALUES(?,?,?,?)",event,mask(email),req.getRemoteAddr(),req.getHeader("User-Agent"));}
}

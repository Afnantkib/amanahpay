package in.amanahpay.auth;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/api/v1/customer/auth")
public class CustomerAccountController {
  private static final String SIGNUP_PURPOSE = "CUSTOMER_SIGNUP";
  private final JdbcTemplate db;
  private final OtpMailService mail;
  private final PasswordEncoder passwords;
  private final String dummyPasswordHash;
  @Value("${amanah.otp-pepper}") private String pepper;
  @Value("${amanah.jwt-secret}") private String jwtSecret;
  @Value("${amanah.jwt-issuer}") private String issuer;
  @Value("${amanah.otp-ttl-minutes}") private int otpMinutes;
  @Value("${amanah.otp-resend-seconds}") private int cooldown;

  public CustomerAccountController(JdbcTemplate db, OtpMailService mail, PasswordEncoder passwords) {
    this.db = db;
    this.mail = mail;
    this.passwords = passwords;
    this.dummyPasswordHash = passwords.encode(UUID.randomUUID().toString());
  }

  public record SignupRequest(@NotBlank @Size(max = 180) String fullName,
                              @Email @NotBlank @Size(max = 254) String email,
                              @NotBlank @Size(min = 12, max = 64) String password) {}
  public record VerifySignupRequest(@Email @NotBlank String email, @NotBlank @Size(min = 6, max = 6) String code) {}
  public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}

  @PostMapping("/signup/request")
  @Transactional
  public Map<String, Object> requestSignup(@Valid @RequestBody SignupRequest body, HttpServletRequest request) {
    String email = norm(body.email());
    validatePasswordBytes(body.password());
    List<Map<String, Object>> existing = db.queryForList("SELECT id,email_verified_at FROM customer_accounts WHERE email=?", email);
    if (!existing.isEmpty() && existing.getFirst().get("email_verified_at") != null) {
      Map<String, Object> account = db.queryForMap("SELECT id,full_name,email,password_hash FROM customer_accounts WHERE email=?", email);
      if (passwords.matches(body.password(), account.get("password_hash").toString())) {
        audit("customer_signup_existing_account_login", email, request);
        return session(((Number) account.get("id")).longValue(), account.get("full_name").toString(), email);
      }
      throw new ResponseStatusException(HttpStatus.CONFLICT, "An account already exists for this email. Log in with your password.");
    }
    String passwordHash = passwords.encode(body.password());
    if (existing.isEmpty()) {
      db.update("INSERT INTO customer_accounts(full_name,email,password_hash) VALUES(?,?,?)", body.fullName().trim(), email, passwordHash);
    } else {
      db.update("UPDATE customer_accounts SET full_name=?,password_hash=? WHERE email=? AND email_verified_at IS NULL", body.fullName().trim(), passwordHash, email);
    }

    String key = sha(email);
    Integer recent = db.queryForObject("SELECT COUNT(*) FROM otp_codes WHERE identifier_hash=? AND purpose=? AND created_at>DATE_SUB(NOW(),INTERVAL ? SECOND)", Integer.class, key, SIGNUP_PURPOSE, cooldown);
    if (recent == null || recent == 0) {
      db.update("UPDATE otp_codes SET consumed_at=NOW() WHERE identifier_hash=? AND purpose=? AND consumed_at IS NULL", key, SIGNUP_PURPOSE);
      String code = String.format(Locale.ROOT, "%06d", ThreadLocalRandom.current().nextInt(1_000_000));
      db.update("INSERT INTO otp_codes(identifier_hash,channel,purpose,code_hash,expires_at,ip) VALUES(?,'EMAIL',?,?,DATE_ADD(NOW(),INTERVAL ? MINUTE),?)", key, SIGNUP_PURPOSE, hmac(code), otpMinutes, request.getRemoteAddr());
      mail.send(email, "Verify your Amanah Pay customer account", "Your verification code is " + code + ". It expires in " + otpMinutes + " minutes.");
    }
    audit("customer_signup_requested", email, request);
    return Map.of("message", "If this address can be registered, a verification code has been sent.", "email", mask(email));
  }

  @PostMapping("/signup/verify")
  @Transactional
  public Map<String, Object> verifySignup(@Valid @RequestBody VerifySignupRequest body, HttpServletRequest request) {
    String email = norm(body.email());
    String key = sha(email);
    List<Object[]> rows = db.query("SELECT id,code_hash,attempts,expires_at FROM otp_codes WHERE identifier_hash=? AND purpose=? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1",
        (r, n) -> new Object[]{r.getLong(1), r.getString(2), r.getInt(3), r.getTimestamp(4).toInstant()}, key, SIGNUP_PURPOSE);
    if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired code");
    Object[] otp = rows.getFirst();
    boolean matches = MessageDigest.isEqual(((String) otp[1]).getBytes(StandardCharsets.US_ASCII), hmac(body.code()).getBytes(StandardCharsets.US_ASCII));
    if ((int) otp[2] >= 5 || Instant.now().isAfter((Instant) otp[3]) || !matches) {
      db.update("UPDATE otp_codes SET attempts=attempts+1,consumed_at=IF(attempts+1>=5,NOW(),consumed_at) WHERE id=?", otp[0]);
      audit("customer_signup_otp_failed", email, request);
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired code");
    }
    db.update("UPDATE otp_codes SET consumed_at=NOW() WHERE id=?", otp[0]);
    List<Map<String, Object>> accounts = db.queryForList("SELECT id,full_name,email FROM customer_accounts WHERE email=? AND email_verified_at IS NULL", email);
    if (accounts.isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Signup session expired. Please start again.");
    Map<String, Object> account = accounts.getFirst();
    long accountId = ((Number) account.get("id")).longValue();
    db.update("UPDATE customer_accounts SET email_verified_at=NOW() WHERE id=?", accountId);
    db.update("UPDATE customers SET customer_account_id=? WHERE LOWER(TRIM(email))=? AND customer_account_id IS NULL", accountId, email);
    audit("customer_signup_verified", email, request);
    return session(accountId, account.get("full_name").toString(), email);
  }

  @PostMapping("/login")
  public Map<String, Object> login(@Valid @RequestBody LoginRequest body, HttpServletRequest request) {
    String email = norm(body.email());
    String emailHash = sha(email);
    Integer emailFails = db.queryForObject("SELECT COUNT(*) FROM login_attempts WHERE identifier_hash=? AND success=FALSE AND created_at>DATE_SUB(NOW(),INTERVAL 30 MINUTE)", Integer.class, emailHash);
    Integer ipFails = db.queryForObject("SELECT COUNT(*) FROM login_attempts WHERE ip=? AND success=FALSE AND created_at>DATE_SUB(NOW(),INTERVAL 30 MINUTE)", Integer.class, request.getRemoteAddr());
    if ((emailFails != null && emailFails >= 10) || (ipFails != null && ipFails >= 30)) {
      audit("customer_login_rate_limited", email, request);
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Please try again later.");
    }
    List<Map<String, Object>> accounts = db.queryForList("SELECT id,full_name,email,password_hash,email_verified_at FROM customer_accounts WHERE email=?", email);
    Map<String, Object> account = accounts.isEmpty() ? null : accounts.getFirst();
    String encoded = account == null ? dummyPasswordHash : account.get("password_hash").toString();
    boolean passwordMatches = passwords.matches(body.password(), encoded);
    if (account == null || account.get("email_verified_at") == null || !passwordMatches) {
      db.update("INSERT INTO login_attempts(identifier_hash,ip,success) VALUES(?,?,FALSE)", emailHash, request.getRemoteAddr());
      audit("customer_login_failed", email, request);
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect.");
    }
    db.update("INSERT INTO login_attempts(identifier_hash,ip,success) VALUES(?,?,TRUE)", emailHash, request.getRemoteAddr());
    audit("customer_login", email, request);
    return session(((Number) account.get("id")).longValue(), account.get("full_name").toString(), email);
  }

  private Map<String, Object> session(long accountId, String fullName, String email) {
    String token = Jwts.builder().issuer(issuer).subject(String.valueOf(accountId))
        .claim("role", "CUSTOMER").claim("scope", "CUSTOMER_ACCOUNT")
        .claim("customerAccountId", accountId).id(UUID.randomUUID().toString())
        .issuedAt(new Date()).expiration(Date.from(Instant.now().plusSeconds(3600)))
        .signWith(Keys.hmacShaKeyFor(Base64.getDecoder().decode(jwtSecret))).compact();
    return Map.of("accessToken", token, "expiresIn", 3600, "account", Map.of("id", accountId, "fullName", fullName, "email", email));
  }

  private void validatePasswordBytes(String password) {
    if (password.getBytes(StandardCharsets.UTF_8).length > 72) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be 72 bytes or fewer.");
  }
  private String norm(String email) { return email.trim().toLowerCase(Locale.ROOT); }
  private String mask(String email) { int at = email.indexOf('@'); return at < 1 ? "***" : email.substring(0, 1) + "***" + email.substring(at); }
  private void audit(String event, String email, HttpServletRequest request) {
    db.update("INSERT INTO audit_logs(event_type,email_masked,ip,user_agent) VALUES(?,?,?,?)", event, mask(email), request.getRemoteAddr(), request.getHeader("User-Agent"));
  }
  private String hmac(String value) {
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) { throw new IllegalStateException(e); }
  }
  private String sha(String value) {
    try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
    catch (Exception e) { throw new IllegalStateException(e); }
  }
}

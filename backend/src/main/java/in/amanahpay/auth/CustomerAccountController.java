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
import java.security.SecureRandom;

@RestController
@RequestMapping("/api/v1/customer/auth")
public class CustomerAccountController {
  private static final String SIGNUP_PURPOSE = "CUSTOMER_SIGNUP";
  private static final String LOGIN_PURPOSE = "CUSTOMER_LOGIN";
  private final JdbcTemplate db;
  private final OtpMailService mail;
  private final SecureRandom random = new SecureRandom();
  @Value("${amanah.otp-pepper}") private String pepper;
  @Value("${amanah.jwt-secret}") private String jwtSecret;
  @Value("${amanah.jwt-issuer}") private String issuer;
  @Value("${amanah.otp-ttl-minutes}") private int otpMinutes;
  @Value("${amanah.otp-resend-seconds}") private int cooldown;

  public CustomerAccountController(JdbcTemplate db, OtpMailService mail) {
    this.db = db;
    this.mail = mail;
  }

  public record SignupRequest(@NotBlank @Size(max = 180) String fullName,
                              @Email @NotBlank @Size(max = 254) String email) {}
  public record VerifySignupRequest(@Email @NotBlank String email, @NotBlank @Size(min = 6, max = 6) String code) {}
  public record VerifyLoginRequest(@Email @NotBlank String email,
                                   @NotBlank @Size(min = 6, max = 6) String code,
                                   @Size(max = 180) String fullName) {}
  public record EmailRequest(@Email @NotBlank @Size(max = 254) String email) {}

  @PostMapping("/signup/request")
  @Transactional
  public Map<String, Object> requestSignup(@Valid @RequestBody SignupRequest body, HttpServletRequest request) {
    String email = norm(body.email());
    rateLimit(email, request);
    List<Map<String, Object>> existing = db.queryForList("SELECT id,email_verified_at FROM customer_accounts WHERE email=?", email);
    if (!existing.isEmpty() && existing.getFirst().get("email_verified_at") != null) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "An account already exists. Choose log in to receive a sign-in code.");
    }
    // The legacy schema keeps password_hash NOT NULL; this random value is never shown or used for login.
    String passwordHash = sha(UUID.randomUUID() + UUID.randomUUID().toString());
    if (existing.isEmpty()) {
      db.update("INSERT INTO customer_accounts(full_name,email,password_hash) VALUES(?,?,?)", body.fullName().trim(), email, passwordHash);
    } else {
      db.update("UPDATE customer_accounts SET full_name=?,password_hash=? WHERE email=? AND email_verified_at IS NULL", body.fullName().trim(), passwordHash, email);
    }
    sendOtp(email, SIGNUP_PURPOSE, "Verify your Amanah Pay customer account", request);
    audit("customer_signup_requested", email, request);
    return Map.of("message", "If this address can be registered, a verification code has been sent.", "email", mask(email));
  }

  @PostMapping("/login/request")
  public Map<String, Object> requestLogin(@Valid @RequestBody EmailRequest body, HttpServletRequest request) {
    String email = norm(body.email());
    rateLimit(email, request);
    sendOtp(email, LOGIN_PURPOSE, "Your Amanah Pay customer sign-in code", request);
    audit("customer_login_otp_requested", email, request);
    return Map.of("message", "If this address can receive email, a sign-in code will arrive shortly.", "email", mask(email));
  }

  @PostMapping("/signup/verify")
  @Transactional(noRollbackFor = ResponseStatusException.class)
  public Map<String, Object> verifySignup(@Valid @RequestBody VerifySignupRequest body, HttpServletRequest request) {
    String email = norm(body.email());
    String key = sha(email);
    verifyOtp(email, body.code(), SIGNUP_PURPOSE, request);
    db.update("UPDATE otp_codes SET consumed_at=NOW() WHERE identifier_hash=? AND purpose=? AND consumed_at IS NULL", key, SIGNUP_PURPOSE);
    List<Map<String, Object>> accounts = db.queryForList("SELECT id,full_name,email FROM customer_accounts WHERE email=? AND email_verified_at IS NULL", email);
    if (accounts.isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Signup session expired. Please start again.");
    Map<String, Object> account = accounts.getFirst();
    long accountId = ((Number) account.get("id")).longValue();
    db.update("UPDATE customer_accounts SET email_verified_at=NOW() WHERE id=?", accountId);
    db.update("UPDATE customers SET customer_account_id=? WHERE LOWER(TRIM(email))=? AND customer_account_id IS NULL", accountId, email);
    audit("customer_signup_verified", email, request);
    return session(accountId, account.get("full_name").toString(), email);
  }

  @PostMapping("/login/verify")
  @Transactional(noRollbackFor = ResponseStatusException.class)
  public Map<String, Object> verifyLogin(@Valid @RequestBody VerifyLoginRequest body, HttpServletRequest request) {
    String email = norm(body.email());
    String emailHash = sha(email);
    Integer failures = db.queryForObject("SELECT COUNT(*) FROM login_attempts WHERE identifier_hash=? AND success=FALSE AND created_at>DATE_SUB(NOW(),INTERVAL 30 MINUTE)", Integer.class, emailHash);
    Integer ipFailures = db.queryForObject("SELECT COUNT(*) FROM login_attempts WHERE ip=? AND success=FALSE AND created_at>DATE_SUB(NOW(),INTERVAL 30 MINUTE)", Integer.class, request.getRemoteAddr());
    if ((failures != null && failures >= 10) || (ipFailures != null && ipFailures >= 30)) {
      audit("customer_login_rate_limited", email, request);
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Please try again later.");
    }
    verifyOtp(email, body.code(), LOGIN_PURPOSE, request);
    List<Map<String, Object>> accounts = db.queryForList("SELECT id,full_name,email,email_verified_at FROM customer_accounts WHERE email=?", email);
    Map<String, Object> account;
    if (accounts.isEmpty()) {
      if (body.fullName() == null || body.fullName().isBlank())
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Enter your full name to finish creating your customer account.");
      String fullName = body.fullName().trim();
      String passwordHash = sha(UUID.randomUUID() + UUID.randomUUID().toString());
      db.update("INSERT INTO customer_accounts(full_name,email,password_hash,email_verified_at) VALUES(?,?,?,NOW())", fullName, email, passwordHash);
      Long accountId = db.queryForObject("SELECT id FROM customer_accounts WHERE email=?", Long.class, email);
      db.update("UPDATE customers SET customer_account_id=? WHERE LOWER(TRIM(email))=? AND customer_account_id IS NULL", accountId, email);
      account = Map.of("id", accountId, "full_name", fullName, "email", email);
      audit("customer_account_created_by_email_otp", email, request);
    } else {
      account = accounts.getFirst();
      if (account.get("email_verified_at") == null) {
        db.update("UPDATE customer_accounts SET email_verified_at=NOW() WHERE id=?", account.get("id"));
        db.update("UPDATE customers SET customer_account_id=? WHERE LOWER(TRIM(email))=? AND customer_account_id IS NULL", account.get("id"), email);
      }
    }
    db.update("UPDATE otp_codes SET consumed_at=NOW() WHERE identifier_hash=? AND purpose=? AND consumed_at IS NULL", emailHash, LOGIN_PURPOSE);
    audit("customer_login", email, request);
    return session(((Number) account.get("id")).longValue(), account.get("full_name").toString(), email);
  }

  /* Password login intentionally removed; old clients must use email OTP. */
  private void verifyOtp(String email, String code, String purpose, HttpServletRequest request) {
    String key = sha(email);
    List<Object[]> rows = db.query("SELECT id,code_hash,attempts,expires_at FROM otp_codes WHERE identifier_hash=? AND purpose=? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1",
        (r, n) -> new Object[]{r.getLong(1), r.getString(2), r.getInt(3), r.getTimestamp(4).toInstant()}, key, purpose);
    if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired code");
    Object[] otp = rows.getFirst();
    boolean matches = MessageDigest.isEqual(((String) otp[1]).getBytes(StandardCharsets.US_ASCII), hmac(code).getBytes(StandardCharsets.US_ASCII));
    if ((int) otp[2] >= 5 || Instant.now().isAfter((Instant) otp[3]) || !matches) {
      db.update("UPDATE otp_codes SET attempts=attempts+1,consumed_at=IF(attempts+1>=5,NOW(),consumed_at) WHERE id=?", otp[0]);
      db.update("INSERT INTO login_attempts(identifier_hash,ip,success) VALUES(?,?,FALSE)", key, request.getRemoteAddr());
      audit("customer_otp_failed", email, request);
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired code");
    }
    db.update("INSERT INTO login_attempts(identifier_hash,ip,success) VALUES(?,?,TRUE)", key, request.getRemoteAddr());
  }

  private void sendOtp(String email, String purpose, String subject, HttpServletRequest request) {
    String key = sha(email);
    Integer recent = db.queryForObject("SELECT COUNT(*) FROM otp_codes WHERE identifier_hash=? AND purpose=? AND created_at>DATE_SUB(NOW(),INTERVAL ? SECOND)", Integer.class, key, purpose, cooldown);
    if (recent != null && recent > 0) return;
    db.update("UPDATE otp_codes SET consumed_at=NOW() WHERE identifier_hash=? AND purpose=? AND consumed_at IS NULL", key, purpose);
    String code = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
    db.update("INSERT INTO otp_codes(identifier_hash,channel,purpose,code_hash,expires_at,ip) VALUES(?,'EMAIL',?,?,DATE_ADD(NOW(),INTERVAL ? MINUTE),?)", key, purpose, hmac(code), otpMinutes, request.getRemoteAddr());
    try {
      mail.send(email, subject, "Your verification code is " + code + ". It expires in " + otpMinutes + " minutes.");
    } catch (RuntimeException failure) {
      db.update("DELETE FROM otp_codes WHERE identifier_hash=? AND purpose=? AND code_hash=?", key, purpose, hmac(code));
      throw failure;
    }
  }

  private void rateLimit(String email, HttpServletRequest request) {
    String key = sha(email);
    // Count issued OTPs, not login_attempts: SMTP failures are removed from
    // otp_codes and must not consume a customer's hourly send allowance.
    Integer emailRequests = db.queryForObject("SELECT COUNT(*) FROM otp_codes WHERE identifier_hash=? AND created_at>DATE_SUB(NOW(),INTERVAL 1 HOUR)", Integer.class, key);
    Integer ipRequests = db.queryForObject("SELECT COUNT(*) FROM otp_codes WHERE ip=? AND created_at>DATE_SUB(NOW(),INTERVAL 1 HOUR)", Integer.class, request.getRemoteAddr());
    if ((emailRequests != null && emailRequests >= 5) || (ipRequests != null && ipRequests >= 20))
      throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many code requests. Please try again later.");
  }

  private Map<String, Object> session(long accountId, String fullName, String email) {
    String token = Jwts.builder().issuer(issuer).subject(String.valueOf(accountId))
        .claim("role", "CUSTOMER").claim("scope", "CUSTOMER_ACCOUNT")
        .claim("customerAccountId", accountId).id(UUID.randomUUID().toString())
        .issuedAt(new Date()).expiration(Date.from(Instant.now().plusSeconds(3600)))
        .signWith(Keys.hmacShaKeyFor(Base64.getDecoder().decode(jwtSecret))).compact();
    return Map.of("accessToken", token, "expiresIn", 3600, "account", Map.of("id", accountId, "fullName", fullName, "email", email));
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

package in.amanahpay.plan;

import in.amanahpay.common.Money;
import in.amanahpay.schedule.InstallmentSchedule;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.sql.PreparedStatement;
import java.time.LocalDate;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/plans")
public class PlanController {
  private final JdbcTemplate db;
  @Value("${amanah.app-base-url}") private String appUrl;
  public PlanController(JdbcTemplate db) { this.db = db; }

  public record CreateOffer(@NotBlank @Size(max=180) String customerName,
                            @Email @NotBlank String customerEmail,
                            @Size(max=32) String phone,
                            @NotBlank @Size(max=180) String itemName,
                            @Positive long totalPricePaise,
                            @PositiveOrZero long downPaymentPaise,
                            @Min(2) @Max(24) int installmentCount,
                            @NotNull LocalDate firstDueDate) {}

  @PostMapping @Transactional
  public Map<String,Object> create(@Valid @RequestBody CreateOffer req, HttpServletRequest http) {
    long userId = userId(http);
    Long merchantId = db.queryForObject("SELECT merchant_id FROM users WHERE id=? AND status='ACTIVE'", Long.class, userId);
    if (merchantId == null) throw new AccessDeniedException("Merchant role required");
    if (req.downPaymentPaise() >= req.totalPricePaise()) throw new IllegalArgumentException("Down payment must be less than total price");
    Money total = Money.inr(req.totalPricePaise());
    Money down = Money.inr(req.downPaymentPaise());
    var schedule = InstallmentSchedule.create(total, down, req.installmentCount(), req.firstDueDate(), InstallmentSchedule.Frequency.MONTHLY);
    String customerEmail = req.customerEmail().trim().toLowerCase(Locale.ROOT);
    List<Map<String, Object>> customerAccounts = db.queryForList("SELECT id FROM customer_accounts WHERE email=?", customerEmail);
    Long customerAccountId = customerAccounts.isEmpty() ? null : ((Number) customerAccounts.getFirst().get("id")).longValue();
    KeyHolder customerKey = new GeneratedKeyHolder();
    db.update(c -> {PreparedStatement ps=c.prepareStatement("INSERT INTO customers(merchant_id,full_name,email,phone,customer_account_id) VALUES(?,?,?,?,?)", new String[]{"id"});ps.setLong(1,merchantId);ps.setString(2,req.customerName().trim());ps.setString(3,customerEmail);ps.setString(4,req.phone());if(customerAccountId==null)ps.setNull(5,java.sql.Types.BIGINT);else ps.setLong(5,customerAccountId);return ps;},customerKey);
    long customerId = Objects.requireNonNull(customerKey.getKey()).longValue();
    KeyHolder planKey = new GeneratedKeyHolder();
    db.update(c -> {PreparedStatement ps=c.prepareStatement("INSERT INTO plans(merchant_id,customer_id,status,total_amount_paise,item_name,down_payment_paise,installment_count,first_due_date) VALUES(?,?,'PENDING',?,?,?,?,?)",new String[]{"id"});ps.setLong(1,merchantId);ps.setLong(2,customerId);ps.setLong(3,req.totalPricePaise());ps.setString(4,req.itemName().trim());ps.setLong(5,req.downPaymentPaise());ps.setInt(6,req.installmentCount());ps.setDate(7,java.sql.Date.valueOf(req.firstDueDate()));return ps;},planKey);
    long planId=Objects.requireNonNull(planKey.getKey()).longValue();
    for (var row:schedule.installments()) db.update("INSERT INTO installments(plan_id,merchant_id,status,amount_paise,due_date) VALUES(?,?,'UPCOMING',?,?)",planId,merchantId,row.amount().minorUnits(),java.sql.Date.valueOf(row.dueDate()));
    byte[] secret=new byte[32];new java.security.SecureRandom().nextBytes(secret);String raw=Base64.getUrlEncoder().withoutPadding().encodeToString(secret);
    db.update("INSERT INTO magic_links(plan_id,customer_id,token_hash,expires_at) VALUES(?,?,?,DATE_ADD(NOW(),INTERVAL 7 DAY))",planId,customerId,sha(raw));
    String base=appUrl.replaceAll("/$","");
    return Map.of("id",planId,"customerId",customerId,"itemName",req.itemName(),"totalPricePaise",req.totalPricePaise(),"downPaymentPaise",req.downPaymentPaise(),"installmentCount",req.installmentCount(),"firstDueDate",req.firstDueDate().toString(),"shareUrl",base+"/en/customer/"+raw,"expiresAt",Instant.now().plusSeconds(7*86400L).toString());
  }
  private long userId(HttpServletRequest req){Object id=req.getAttribute("amanah.userId");if(id==null)throw new AccessDeniedException("Login required");return Long.parseLong(id.toString());}
  private String sha(String value){try{return HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
}

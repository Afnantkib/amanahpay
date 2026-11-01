package in.amanahpay.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/merchant/settings")
public class MerchantSettingsController {
  private final JdbcTemplate db;

  public MerchantSettingsController(JdbcTemplate db) {
    this.db = db;
  }

  public record Settings(
      @NotBlank @Size(max = 180) String businessName,
      @Size(max = 128) String upiId,
      @Size(max = 32) String contactPhone,
      Integer remindDaysBefore,
      String acceptedPaymentMethods,
      String defaultLanguage
  ) {}

  @GetMapping
  public Map<String, Object> get(HttpServletRequest r) {
    long merchant = merchantId(r);
    return db.queryForMap(
        "SELECT business_name businessName, COALESCE(upi_id, '') upiId, COALESCE(contact_phone, '') contactPhone, " +
        "COALESCE(remind_days_before, 3) remindDaysBefore, " +
        "COALESCE(accepted_payment_methods, 'UPI,BANK_TRANSFER,CASH') acceptedPaymentMethods, " +
        "COALESCE(default_language, 'en') defaultLanguage FROM merchants WHERE id=?",
        merchant
    );
  }

  @PutMapping
  public Map<String, Object> save(@Valid @RequestBody Settings body, HttpServletRequest r) {
    long merchant = merchantId(r);
    String upi = Objects.toString(body.upiId(), "").trim();
    if (!upi.isEmpty() && !upi.matches("^[A-Za-z0-9._-]{2,80}@[A-Za-z0-9.-]{2,64}$")) {
      throw new IllegalArgumentException("Enter a valid UPI ID");
    }
    int remindDays = body.remindDaysBefore() != null ? Math.max(0, Math.min(30, body.remindDaysBefore())) : 3;
    String methods = body.acceptedPaymentMethods() != null && !body.acceptedPaymentMethods().isBlank()
        ? body.acceptedPaymentMethods().trim()
        : "UPI,BANK_TRANSFER,CASH";
    String lang = "ur".equalsIgnoreCase(body.defaultLanguage()) ? "ur" : "en";

    db.update(
        "UPDATE merchants SET business_name=?, upi_id=?, contact_phone=?, remind_days_before=?, accepted_payment_methods=?, default_language=? WHERE id=?",
        body.businessName().trim(),
        upi.isEmpty() ? null : upi,
        Objects.toString(body.contactPhone(), "").trim(),
        remindDays,
        methods,
        lang,
        merchant
    );
    return get(r);
  }

  private long merchantId(HttpServletRequest r) {
    Object id = r.getAttribute("amanah.userId");
    if (id == null) throw new AccessDeniedException("Login required");
    Long merchant = db.queryForObject(
        "SELECT merchant_id FROM users WHERE id=? AND status='ACTIVE'",
        Long.class,
        Long.parseLong(id.toString())
    );
    if (merchant == null) throw new AccessDeniedException("Merchant account required");
    return merchant;
  }
}

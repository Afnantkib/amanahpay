package in.amanahpay.payment;

import in.amanahpay.auth.OtpMailService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.sql.PreparedStatement;
import java.util.*;

@RestController
@RequestMapping("/api/v1")
public class PaymentController {
  private final JdbcTemplate db;
  private final OtpMailService mailService;

  public PaymentController(JdbcTemplate db, OtpMailService mailService) {
    this.db = db;
    this.mailService = mailService;
  }

  public record MarkPaidRequest(
      @NotNull @Positive Long amountPaise,
      String paymentMethod,
      String reference,
      String notes
  ) {}

  public record CreateCustomerRequest(
      @NotBlank @Size(max = 180) String fullName,
      @Email String email,
      @Size(max = 32) String phone
  ) {}

  @PostMapping("/plans/{planId}/installments/{installmentId}/pay")
  @Transactional
  public Map<String, Object> markInstallmentPaid(
      @PathVariable long planId,
      @PathVariable long installmentId,
      @Valid @RequestBody MarkPaidRequest req,
      HttpServletRequest http
  ) {
    long userId = userId(http);
    long merchantId = merchantId(userId);

    // Verify installment and plan belong to merchant
    List<Map<String, Object>> rows = db.queryForList(
        "SELECT i.id, i.amount_paise, i.status, p.id plan_id FROM installments i " +
        "JOIN plans p ON p.id = i.plan_id " +
        "WHERE i.id = ? AND p.id = ? AND p.merchant_id = ?",
        installmentId, planId, merchantId
    );
    if (rows.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Installment or plan not found");
    }

    String method = req.paymentMethod() != null && !req.paymentMethod().isBlank()
        ? req.paymentMethod().trim().toUpperCase(Locale.ROOT)
        : "UPI";
    String ref = req.reference() != null ? req.reference().trim() : "";
    if (ref.length() > 120) ref = ref.substring(0, 120);

    // Update installment
    db.update("UPDATE installments SET status = 'PAID', paid_at = NOW() WHERE id = ?", installmentId);

    // Insert into payments
    KeyHolder keyHolder = new GeneratedKeyHolder();
    String finalRef = ref;
    db.update(con -> {
      PreparedStatement ps = con.prepareStatement(
          "INSERT INTO payments(plan_id, installment_id, amount_paise, status, reference, payment_method, confirmed_at, confirmed_by) " +
          "VALUES(?, ?, ?, 'PAID', ?, ?, NOW(), ?)",
          new String[]{"id"}
      );
      ps.setLong(1, planId);
      ps.setLong(2, installmentId);
      ps.setLong(3, req.amountPaise());
      ps.setString(4, finalRef);
      ps.setString(5, method);
      ps.setLong(6, userId);
      return ps;
    }, keyHolder);

    long paymentId = Objects.requireNonNull(keyHolder.getKey()).longValue();

    // Check if all installments for this plan are now paid
    Integer unpaidCount = db.queryForObject(
        "SELECT COUNT(*) FROM installments WHERE plan_id = ? AND status != 'PAID'",
        Integer.class,
        planId
    );
    String planStatus = "ACTIVE";
    if (unpaidCount != null && unpaidCount == 0) {
      planStatus = "COMPLETED";
      db.update("UPDATE plans SET status = 'COMPLETED' WHERE id = ?", planId);
      db.update("INSERT INTO plan_events(plan_id, event_type, detail) VALUES(?, 'PLAN_COMPLETED', JSON_OBJECT('reason', 'All installments settled'))", planId);
    }

    db.update(
        "INSERT INTO plan_events(plan_id, event_type, detail) VALUES(?, 'PAYMENT_CONFIRMED', JSON_OBJECT('installmentId', ?, 'amountPaise', ?, 'reference', ?, 'method', ?, 'paymentId', ?))",
        planId, installmentId, req.amountPaise(), finalRef, method, paymentId
    );

    return Map.of(
        "success", true,
        "paymentId", paymentId,
        "installmentId", installmentId,
        "planId", planId,
        "planStatus", planStatus,
        "message", "Payment marked as received"
    );
  }

  @PostMapping("/payments/{paymentId}/confirm")
  @Transactional
  public Map<String, Object> confirmReportedPayment(
      @PathVariable long paymentId,
      HttpServletRequest http
  ) {
    long userId = userId(http);
    long merchantId = merchantId(userId);

    List<Map<String, Object>> payments = db.queryForList(
        "SELECT p.id, p.plan_id, p.installment_id, p.amount_paise, p.status, p.reference " +
        "FROM payments p " +
        "JOIN plans pl ON pl.id = p.plan_id " +
        "WHERE p.id = ? AND pl.merchant_id = ?",
        paymentId, merchantId
    );
    if (payments.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment record not found");
    }

    Map<String, Object> p = payments.getFirst();
    long planId = ((Number) p.get("plan_id")).longValue();
    Long installmentId = p.get("installment_id") != null ? ((Number) p.get("installment_id")).longValue() : null;

    if (!"PAID".equals(p.get("status"))) {
      if (installmentId == null) {
        List<Long> unpaid = db.query(
            "SELECT id FROM installments WHERE plan_id = ? AND status != 'PAID' ORDER BY due_date, id LIMIT 1",
            (r, n) -> r.getLong(1),
            planId
        );
        if (!unpaid.isEmpty()) {
          installmentId = unpaid.getFirst();
        }
      }

      if (installmentId != null) {
        db.update("UPDATE installments SET status = 'PAID', paid_at = NOW() WHERE id = ?", installmentId);
      }

      db.update(
          "UPDATE payments SET status = 'PAID', installment_id = ?, confirmed_at = NOW(), confirmed_by = ? WHERE id = ?",
          installmentId, userId, paymentId
      );

      Integer remainingUnpaid = db.queryForObject(
          "SELECT COUNT(*) FROM installments WHERE plan_id = ? AND status != 'PAID'",
          Integer.class,
          planId
      );
      if (remainingUnpaid != null && remainingUnpaid == 0) {
        db.update("UPDATE plans SET status = 'COMPLETED' WHERE id = ?", planId);
        db.update("INSERT INTO plan_events(plan_id, event_type, detail) VALUES(?, 'PLAN_COMPLETED', JSON_OBJECT('reason', 'All installments settled'))", planId);
      }

      db.update(
          "INSERT INTO plan_events(plan_id, event_type, detail) VALUES(?, 'PAYMENT_CONFIRMED', JSON_OBJECT('paymentId', ?, 'installmentId', ?))",
          planId, paymentId, installmentId
      );
    }

    return Map.of("success", true, "paymentId", paymentId, "status", "PAID");
  }

  @GetMapping("/payments")
  public List<Map<String, Object>> listPayments(HttpServletRequest http) {
    long userId = userId(http);
    long merchantId = merchantId(userId);

    return db.queryForList(
        "SELECT p.id, p.plan_id planId, p.installment_id installmentId, " +
        "p.amount_paise amountPaise, p.status, " +
        "COALESCE(p.payment_method, 'UPI') paymentMethod, " +
        "COALESCE(p.reference, '') reference, " +
        "DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i') date, " +
        "DATE_FORMAT(p.confirmed_at, '%Y-%m-%d %H:%i') confirmedAt, " +
        "pl.item_name itemName, " +
        "c.id customerId, c.full_name customerName, COALESCE(c.phone, '') customerPhone, COALESCE(c.email, '') customerEmail " +
        "FROM payments p " +
        "JOIN plans pl ON pl.id = p.plan_id " +
        "JOIN customers c ON c.id = pl.customer_id " +
        "WHERE pl.merchant_id = ? " +
        "ORDER BY p.id DESC",
        merchantId
    );
  }

  @PostMapping("/plans/{planId}/installments/{installmentId}/remind")
  public Map<String, Object> sendReminder(
      @PathVariable long planId,
      @PathVariable long installmentId,
      HttpServletRequest http
  ) {
    long userId = userId(http);
    long merchantId = merchantId(userId);

    List<Map<String, Object>> rows = db.queryForList(
        "SELECT i.amount_paise, DATE_FORMAT(i.due_date, '%d %b %Y') dueDate, pl.item_name, " +
        "c.email, c.full_name, m.business_name, COALESCE(m.upi_id, '') upi_id " +
        "FROM installments i " +
        "JOIN plans pl ON pl.id = i.plan_id " +
        "JOIN customers c ON c.id = pl.customer_id " +
        "JOIN merchants m ON m.id = pl.merchant_id " +
        "WHERE i.id = ? AND pl.id = ? AND pl.merchant_id = ?",
        installmentId, planId, merchantId
    );
    if (rows.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Installment or plan not found");
    }

    Map<String, Object> row = rows.getFirst();
    String email = Objects.toString(row.get("email"), "").trim();
    if (email.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Customer has no email address configured");
    }

    String customerName = Objects.toString(row.get("full_name"), "Valued Customer");
    String merchantName = Objects.toString(row.get("business_name"), "Your Merchant");
    String itemName = Objects.toString(row.get("item_name"), "Purchase");
    String dueDate = Objects.toString(row.get("dueDate"), "Due Soon");
    String upiId = Objects.toString(row.get("upi_id"), "");
    long paise = ((Number) row.get("amount_paise")).longValue();
    String formattedAmount = String.format(Locale.ROOT, "₹%.2f", paise / 100.0);

    String subject = "Payment Reminder: Installment for " + itemName + " (" + merchantName + ")";
    String body = "Greetings " + customerName + ",\n\n" +
        "This is a polite reminder from " + merchantName + " regarding your installment for \"" + itemName + "\".\n\n" +
        "• Amount Due: " + formattedAmount + "\n" +
        "• Due Date: " + dueDate + "\n" +
        (!upiId.isBlank() ? ("• UPI ID: " + upiId + "\n") : "") +
        "\nShariah Principles: Zero interest (0% APR), strictly no compounding late fees.\n" +
        "Please visit your customer portal link or make the transfer to the merchant.\n\n" +
        "Thank you,\n" + merchantName + " via Amanah Pay";

    mailService.send(email, subject, body);

    db.update(
        "INSERT INTO plan_events(plan_id, event_type, detail) VALUES(?, 'REMINDER_SENT', JSON_OBJECT('installmentId', ?, 'email', ?, 'amountPaise', ?))",
        planId, installmentId, email, paise
    );

    return Map.of("success", true, "message", "Polite reminder dispatched to " + email);
  }

  @PostMapping("/customers")
  @Transactional
  public Map<String, Object> createCustomer(
      @Valid @RequestBody CreateCustomerRequest req,
      HttpServletRequest http
  ) {
    long userId = userId(http);
    long merchantId = merchantId(userId);

    String email = req.email() != null ? req.email().trim().toLowerCase(Locale.ROOT) : null;
    Long customerAccountId = null;
    if (email != null && !email.isBlank()) {
      List<Long> accIds = db.query(
          "SELECT id FROM customer_accounts WHERE email = ?",
          (r, n) -> r.getLong(1),
          email
      );
      if (!accIds.isEmpty()) customerAccountId = accIds.getFirst();
    }

    Long finalAccountId = customerAccountId;
    KeyHolder keyHolder = new GeneratedKeyHolder();
    db.update(con -> {
      PreparedStatement ps = con.prepareStatement(
          "INSERT INTO customers(merchant_id, full_name, email, phone, customer_account_id) VALUES(?, ?, ?, ?, ?)",
          new String[]{"id"}
      );
      ps.setLong(1, merchantId);
      ps.setString(2, req.fullName().trim());
      ps.setString(3, email);
      ps.setString(4, req.phone() != null ? req.phone().trim() : null);
      if (finalAccountId == null) ps.setNull(5, java.sql.Types.BIGINT);
      else ps.setLong(5, finalAccountId);
      return ps;
    }, keyHolder);

    long customerId = Objects.requireNonNull(keyHolder.getKey()).longValue();
    return Map.of(
        "id", String.valueOf(customerId),
        "name", req.fullName().trim(),
        "email", email != null ? email : "",
        "phone", req.phone() != null ? req.phone().trim() : ""
    );
  }

  private long userId(HttpServletRequest req) {
    Object id = req.getAttribute("amanah.userId");
    if (id == null) throw new AccessDeniedException("Login required");
    return Long.parseLong(id.toString());
  }

  private long merchantId(long userId) {
    Long m = db.queryForObject(
        "SELECT merchant_id FROM users WHERE id = ? AND status = 'ACTIVE'",
        Long.class,
        userId
    );
    if (m == null) throw new AccessDeniedException("Active merchant account required");
    return m;
  }
}

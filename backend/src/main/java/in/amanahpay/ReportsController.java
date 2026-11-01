package in.amanahpay;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping({"/api/v1/reports", "/api/reports"})
public class ReportsController {
  private final JdbcTemplate db;

  public ReportsController(JdbcTemplate db) {
    this.db = db;
  }

  @GetMapping("/monthly")
  public List<Map<String, Object>> getMonthlyCashflow(HttpServletRequest request) {
    long merchant = merchantId(request);

    // Group collected payments by month
    Map<String, Long> collectedMap = new HashMap<>();
    db.query(
        "SELECT DATE_FORMAT(COALESCE(p.confirmed_at, p.created_at), '%Y-%m') ym, " +
        "COALESCE(SUM(p.amount_paise), 0) total " +
        "FROM payments p " +
        "JOIN plans pl ON pl.id = p.plan_id " +
        "WHERE pl.merchant_id = ? AND p.status = 'PAID' " +
        "GROUP BY ym",
        (rs) -> {
          collectedMap.put(rs.getString("ym"), rs.getLong("total"));
        },
        merchant
    );

    // Group pending installments by due date month
    Map<String, Long> pendingMap = new HashMap<>();
    db.query(
        "SELECT DATE_FORMAT(i.due_date, '%Y-%m') ym, " +
        "COALESCE(SUM(i.amount_paise), 0) total " +
        "FROM installments i " +
        "WHERE i.merchant_id = ? AND i.status IN ('DUE', 'UPCOMING', 'OVERDUE') " +
        "GROUP BY ym",
        (rs) -> {
          pendingMap.put(rs.getString("ym"), rs.getLong("total"));
        },
        merchant
    );

    // Past 5 months through next month
    YearMonth current = YearMonth.now();
    List<Map<String, Object>> results = new ArrayList<>();
    DateTimeFormatter labelFmt = DateTimeFormatter.ofPattern("MMM", Locale.ENGLISH);

    for (int i = 5; i >= -1; i--) {
      YearMonth ym = current.minusMonths(i);
      String key = ym.toString();
      long collected = collectedMap.getOrDefault(key, 0L);
      long pending = pendingMap.getOrDefault(key, 0L);

      Map<String, Object> point = new LinkedHashMap<>();
      point.put("month", key);
      point.put("monthLabel", ym.format(labelFmt));
      point.put("collectedPaise", collected);
      point.put("pendingPaise", pending);
      point.put("collected", Math.round(collected / 100000.0 * 10.0) / 10.0); // in thousands for charts
      point.put("pending", Math.round(pending / 100000.0 * 10.0) / 10.0);
      results.add(point);
    }

    return results;
  }

  @GetMapping("/summary")
  public Map<String, Object> getReportsSummary(HttpServletRequest request) {
    long merchant = merchantId(request);

    Long collectedPaise = db.queryForObject(
        "SELECT COALESCE(SUM(p.amount_paise), 0) FROM payments p " +
        "JOIN plans pl ON pl.id = p.plan_id WHERE pl.merchant_id = ? AND p.status = 'PAID'",
        Long.class,
        merchant
    );
    Integer paymentCount = db.queryForObject(
        "SELECT COUNT(*) FROM payments p " +
        "JOIN plans pl ON pl.id = p.plan_id WHERE pl.merchant_id = ? AND p.status = 'PAID'",
        Integer.class,
        merchant
    );

    Long pendingPaise = db.queryForObject(
        "SELECT COALESCE(SUM(i.amount_paise), 0) FROM installments i " +
        "WHERE i.merchant_id = ? AND i.status IN ('DUE', 'UPCOMING')",
        Long.class,
        merchant
    );
    Integer pendingPlansCount = db.queryForObject(
        "SELECT COUNT(DISTINCT plan_id) FROM installments " +
        "WHERE merchant_id = ? AND status IN ('DUE', 'UPCOMING')",
        Integer.class,
        merchant
    );

    Long overduePaise = db.queryForObject(
        "SELECT COALESCE(SUM(i.amount_paise), 0) FROM installments i " +
        "WHERE i.merchant_id = ? AND i.status = 'OVERDUE'",
        Long.class,
        merchant
    );
    Integer overdueCustomersCount = db.queryForObject(
        "SELECT COUNT(DISTINCT pl.customer_id) FROM installments i " +
        "JOIN plans pl ON pl.id = i.plan_id " +
        "WHERE i.merchant_id = ? AND i.status = 'OVERDUE'",
        Integer.class,
        merchant
    );

    Integer activePlans = db.queryForObject(
        "SELECT COUNT(*) FROM plans WHERE merchant_id = ? AND status = 'ACTIVE'",
        Integer.class,
        merchant
    );
    Integer completedPlans = db.queryForObject(
        "SELECT COUNT(*) FROM plans WHERE merchant_id = ? AND status = 'COMPLETED'",
        Integer.class,
        merchant
    );

    int totalPlans = (activePlans != null ? activePlans : 0) + (completedPlans != null ? completedPlans : 0);
    int completionRate = totalPlans > 0 ? (int) Math.round((completedPlans != null ? completedPlans : 0) * 100.0 / totalPlans) : 100;

    Map<String, Object> summary = new LinkedHashMap<>();
    summary.put("collectedPaise", collectedPaise != null ? collectedPaise : 0L);
    summary.put("paymentCount", paymentCount != null ? paymentCount : 0);
    summary.put("pendingPaise", pendingPaise != null ? pendingPaise : 0L);
    summary.put("pendingPlansCount", pendingPlansCount != null ? pendingPlansCount : 0);
    summary.put("overduePaise", overduePaise != null ? overduePaise : 0L);
    summary.put("overdueCustomersCount", overdueCustomersCount != null ? overdueCustomersCount : 0);
    summary.put("activePlansCount", activePlans != null ? activePlans : 0);
    summary.put("completedPlansCount", completedPlans != null ? completedPlans : 0);
    summary.put("completionRate", completionRate);

    return summary;
  }

  private long merchantId(HttpServletRequest r) {
    Object id = r.getAttribute("amanah.userId");
    if (id == null) throw new AccessDeniedException("Login required");
    Long merchant = db.queryForObject(
        "SELECT merchant_id FROM users WHERE id = ? AND status = 'ACTIVE'",
        Long.class,
        Long.parseLong(id.toString())
    );
    if (merchant == null) throw new AccessDeniedException("Merchant account required");
    return merchant;
  }
}

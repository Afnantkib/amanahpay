package in.amanahpay;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api")
public class DashboardController {
  private final JdbcTemplate db;

  public DashboardController(JdbcTemplate db) {
    this.db = db;
  }

  @GetMapping("/health")
  public Map<String, Object> health() {
    Integer n = db.queryForObject("SELECT 1", Integer.class);
    return Map.of("status", n != null && n == 1 ? "UP" : "DOWN", "database", "mysql");
  }

  @GetMapping("/dashboard")
  public Map<String, Object> dashboard(HttpServletRequest r) {
    long merchant = merchant(r);

    List<Map<String, Object>> dueToday = db.queryForList(
        "SELECT i.id, i.plan_id planId, i.amount_paise amountPaise, " +
        "p.item_name itemName, c.full_name customerName " +
        "FROM installments i " +
        "JOIN plans p ON p.id = i.plan_id " +
        "JOIN customers c ON c.id = p.customer_id " +
        "WHERE i.merchant_id = ? AND i.status IN ('DUE', 'UPCOMING') AND i.due_date = CURDATE()",
        merchant
    );

    return Map.of(
        "collectedPaise", sum("SELECT COALESCE(SUM(p.amount_paise), 0) FROM payments p JOIN plans x ON x.id = p.plan_id WHERE x.merchant_id = ? AND p.status = 'PAID'", merchant),
        "pendingPaise", sum("SELECT COALESCE(SUM(i.amount_paise), 0) FROM installments i WHERE i.merchant_id = ? AND i.status IN ('DUE', 'UPCOMING')", merchant),
        "overduePaise", sum("SELECT COALESCE(SUM(i.amount_paise), 0) FROM installments i WHERE i.merchant_id = ? AND i.status = 'OVERDUE'", merchant),
        "upcomingPaise", sum("SELECT COALESCE(SUM(i.amount_paise), 0) FROM installments i WHERE i.merchant_id = ? AND i.status IN ('DUE', 'UPCOMING') AND i.due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)", merchant),
        "dueToday", dueToday
    );
  }

  @GetMapping("/customers")
  public List<Map<String, Object>> customers(HttpServletRequest r) {
    long merchant = merchant(r);
    return db.queryForList(
        "SELECT CAST(c.id AS CHAR) id, " +
        "c.full_name name, " +
        "COALESCE(c.phone, '') phone, " +
        "COALESCE(c.email, '') email, " +
        "COUNT(DISTINCT CASE WHEN p.status = 'ACTIVE' THEN p.id END) activePlans, " +
        "COALESCE(SUM(CASE WHEN i.status = 'PAID' THEN i.amount_paise ELSE 0 END), 0) paidPaise, " +
        "COALESCE(SUM(CASE WHEN i.status IN ('DUE', 'UPCOMING', 'OVERDUE') THEN i.amount_paise ELSE 0 END), 0) pendingPaise, " +
        "DATE_FORMAT(MIN(CASE WHEN i.status IN ('DUE', 'UPCOMING') THEN i.due_date END), '%Y-%m-%d') nextDue, " +
        "CASE " +
        "  WHEN SUM(CASE WHEN i.status = 'OVERDUE' THEN 1 ELSE 0 END) > 0 THEN 'Overdue' " +
        "  WHEN SUM(CASE WHEN i.status = 'DUE' THEN 1 ELSE 0 END) > 0 THEN 'Due soon' " +
        "  ELSE 'On track' " +
        "END status " +
        "FROM customers c " +
        "LEFT JOIN plans p ON p.customer_id = c.id " +
        "LEFT JOIN installments i ON i.plan_id = p.id " +
        "WHERE c.merchant_id = ? " +
        "GROUP BY c.id, c.full_name, c.phone, c.email " +
        "ORDER BY c.id DESC",
        merchant
    );
  }

  @GetMapping("/plans")
  public List<Map<String, Object>> plans(HttpServletRequest r) {
    long merchant = merchant(r);
    return db.queryForList(
        "SELECT CAST(p.id AS CHAR) id, " +
        "c.full_name customer, " +
        "p.item_name item, " +
        "p.total_amount_paise totalPaise, " +
        "COALESCE(ROUND(p.total_amount_paise / NULLIF(p.installment_count, 0)), p.total_amount_paise) monthlyPaise, " +
        "COALESCE(SUM(CASE WHEN i.status IN ('DUE', 'UPCOMING', 'OVERDUE') THEN i.amount_paise ELSE 0 END), 0) remainingPaise, " +
        "p.status status, " +
        "DATE_FORMAT(MIN(CASE WHEN i.status IN ('DUE', 'UPCOMING') THEN i.due_date END), '%Y-%m-%d') nextDue " +
        "FROM plans p " +
        "JOIN customers c ON c.id = p.customer_id " +
        "LEFT JOIN installments i ON i.plan_id = p.id " +
        "WHERE p.merchant_id = ? " +
        "GROUP BY p.id, c.full_name, p.item_name, p.total_amount_paise, p.installment_count, p.status " +
        "ORDER BY p.id DESC",
        merchant
    );
  }

  private long sum(String sql, long id) {
    Long n = db.queryForObject(sql, Long.class, id);
    return n == null ? 0 : n;
  }

  private long merchant(HttpServletRequest r) {
    Object id = r.getAttribute("amanah.userId");
    if (id == null) throw new AccessDeniedException("Login required");
    Long m = db.queryForObject(
        "SELECT merchant_id FROM users WHERE id = ? AND status = 'ACTIVE'",
        Long.class,
        Long.valueOf(id.toString())
    );
    if (m == null) throw new AccessDeniedException("Merchant required");
    return m;
  }
}

package in.amanahpay.payment;

import in.amanahpay.common.Money;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class PaymentAllocatorTest {
    @Test void allocatesFeesThenOldestOverdueThenCurrentThenFuture() {
        var due = LocalDate.of(2026, 10, 1);
        var obligations = List.of(
                new PaymentAllocator.Obligation("future", PaymentAllocator.Kind.PRINCIPAL, PaymentAllocator.Timing.FUTURE, due.plusMonths(2), Money.inr(500)),
                new PaymentAllocator.Obligation("current", PaymentAllocator.Kind.PRINCIPAL, PaymentAllocator.Timing.CURRENT, due, Money.inr(500)),
                new PaymentAllocator.Obligation("late", PaymentAllocator.Kind.LATE_FEE, PaymentAllocator.Timing.OVERDUE, due.minusDays(1), Money.inr(100)),
                new PaymentAllocator.Obligation("oldest", PaymentAllocator.Kind.PRINCIPAL, PaymentAllocator.Timing.OVERDUE, due.minusMonths(2), Money.inr(500)));
        var result = PaymentAllocator.allocate(Money.inr(700), obligations);
        assertEquals(List.of("late", "oldest", "current"), result.allocations().stream().map(PaymentAllocator.Allocation::obligationId).toList());
        assertEquals(0, result.unapplied().minorUnits());
    }
}

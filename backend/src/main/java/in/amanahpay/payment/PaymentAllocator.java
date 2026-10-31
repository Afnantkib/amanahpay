package in.amanahpay.payment;

import in.amanahpay.common.Money;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/** Calculates explicit payment allocations without mutating source obligations. */
public final class PaymentAllocator {
    private PaymentAllocator() {}
    public enum Kind { LATE_FEE, PRINCIPAL }
    public enum Timing { OVERDUE, CURRENT, FUTURE }
    public record Obligation(String id, Kind kind, Timing timing, LocalDate dueDate, Money outstanding) {
        public Obligation {
            Objects.requireNonNull(id); Objects.requireNonNull(kind); Objects.requireNonNull(timing);
            Objects.requireNonNull(dueDate); Objects.requireNonNull(outstanding);
            if (outstanding.isZero()) throw new IllegalArgumentException("Outstanding must be positive");
        }
    }
    public record Allocation(String obligationId, Money amount) {}
    public record Result(List<Allocation> allocations, Money unapplied) {
        public Result { allocations = List.copyOf(allocations); }
    }

    public static Result allocate(Money payment, List<Obligation> obligations) {
        Objects.requireNonNull(payment); Objects.requireNonNull(obligations);
        if (obligations.stream().anyMatch(o -> !payment.currency().equals(o.outstanding().currency())))
            throw new IllegalArgumentException("Currency mismatch");
        List<Obligation> ordered = new ArrayList<>(obligations);
        ordered.sort(Comparator.comparingInt(PaymentAllocator::priority)
                .thenComparing(Obligation::dueDate).thenComparing(Obligation::id));
        long remaining = payment.minorUnits();
        List<Allocation> allocations = new ArrayList<>();
        for (Obligation obligation : ordered) {
            if (remaining == 0) break;
            long applied = Math.min(remaining, obligation.outstanding().minorUnits());
            if (applied > 0) {
                allocations.add(new Allocation(obligation.id(), new Money(applied, payment.currency())));
                remaining -= applied;
            }
        }
        return new Result(allocations, new Money(remaining, payment.currency()));
    }

    private static int priority(Obligation o) {
        if (o.kind() == Kind.LATE_FEE) return 0;
        return switch (o.timing()) { case OVERDUE -> 1; case CURRENT -> 2; case FUTURE -> 3; };
    }
}

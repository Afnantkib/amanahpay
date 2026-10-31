package in.amanahpay.schedule;

import in.amanahpay.common.Money;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** Pure schedule calculator. Any remainder paise is assigned to earlier installments. */
public final class InstallmentSchedule {
    private InstallmentSchedule() {}

    public enum Frequency {
        MONTHLY(0), WEEKLY(7), BIWEEKLY(14);
        private final int days;
        Frequency(int days) { this.days = days; }
    }

    public record Installment(int number, LocalDate dueDate, Money amount) {}
    public record Schedule(Money totalPrice, Money downPayment, List<Installment> installments) {
        public Schedule { installments = List.copyOf(installments); }
        public Money scheduledTotal() {
            Money total = downPayment;
            for (Installment installment : installments) total = total.plus(installment.amount());
            return total;
        }
    }

    public static Schedule create(Money totalPrice, Money downPayment, int count,
                                  LocalDate firstDueDate, Frequency frequency) {
        Objects.requireNonNull(totalPrice, "totalPrice");
        Objects.requireNonNull(downPayment, "downPayment");
        Objects.requireNonNull(firstDueDate, "firstDueDate");
        Objects.requireNonNull(frequency, "frequency");
        if (!totalPrice.currency().equals(downPayment.currency())) throw new IllegalArgumentException("Currency mismatch");
        if (totalPrice.isZero()) throw new IllegalArgumentException("Total price must be greater than zero");
        if (downPayment.compareTo(totalPrice) > 0) throw new IllegalArgumentException("Down payment exceeds total price");
        if (count < 2 || count > 24) throw new IllegalArgumentException("Installment count must be from 2 to 24");

        long balance = totalPrice.minus(downPayment).minorUnits();
        long base = balance / count;
        long remainder = balance % count;
        int anchorDay = firstDueDate.getDayOfMonth();
        List<Installment> rows = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            LocalDate due = frequency == Frequency.MONTHLY
                    ? monthlyDue(firstDueDate, i, anchorDay)
                    : firstDueDate.plusDays((long) frequency.days * i);
            long amount = Math.addExact(base, i < remainder ? 1 : 0);
            rows.add(new Installment(i + 1, due, new Money(amount, totalPrice.currency())));
        }
        Schedule schedule = new Schedule(totalPrice, downPayment, rows);
        if (!schedule.scheduledTotal().equals(totalPrice)) throw new IllegalStateException("Schedule does not reconcile");
        return schedule;
    }

    private static LocalDate monthlyDue(LocalDate first, int offset, int anchorDay) {
        YearMonth target = YearMonth.from(first).plusMonths(offset);
        return target.atDay(Math.min(anchorDay, target.lengthOfMonth()));
    }
}

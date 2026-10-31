package in.amanahpay.schedule;

import in.amanahpay.common.Money;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.LongRange;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

class InstallmentScheduleTest {
    @Property(tries = 10_000)
    void scheduleAlwaysReconciles(@ForAll @LongRange(min = 1, max = 9_000_000_000L) long total,
                                  @ForAll @IntRange(min = 2, max = 24) int count,
                                  @ForAll @LongRange(min = 0, max = 8_999_999_999L) long rawDown) {
        long down = Math.min(rawDown, total);
        var schedule = InstallmentSchedule.create(Money.inr(total), Money.inr(down), count,
                LocalDate.of(2026, 1, 15), InstallmentSchedule.Frequency.MONTHLY);
        assertEquals(Money.inr(total), schedule.scheduledTotal());
        assertEquals(count, schedule.installments().size());
    }

    @Test void monthEndClampsThenReturnsToAnchorDay() {
        var schedule = InstallmentSchedule.create(Money.inr(10_000), Money.inr(0), 3,
                LocalDate.of(2026, 1, 31), InstallmentSchedule.Frequency.MONTHLY);
        assertEquals(LocalDate.of(2026, 2, 28), schedule.installments().get(1).dueDate());
        assertEquals(LocalDate.of(2026, 3, 31), schedule.installments().get(2).dueDate());
    }

    @Test void earliestInstallmentsReceiveRemainderPaise() {
        var schedule = InstallmentSchedule.create(Money.inr(1_001), Money.inr(0), 3,
                LocalDate.of(2026, 1, 1), InstallmentSchedule.Frequency.MONTHLY);
        assertEquals(334, schedule.installments().get(0).amount().minorUnits());
        assertEquals(334, schedule.installments().get(1).amount().minorUnits());
        assertEquals(333, schedule.installments().get(2).amount().minorUnits());
    }
}

package in.amanahpay.plan;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PlanStateMachineTest {
    private final PlanStateMachine machine = new PlanStateMachine();
    @Test void permitsNormalOfferAcceptanceAndCompletion() {
        assertEquals(PlanStateMachine.State.OFFERED, machine.transition(PlanStateMachine.State.DRAFT, PlanStateMachine.State.OFFERED));
        assertEquals(PlanStateMachine.State.ACCEPTED, machine.transition(PlanStateMachine.State.OFFERED, PlanStateMachine.State.ACCEPTED));
        assertEquals(PlanStateMachine.State.ACTIVE, machine.transition(PlanStateMachine.State.ACCEPTED, PlanStateMachine.State.ACTIVE));
        assertEquals(PlanStateMachine.State.COMPLETED, machine.transition(PlanStateMachine.State.ACTIVE, PlanStateMachine.State.COMPLETED));
    }
    @Test void rejectsSkippingAcceptance() {
        assertThrows(IllegalStateException.class, () -> machine.transition(PlanStateMachine.State.OFFERED, PlanStateMachine.State.ACTIVE));
    }
}

package in.amanahpay.plan;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;

/** Central place to enforce allowed lifecycle transitions. */
public final class PlanStateMachine {
    public enum State { DRAFT, OFFERED, ACCEPTED, ACTIVE, COMPLETED, CANCELLED, DEFAULTED, RETURNED, REFUNDED }
    private static final Map<State, EnumSet<State>> ALLOWED = new EnumMap<>(State.class);
    static {
        ALLOWED.put(State.DRAFT, EnumSet.of(State.OFFERED, State.CANCELLED));
        ALLOWED.put(State.OFFERED, EnumSet.of(State.ACCEPTED, State.CANCELLED));
        ALLOWED.put(State.ACCEPTED, EnumSet.of(State.ACTIVE, State.CANCELLED));
        ALLOWED.put(State.ACTIVE, EnumSet.of(State.COMPLETED, State.CANCELLED, State.DEFAULTED, State.RETURNED));
        ALLOWED.put(State.DEFAULTED, EnumSet.of(State.ACTIVE, State.CANCELLED, State.RETURNED));
        ALLOWED.put(State.RETURNED, EnumSet.of(State.REFUNDED, State.COMPLETED));
        ALLOWED.put(State.COMPLETED, EnumSet.noneOf(State.class));
        ALLOWED.put(State.CANCELLED, EnumSet.noneOf(State.class));
        ALLOWED.put(State.REFUNDED, EnumSet.noneOf(State.class));
    }

    public State transition(State current, State next) {
        if (current == null || next == null || !ALLOWED.get(current).contains(next))
            throw new IllegalStateException("Illegal plan transition: " + current + " -> " + next);
        return next;
    }
}

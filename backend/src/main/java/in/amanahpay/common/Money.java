package in.amanahpay.common;

import java.util.Objects;

/** Exact monetary value in minor units (paise for INR). */
public record Money(long minorUnits, String currency) implements Comparable<Money> {
    public Money {
        if (minorUnits < 0) throw new IllegalArgumentException("Money cannot be negative");
        currency = Objects.requireNonNull(currency, "currency").toUpperCase();
        if (!currency.matches("[A-Z]{3}")) throw new IllegalArgumentException("Currency must be an ISO-4217 code");
    }

    public static Money inr(long paise) { return new Money(paise, "INR"); }

    public Money plus(Money other) {
        requireSameCurrency(other);
        return new Money(Math.addExact(minorUnits, other.minorUnits), currency);
    }

    public Money minus(Money other) {
        requireSameCurrency(other);
        return new Money(Math.subtractExact(minorUnits, other.minorUnits), currency);
    }

    public Money min(Money other) { requireSameCurrency(other); return minorUnits <= other.minorUnits ? this : other; }
    public boolean isZero() { return minorUnits == 0; }

    @Override public int compareTo(Money other) { requireSameCurrency(other); return Long.compare(minorUnits, other.minorUnits); }

    private void requireSameCurrency(Money other) {
        Objects.requireNonNull(other, "other");
        if (!currency.equals(other.currency)) throw new IllegalArgumentException("Currency mismatch");
    }
}

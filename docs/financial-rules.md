# Financial rules (Phase 1)

## Money

Persist integer paise as signed BIGINT with nonnegative domain validation. Never use float/double for calculations. Arithmetic uses checked overflow. Currency mismatch is an error. API and UI must distinguish user-entered rupees from persisted paise and return authoritative server amounts.

## Schedule allocation

Let `balance = total deferred price - down payment`; divide by installment count with integer division. Distribute the remaining paise one each to the earliest installments. Thus the exact sum of down payment and installments always equals total price. Example: ₹1,000.01 over 3 payments gives ₹333.34, ₹333.34, ₹333.33. No interest or additional customer markup is calculated.

Monthly schedules preserve the original day-of-month: Jan 31 -> Feb 28/29 -> Mar 31. Weekly and biweekly dates advance by 7 and 14 days. Installment count is 2–24. Down payment cannot exceed total price.

## Payment allocation

When a merchant records received funds, allocation priority is: disclosed late fees first (only if the merchant policy and accepted agreement permit them), oldest overdue principal, current principal, then future principal. Within a priority group, due date then stable obligation ID decides order. Any amount beyond outstanding obligations is returned as unapplied for reconciliation; never silently discard it. The allocator does not mutate obligations; persistence must append payment and allocation rows in one transaction under plan/installment locks.

## Reversals and returns

Never edit or delete a posted payment. A correction is a linked reversal with compensating allocation rows. A return/cancellation calculates total paid less merchant-authorized refund/adjustment, bounded by amounts actually collected. Require explicit review before a refund obligation is recorded; this domain core does not move funds.

## Lifecycle

The `PlanStateMachine` is the sole authority for plan transitions. Store each accepted transition as an immutable event. State changes must be transactionally coupled to the event and guarded by optimistic version checks. Installment lifecycle and daily due/overdue jobs will be added in the next increment.

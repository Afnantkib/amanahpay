# ERD description

All tenant-owned tables include `merchant_id` and use composite indexes beginning with that key. Foreign keys use restrictive deletion where financial history exists; deletion requests should anonymize or erase eligible personal data without destroying required accounting/audit records.

```text
merchants 1---* merchant_users
merchants 1---* customers 1---* plans 1---* installments
plans 1---* payments 1---* payment_allocations *---1 installments
plans 1---* plan_events
plans 1---* agreements
customers 1---* consent_records
plans 1---* reminders
merchants 1---* merchant_fee_ledger
merchants 1---* audit_logs
merchant_users 1---* audit_logs
merchant_users 1---* idempotency_keys
merchant_users 1---* otp_codes
merchants 1---* notification_templates
```

## Tables and important constraints

- `merchants`: id, legal/display name, GSTIN nullable, encrypted UPI VPA, logo URL, locale, status, timestamps.
- `merchant_users`: id, merchant_id, phone/email, role (`OWNER`/`STAFF`), verified flags, passwordless auth metadata, token version, optional encrypted TOTP secret. Unique `(merchant_id, phone)` and `(merchant_id, email)` when present.
- `customers`: id, merchant_id, display name, encrypted phone/address, private note, trust tag, created/updated timestamps. Unique `(merchant_id, normalized_phone)`.
- `plans`: id, merchant_id, customer_id, item description, currency, total price/down payment in paise, frequency, count, due-day anchor, state, row version, idempotency key reference, offer token hash/expiry, accepted timestamp, agreement version, return/refund amounts. Index `(merchant_id, state, created_at)`.
- `installments`: id, merchant_id, plan_id, sequence, due date, original amount/outstanding in paise, state, row version. Unique `(plan_id, sequence)`; index `(merchant_id, state, due_date)`.
- `payments`: id, merchant_id, plan_id, amount paise, method, UTR/reference, source, recorded_by, external event ID, received timestamp, reversal_of nullable. Append only. Unique `(merchant_id, source, external_event_id)` when external ID exists.
- `payment_allocations`: id, merchant_id, payment_id, installment_id, allocation type (`FEE`/`PRINCIPAL`/`REVERSAL`), amount paise, timestamp. Financial corrections append reversing rows.
- `plan_events`: id, merchant_id, plan_id, event type, actor, structured payload, occurred_at. Append-only immutable history.
- `agreements`: id, merchant_id, plan_id, template version, accepted snapshot, acceptance IP, timestamp and OTP proof reference. Immutable after acceptance.
- `reminders`: id, merchant_id, plan_id, installment_id, channel, scheduled/sent time, provider reference, outcome, idempotency key.
- `notification_templates`: id, merchant_id nullable for defaults, locale, channel, event type, template body/version.
- `merchant_fee_ledger`: id, merchant_id, plan_id nullable, fee basis, amount paise, status, invoice reference, timestamps. This is a fee owed by the merchant to the platform, not a customer payment deduction.
- `audit_logs`: id, merchant_id nullable for platform actions, actor, action, target type/id, masked metadata, timestamp, request correlation ID.
- `idempotency_keys`: id, merchant_id, actor, operation, key, request hash, response snapshot, expiry/created timestamps. Unique `(merchant_id, operation, key)`.
- `otp_codes`: id, subject, purpose, hashed code, expiry, attempts, consumed timestamp.
- `consent_records`: id, merchant_id, customer_id, purpose, notice version, granted/revoked timestamps, capture source and evidence.

Amounts use BIGINT minor units and currency is explicit. Every foreign key that can cross tenants should include merchant ID in the referenced key (for example unique `(merchant_id, id)`) so the database reinforces repository-level tenant scoping.

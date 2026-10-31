# Architecture

## Phase 1 boundary

The first increment is a pure Java domain core. It has no endpoints, database writes, payment execution, identity provider, or production secrets. The intended deployable shape is a modular monolith: React/Vite client, Spring Boot API, MySQL 8, and a reverse proxy. Keep money, schedule, state and allocation rules independent of HTTP and persistence so they can be tested and reviewed in isolation.

## Modules

- `identity`: OTP, access/refresh token lifecycle, owner/staff RBAC, optional owner TOTP.
- `merchant`: merchant profile, UPI VPA, staff and platform fee ledger.
- `customer`: tenant-owned customer profile, consent, private merchant note/trust tag.
- `plan` and `schedule`: immutable agreed price, offer/acceptance snapshot, due schedule and state transitions.
- `payment`: append-only receipt records, explicit allocations, reversals and reconciliation. Amanah Pay never receives or pools customer funds.
- `agreement`: versioned template and accepted snapshot, consent evidence.
- `reminder`: idempotent jobs and pluggable messaging provider.
- `report`: tenant-scoped collections and exports.
- `admin`: platform operations with audited access.
- `common`: Money, tenant context, clock, errors, provider interfaces.

Payment, messaging and KYC integrations are behind interfaces. Every operation on merchant data obtains a trusted tenant ID from the authenticated principal, then scopes reads/writes within the repository. Never accept an arbitrary tenant ID as authorization. Use optimistic versions for plans and installments, pessimistic locking when applying a payment, and persist idempotency key plus request hash and response for retried create/payment calls.

## Core runtime flow

Merchant creates a fixed-price plan -> server calculates and stores the schedule -> customer receives a secure offer link -> customer verifies OTP, sees all terms and accepts -> merchant records the sale/acceptance -> customer pays the merchant directly -> merchant or verified gateway callback records a payment -> allocator writes immutable allocations and plan events. The provider callback verifies signature and idempotency before any state change.

## Cross-cutting requirements

Use Asia/Kolkata for due-date jobs, store event timestamps as UTC instants, and store contractual due dates as local dates. Store monetary values as BIGINT paise. Encrypt customer PII using an envelope-key design in production; mask PII in logs. Consent, agreement version, source and timestamp are auditable. Build tenant-isolation checks into all repository tests. Do not put bureau pulls, credit scoring, card storage or a platform funds account into v1.

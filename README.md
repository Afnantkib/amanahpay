# Amanah Pay

Merchant-first installment tracking for India. Amanah Pay records agreed fixed-price plans and payments made directly to the merchant; it does not lend, hold, pool, or move customer funds.

## Architecture (Phase 1)

Build as a modular monolith first: one Spring Boot API, one MySQL database, and a separately deployable React client. Keep bounded packages for identity, merchant, customer, plans, schedule, payment, reminders, agreements, reporting, admin, and shared infrastructure. This keeps operational overhead low while preserving clear seams for later extraction.

All money is integer paise in `Money`; the server is authoritative for schedules and allocations. The schedule engine is pure Java and has no database or provider dependency. Payments are append-only and corrections will be reversals. Each merchant-owned record carries a `merchant_id`; tenant filtering belongs in repository APIs and authorization, not in client-supplied filters. Provider interfaces will isolate payment links/UPI, messaging, and KYC integrations. In this product slice, payment instructions point to the merchant and no platform funds flow is implemented.

The initial backend targets Java 21 and Maven. Run it from `backend/` with `mvn spring-boot:run` after later API wiring. Phase 1 is a compilable Java library and test suite; it does not yet expose HTTP endpoints or connect to MySQL.

## Phase 1 core

Contains:

- `Money`: currency-safe, overflow-checked integer paise operations.
- `InstallmentSchedule`: exact split after down payment, monthly/weekly/biweekly dates, and month-end clamping.
- `PlanStateMachine`: explicit legal state transitions.
- `PaymentAllocator`: deterministic explicit allocations, fees first, then oldest overdue, current, and future items.

Run the tests with `cd backend && mvn test` (Java 21 required).

## Data model overview

See [`docs/erd.md`](docs/erd.md), [`docs/architecture.md`](docs/architecture.md), and [`docs/financial-rules.md`](docs/financial-rules.md). Product/legal assumptions to validate are in [`docs/compliance-notes.md`](docs/compliance-notes.md).

## Frontend preview

```sh
cd frontend
npm install
npm run dev
```

Mock service worker is on by default during development; set `VITE_USE_MOCKS=false` to call the API. The current backend has no REST endpoints or OpenAPI schema, so API-connected screens remain mock-backed until those contracts are added. See [`docs/frontend-api-map.md`](docs/frontend-api-map.md) for the endpoint map and gaps.

Frontend checks: `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` (uses installed Google Chrome).

## Product boundary

The merchant sets eligibility and sells at a fixed deferred price agreed upfront. The merchant pays Amanah Pay's disclosed SaaS fee. Customers pay the merchant directly by UPI or a gateway arrangement that settles directly to the merchant. No credit bureau scoring, interest, automated eligibility decision, customer fee, or stored payment credential is included in v1. Shariah status and regulatory treatment must be confirmed by qualified advisers before public claims or launch.

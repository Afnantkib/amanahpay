# Frontend API map and current backend gaps

## Inspection result

The current `/backend` contains `AmanahPayApplication`, `Money`, `InstallmentSchedule`, `PlanStateMachine` and `PaymentAllocator`. It has no REST controllers, request/response DTOs, security configuration, persistence entities/repositories, migrations, or OpenAPI document. Consequently, there is no `/v3/api-docs` schema from which to generate an API client. No backend code was changed for this frontend. The frontend's `src/lib/api/types.ts` types are explicitly marked mock contracts; they must be replaced by generated types when the API schema exists.

## Screen to endpoint map

| Screen/flow | Intended endpoint | Current status |
| --- | --- | --- |
| Merchant dashboard | `GET /api/dashboard` | **BACKEND GAP** — MSW mock |
| Customer list and detail | `GET /api/customers`, `GET /api/customers/{id}` | **BACKEND GAP** — list mock; detail derives from list |
| Create customer | `POST /api/customers` (Idempotency-Key) | **BACKEND GAP** — UI placeholder |
| Plan list/detail | `GET /api/plans`, `GET /api/plans/{id}` | **BACKEND GAP** — list mock; detail placeholder |
| Preview schedule | `POST /api/plans/preview` | **BACKEND GAP** — illustrative shared frontend helper only; final schedule must come from backend |
| Create/send plan offer | `POST /api/plans` (Idempotency-Key), `POST /api/plans/{id}/offer` | **BACKEND GAP** — wizard uses illustrative preview and demo toast |
| Collections and reminders | `GET /api/collections`, `POST /api/reminders` | **BACKEND GAP** — collection view uses customer mock; reminder action demo only |
| Record/reverse payment | `POST /api/plans/{id}/payments`, `POST /api/payments/{id}/reversals` (Idempotency-Key) | **BACKEND GAP** — demo action only |
| Reports and exports | `GET /api/reports/collections`, `GET /api/reports/export` | **BACKEND GAP** — demo figures |
| Merchant settings/staff | `GET/PUT /api/merchant`, `GET/POST /api/merchant/users` | **BACKEND GAP** — demo settings |
| Merchant OTP | `POST /api/auth/otp`, `POST /api/auth/verify` | **BACKEND GAP** — OTP interaction is simulated |
| Customer magic link/OTP/accept | `GET /api/public/offers/{token}`, `POST /api/public/offers/{token}/otp`, `POST /api/public/offers/{token}/accept` | **BACKEND GAP** — demo customer page |
| Customer payment instruction/report | `GET /api/public/plans/{token}`, `POST /api/public/plans/{token}/payment-intent` | **BACKEND GAP** — UPI action is placeholder; no funds flow |
| Customer data request | `POST /api/public/privacy-requests` | **BACKEND GAP** — support link placeholder |
| Contact form | `POST /api/public/contact` | **BACKEND GAP** — client-side confirmation only |
| Platform admin | `GET /api/admin/merchants`, `POST /api/admin/merchants/{id}/status`, `GET /api/admin/audit` | **BACKEND GAP** — demo data |

## Frontend structure

One Vite application with route groups in React Router: public site, merchant workspace, customer portal, and platform admin. `src/design-system` contains CSS design tokens; `src/components` shared UI; `src/website` marketing page; `src/lib` API contracts, formatting, localization, and schedule illustration; `src/mocks` contains MSW handlers. Mock mode is enabled only when `VITE_USE_MOCKS=true`.

The mock is for interactive UI review only. No endpoint is represented as implemented by the backend. When endpoints are added, expose `/v3/api-docs`, generate `src/lib/api/generated/schema.d.ts` with `openapi-typescript`, then update the thin API wrapper to consume those types.

There was no `docker-compose.yml` in the repository to extend. The frontend includes a multi-stage Dockerfile and Nginx SPA config; composing it with the API and database should follow once those services and their configuration exist.

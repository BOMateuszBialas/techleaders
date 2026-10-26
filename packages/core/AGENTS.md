# packages/core (`@commerceos/core`): agent rules

Read the root `AGENTS.md` first (overview, Validation, agent rules). This file holds the rules for the domain package.

## Role and boundaries

- Responsibility: domain rules (`src/domain`), use cases and services (`src/services`), shared Zod input schemas (`src/validators`), ports (`src/ports`), `AppError` and typed errors (`src/errors`). Pure TypeScript.
- May depend on `zod` only. No Next.js, React, ORM or DI imports, and no other workspace package. ESLint (`no-restricted-imports` in `eslint.config.mjs`) enforces this.
- Ports end in `Port` or `Gateway`. Use cases are `<name>.use-case.ts`, services are `<name>.service.ts`. Layout is layer folder, then concept folder (`ENGINEERING_STANDARDS.md` §1 and "Repository decisions"). Create a concept folder with its first real file.
- Use cases signal failures with `AppError` subclasses (`ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`). `apiHandler` maps them to 400/401/403/404/409 and everything else to a generic 500 (`packages/app/src/server/http/`).
- Business logic never lives in React components or route handlers.
- Unit-test with fakes (no network, no DB). 100% unit coverage applies (see the root `AGENTS.md`, Testing).

## Money

- Money is stored as integer minor units (`priceMinor`, `totalMinor`). Use the `Money` helpers in `core`; never use floats.

## Order status and access

- Order status changes go only through the transition table in `packages/core/src/domain/orders/order-status.ts` (orders spec A4) and the conditional update in the database adapter (see `packages/database/AGENTS.md`).
- `paid` is set only by the payment flow (`markPaid`), never by the admin (A3); `refunded` is a recorded status only (no money moves, no restock).
- Order access: `packages/core/src/domain/orders/order-access.ts`. Reads by public order reference pass `toOrderViewer(...)`; see `packages/app/AGENTS.md` (Accounts).
- Demo data is discriminated only by `isDemoOrderReference` / `DEMO_ORDER_REFERENCE_LIKE` in core.

## Copilot

- Recommendation actions (save, dismiss, complete) go only through the transition table in `packages/core/src/domain/copilot/recommendation-status.ts` (Copilot spec A14).

## Metrics

- Metric definitions (revenue, paid orders, AOV, top products, low stock) are documented in both the code and the UI: one source, `METRIC_DEFINITIONS` in `packages/core/src/domain/metrics/metric-definitions.ts`, printed on `/admin` and mirrored in the README.
- The Copilot tools call the metric use cases in `packages/core/src/services/metrics/` unchanged; never compute a metric a second way.

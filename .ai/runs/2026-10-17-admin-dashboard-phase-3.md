# Run: admin dashboard (spec Phase 3, E04-S02 #23)

- Date: 2026-10-17
- Agent: Claude Code (lane B, autonomous; the user is away and answers no questions)
- Source doc: `.ai/specs/2026-10-16-orders-dashboard-demo-store.md` (Phase 3, steps 10–13)
- Branch: `feat/admin-dashboard-phase-3`
- Issue: #23

## Goal

The owner's `/admin` shows orders placed, paid orders, revenue from paid orders, AOV, top products
and low stock for "Last 7 days" or "Last 30 days", each with its definition printed next to the
number, from one set of core metric use cases that the Copilot tools (E05) will call unchanged.

## Scope

- `core`: `domain/metrics/metric-definitions.ts`, `domain/metrics/metric-period.ts`,
  `domain/orders/demo-order.ts`, `validators/metrics/metric-query.schema.ts`,
  `ports/store-metrics.port.ts`, `services/metrics/*` (four tool-shaped use cases + `GetDashboard`).
- `database`: `adapters/database-store-metrics.ts` (+ unit and integration tests).
- `app`: container registrations (`storeMetrics`, `clock`, use cases), `/admin` page, colocated
  `load-dashboard.ts`, `components/admin/dashboard/`, e2e `admin-dashboard.e2e.test.ts`.
- Docs: README (metric definitions), `BACKWARD_COMPATIBILITY.md` (`/admin?period`), lessons.

### Non-goals

- Orders admin (Phase 1, lane A), demo seed and traffic tables (Phase 2), Copilot tools (E05),
  custom ranges or comparison (P1), moving the spec to `implemented/` (the lead does it).

## Approved deviation

The spec ships Phase 3 after Phase 2 (demo seed) so the e2e runs on a seeded store. Lane A is
building Phases 1 and 2 in parallel, so this phase is built from current `main` (approved by the
lead). The e2e test asserts properties only (every card shows a value and its definition; "Last 30
days" changes the range label; "Paid orders" rises by one after a storefront purchase). The
demo-orders note is unit-tested instead of asserted in e2e. `demo-order.ts` is created exactly as
the spec describes (same names and file) because Phase 1 is not merged yet; a merge conflict with
lane A's copy is resolved by keeping one.

## Implementation Plan

### Phase 1: Metric domain (spec step 10)

- 1.1 Metric definitions, period resolution, AOV, demo-order discriminator, validators, unit tests.

### Phase 2: Metrics port and adapter (spec step 11)

- 2.1 `StoreMetricsPort`, `DatabaseStoreMetrics` with unit tests and a hand-built integration fixture.

### Phase 3: Use cases and container (spec step 12)

- 3.1 Four tool-shaped use cases and `GetDashboardUseCase` with fakes and a fixed clock; container wiring.

### Phase 4: Dashboard UI, e2e and docs (spec step 13)

- 4.1 Dashboard view, loader, page, unit tests in every state.
- 4.2 E2E `admin-dashboard.e2e.test.ts`, docs, full gate.

## Risks

- Lane A creates `demo-order.ts` too: trivial merge conflict, resolved on merge.
- Raw `em.execute` returns `bigint` aggregates as strings: converted with a safe-integer check.

## Decisions (judgment calls, no user available)

- Demo-order count is its own port method, `demoOrderCount(range)`: demo orders placed **or** paid in the period (the spec lists it under `salesSummary`, which would miss cancelled demo orders that show in "Orders placed").
- DTOs carry `definitionIds: MetricId[]` instead of a single `definitionId` (the sales summary covers three metrics).
- Definition text keeps the A8 wording, with column names as plain words ("payment date", "totals") and "grosz" for "minor unit"; a unit test ties the README table to `METRIC_DEFINITIONS` word for word.
- "Orders placed" status labels reuse `orderStatusLabel` (storefront copy); core `ORDER_STATUS_LABELS` belongs to Phase 1.
- Fixed English month list for range labels (ICU on Node 24 prints "Sept").
- Instants bound as ISO strings with `?::timestamptz` in raw SQL; boundary orders in the integration fixture prove the half-open range.
- A metrics failure renders an inline alert and keeps the system status card instead of the admin error boundary.
- `isDemoOrderReference` / `DEMO_ORDER_REFERENCE_LIKE` created in `core/domain/orders/demo-order.ts` exactly as the spec names them (lane A's Phase 1 not merged at start).

## Outcome

- Commits: e4bfc29 (domain), fa6a9a3 (port + adapter), 176b028 (use cases + container), 5334b25 (UI), 09267aa (e2e + docs).
- Targeted checks during the run: domain/use-case/adapter unit tests, the metrics integration test (7 tests, hand-computed fixture), the dashboard e2e (3 tests), typecheck, lint and the 100 % unit coverage gate all green before the full gate.
- Full gate and review: see the PR summary comment.

## Follow-ups

- Phase 2 (lane A): once demo orders are seeded, the dashboard note "Includes N seeded demo orders (fictional)." appears; the e2e could then assert it on the seeded store.
- E05: the Copilot tools call the four metric use cases; custom ranges need their own validator (spec).

## Progress

PR: #51

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Metric domain

- [x] 1.1 Metric definitions, period resolution, AOV, demo-order discriminator, validators, unit tests — e4bfc29

### Phase 2: Metrics port and adapter

- [x] 2.1 StoreMetricsPort, DatabaseStoreMetrics with unit tests and a hand-built integration fixture — fa6a9a3

### Phase 3: Use cases and container

- [x] 3.1 Four tool-shaped use cases and GetDashboardUseCase; container wiring — 176b028

### Phase 4: Dashboard UI, e2e and docs

- [x] 4.1 Dashboard view, loader, page, unit tests in every state — 5334b25
- [x] 4.2 E2E admin-dashboard.e2e.test.ts, docs, full gate — 09267aa

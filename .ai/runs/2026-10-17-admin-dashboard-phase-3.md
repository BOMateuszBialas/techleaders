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

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Metric domain

- [ ] 1.1 Metric definitions, period resolution, AOV, demo-order discriminator, validators, unit tests

### Phase 2: Metrics port and adapter

- [ ] 2.1 StoreMetricsPort, DatabaseStoreMetrics with unit tests and a hand-built integration fixture

### Phase 3: Use cases and container

- [ ] 3.1 Four tool-shaped use cases and GetDashboardUseCase; container wiring

### Phase 4: Dashboard UI, e2e and docs

- [ ] 4.1 Dashboard view, loader, page, unit tests in every state
- [ ] 4.2 E2E admin-dashboard.e2e.test.ts, docs, full gate

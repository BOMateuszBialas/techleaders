# Run: admin orders (E04-S01, #22) — Phase 1 of the orders/dashboard/demo-store spec

- Source doc: `.ai/specs/2026-10-16-orders-dashboard-demo-store.md` (Phase 1, steps 1–5)
- Issue: #22 (E04-S01)
- Branch: `feat/admin-orders-phase-1`
- Engine: om-auto-create-pr (steps: 5, --loop: no); run by lane A of a parallel session (lane B builds Phase 3, the dashboard, on its own branch)
- Mode: autonomous (owner away); judgment calls are recorded under "Decisions"

## Goal

The owner lists orders newest first, opens one to see its item snapshots, totals and shipping data, and moves it through the explicit transition table (A4). Cancelling an unpaid order restores its stock in the same transaction; "refunded" is a recorded status only (N02); `paid` comes only from the payment flow (A3).

## Scope

- `core`: `domain/orders/order-status.ts`, `domain/orders/demo-order.ts`, `ports/order-admin.port.ts`, three use cases in `services/orders/`, validator `validators/orders/order-status-change.schema.ts`
- `database`: `adapters/database-order-admin-repository.ts` (+ unit and integration tests)
- `app`: `/admin/orders`, `/admin/orders/[id]`, `server/orders/order-status.action.ts`, `components/admin/orders/`, admin nav link, container registrations, guard inventory
- e2e `admin-orders.e2e.test.ts`
- Docs: AGENTS.md stock-writer rule, stock panel copy, `BACKWARD_COMPATIBILITY.md` §1, README; amend #22's AC (A3)

Non-goals: metrics, dashboard, `clock` registration (Phase 3, lane B); demo seed, traffic tables (Phase 2); order filters, search, status history (A6, A7).

## Implementation Plan

### Phase 1: Orders admin

1. Reconcile with E02; add `order-status.ts` and `demo-order.ts` with unit tests
2. Port, repository adapter, unit and integration tests
3. Use cases, validator, container registrations
4. Admin pages, action, components, guard inventory, e2e
5. Docs and the #22 AC amendment; full gate

## Risks

- Lane B edits the same registration points (container, admin layout nav, AGENTS.md, README, BACKWARD_COMPATIBILITY.md): merge conflicts are resolved by keeping both sides.
- The e2e sign-in rate limit (20/min) is shared by the run: the new suite signs in once and reuses the session.

## Decisions

(filled during the run)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Orders admin

- [ ] 1.1 Reconcile with E02; add order-status and demo-order domain modules
- [ ] 1.2 Port, repository adapter, unit and integration tests
- [ ] 1.3 Use cases, validator, container registrations
- [ ] 1.4 Admin pages, action, components, guard inventory, e2e
- [ ] 1.5 Docs, #22 AC amendment, full gate

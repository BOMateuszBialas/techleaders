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

- **Reconciliation with E02 (step 1):** the merged schema matches the spec's Data Model: six statuses, `paid_at` with both checks, `public_reference varchar(32)` without a format check (so `DEMO-0001` fits, A13), `order_items` snapshots (name, SKU, unit price) and a nullable `product_id` (`set null`). No spec amendment needed.
- **Status labels live in core** (`ORDER_STATUS_LABELS`); the storefront's `orderStatusLabel` now reads them, so the admin and the shopper's page cannot disagree. Same wording as before.
- **One status form per allowed transition, one `useActionState`** (`OrderStatusForm`): the result message sits outside the forms, so it stays visible after `refresh()` replaces the buttons with the new status's ones.
- **Stale change refreshes the page**: `runAdminAction` refreshes only on success, so `changeOrderStatus` calls `refresh()` itself after a `StaleOrderStatusError`; the page then shows the current status and its buttons (spec Edge Cases, "re-renders with the refund option only").
- **Confirmation tick is checked on the server too** (`confirm=yes` for cancel and refund), inside `runAdminAction` after `requireAdmin()`; a missing tick (only by editing the page) is a form-level error.
- **Invalid hidden values are one form-level message** ("This status change is not allowed."): the use case uses `safeParse` instead of `parseInput`, because field errors on hidden inputs would highlight nothing (the #43 lesson).
- **`orderId` is a plain string in the schema**, not `z.uuid()` as the spec's API Contracts say: a malformed id is answered as "Order not found." by the use case (`isUuid`), like every other admin record (intentional deviation, review of #50).
- **"Items" column = units** (sum of quantities), matching the cancel message "Stock was returned for N items".
- **No `clock` registration**: the spec lists it for Phase 3 (metric periods); lane B adds it with the dashboard.
- **E2E sign-in limit reset** (`e2e/support/sign-in.ts`): the first full gate failed only in `admin.e2e.test.ts` (sign-out test timed out at sign-in: the shared 20/min limit). The helper now clears `admin_rate_limits` in the throwaway e2e database before each sign-in; the limiter stays covered by the auth integration tests. Out of the strict Phase 1 scope, but every later e2e suite (lane B's dashboard) needs it.
- **#22's AC** already carried the A3 note; the run also listed the full transition table in it and linked this spec.

## Outcome

- Full gate green locally: lint, format:check, typecheck, test:coverage (100 %, 903+ unit tests), build, test:integration, test:e2e (11 files, 63 tests; the first run failed only on the shared sign-in limit, fixed by d456574).
- New integration suite `database-order-admin-repository.int.test.ts` (8 tests): list order and pagination, snapshots after rename and delete, stale and not-found, cancel restock in one transaction (and its rollback on failure), cancel racing `markPaid` (exactly one wins, 5 rounds), refund keeps `paid_at` and stock, E02 `paid_at` checks.
- E2E `admin-orders.e2e.test.ts` (3 tests): no-session redirect; storefront purchase → listed first → detail (snapshots, totals, customer, demo payment) → processing → shipped → only refund left; unpaid order cancelled → stock back to its old value.

## Progress

PR: #50

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Orders admin

- [x] 1.1 Reconcile with E02; add order-status and demo-order domain modules — 4c5ece7
- [x] 1.2 Port, repository adapter, unit and integration tests — a449a96
- [x] 1.3 Use cases, validator, container registrations — 9445615
- [x] 1.4 Admin pages, action, components, guard inventory, e2e — 9af9fbd
- [x] 1.5 Docs, #22 AC amendment, full gate — f71aed0, d456574

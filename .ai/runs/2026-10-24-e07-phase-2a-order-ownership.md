# E07 Phase 2a: order ownership rules (no visible change)

Source doc: .ai/specs/2026-10-24-customer-accounts.md
Engine: om-auto-create-pr (steps: 4, --loop: no)

## Goal

Put the A2 ownership rule in place before any account order can exist: the `orders_customer`
migration (nullable `customer_id`, `on delete restrict`, a `down` that refuses while account orders
exist, D-d), `canViewOrder` with a required `viewer` on every public reference path (order page,
payment page, `confirmDemoPayment`), the A15 cross-principal idempotency checks, and the admin
"Account order" / "Guest order" label. A no-op for shoppers: checkout still places guest orders only
(the app passes `customerId: null`); Phase 2b attaches orders to accounts. Part of #93, #94, #95, #96.
Refs #91.

## Scope

- `packages/database`: `orders.customer` relation, migration `orders_customer`, `DatabaseOrderRepository`
  writes and reads `customer_id`, `DatabaseOrderAdminRepository` returns `placedWithAccount`;
  integration tests (drift, FK, restrict, up → down → up, D-d refusal, A15 across principals).
- `packages/core`: `domain/orders/order-access.ts` (`OrderViewer`, `canViewOrder`), `OrderRecord.customerId`,
  `PlaceOrderCommand.customerId`, `PlaceOrderUseCase` input `customerId` and the A15 fingerprint and
  column check, required `viewer` on `GetOrderByReferenceUseCase` and `ConfirmDemoPaymentUseCase`,
  `placedWithAccount` in the admin DTOs; unit tests.
- `packages/app`: `toOrderViewer` in `require-customer.ts`; `load-order-page.ts` and `confirmDemoPayment`
  pass `toOrderViewer(await getCurrentCustomerId())`; `placeOrder` passes `customerId: null` (2b adds
  `checkoutAs`); the guard-inventory rule for public reference reads; the admin label; unit tests and
  the admin-orders e2e assertion.

## Non-goals

- Attaching orders to accounts, `checkoutAs`, the A24 checkout modes, "My orders" with data,
  `/api/account/orders[/<id>]`, `ListCustomerOrdersUseCase` / `GetCustomerOrderUseCase` /
  `CustomerOrderDto`, `listForCustomer` / `findForCustomer`, the not-found hint line, the isolation
  e2e (all Phase 2b), and the Phase 3 docs.

## Implementation Plan

### Phase 1: Order ownership rules

1. Schema: `orders.customer` (nullable, restrict, index `(customer_id, created_at)`), migration
   `orders_customer` with the D-d guarded `down`; integration tests (spec step 9).
2. Core ownership rules: `order-access.ts`, `customerId` on record and command, A15, required viewer,
   `placedWithAccount`; unit tests (spec step 10, ownership parts).
3. Repository: `placeOrder` writes `customer_id`, records carry it, admin `placedWithAccount`;
   integration tests incl. A15 across principals over the real repository (spec step 11, 2a parts).
4. Presentation: `toOrderViewer`, viewer on the order and payment pages and `confirmDemoPayment`,
   guest-only `placeOrder`, inventory rule, admin label; unit tests and e2e (spec step 12, 2a parts).

## Risks

- Schema migration on `orders` (additive, nullable column, no backfill). `down` refuses once account
  orders exist (forward-only fixes, D-d); before Phase 2b none can exist.
- Changed core signatures (internal exports, BACKWARD_COMPATIBILITY §3): every consumer updated here.

## Decisions and deviations

- `ListCustomerOrdersUseCase`, `GetCustomerOrderUseCase`, `CustomerOrderDto` and the repository's
  `listForCustomer` / `findForCustomer` (spec step 10 and 11) move to Phase 2b, where "My orders" and
  the API consume them; in 2a they would be unused code (the Phase 1 precedent for `toOrderViewer`).
- `DatabaseOrderRepository.placeOrder` already writes `customer_id` from the command in 2a (the
  A15 column check and `canViewOrder` need real data in the integration tests); the app passes `null`.

## Progress

PR: #102

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Order ownership rules

- [x] 1.1 Orders customer schema and migration — 58865be
- [x] 1.2 Core ownership rules — cca2c95
- [x] 1.3 Repository customer id and admin flag — 50490bc
- [x] 1.4 Presentation viewer, inventory rule and admin label — 054b63f

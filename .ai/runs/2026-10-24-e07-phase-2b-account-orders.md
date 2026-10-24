# E07 Phase 2b: account orders, My orders, API and the A↔B isolation proof

Source doc: .ai/specs/implemented/2026-10-24-customer-accounts.md
Engine: om-auto-create-pr (steps: 6, --loop: no)
Stacked on: feat/e07-phase-2a-order-ownership (#102)

## Goal

Orders placed while signed in attach to the customer's account, and checkout shows the mode the
order follows (A24): "Buying as <email>" with `checkoutAs=account`, or guest mode with the
sign-in link and the session-error banner. "My orders" lists and shows the customer's own
orders, `GET /api/account/orders[/<id>]` exposes them read-only, and the A↔B isolation e2e
proves on a page, an action and the API that A never reaches B's orders. Removes the Phase 1
interim copy ("Orders are not saved to your account yet…"). Closes #93, #94, #95, #96 and,
with the Phase 3 docs, #97. Refs #91.

## Scope

- `packages/core`: `CustomerOrderSummaryDto` / `CustomerOrderDto`, `ListCustomerOrdersUseCase`
  (cap 50, `capped`), `GetCustomerOrderUseCase` (malformed, unknown and foreign id give the same
  not found), port methods `listForCustomer` / `findForCustomer` (moved here from 2a).
- `packages/database`: `DatabaseOrderRepository.listForCustomer` / `findForCustomer`
  (`where customer_id = :customerId`), the repository isolation integration test.
- `packages/app`: checkout modes (A24) with `checkoutAs`, email prefill (A16), the
  `placeOrder` session handling, `/account/orders` with data, `/account/orders/<id>`,
  `GET /api/account/orders[/<id>]`, the not-found hint on reference pages, container wiring,
  unit tests, app integration test for a session-read failure during `placeOrder`.
- e2e: `customer-isolation.e2e.test.ts` (A↔B on page, API, public paths, action, cache, owner
  view), the signed-in purchase extension, `customer-auth.e2e` updated for the new copy, the owner
  session 401 on `/api/account/orders` (step 8, deferred from Phase 1).
- Phase 3 docs: AGENTS.md, README, BACKWARD_COMPATIBILITY.md, security notes §10, a lesson;
  the spec moves to `implemented/`.

## Non-goals

- No change to the owner instance, the stock writers, money, metrics or Copilot.
- No customer actions beyond reading (A5, N06).

## Implementation Plan

### Phase 1: Account orders

1. Core customer order read models and use cases (spec step 10, rest).
2. Repository `listForCustomer` / `findForCustomer` and the isolation integration test (step 11).
3. Checkout modes A24: `checkoutAs`, prefill, `placeOrder`, interim copy removed (step 12).
4. My orders pages, detail, API routes, not-found hint (step 12).
5. Isolation e2e and the signed-in purchase e2e (steps 13, 14).
6. Phase 3 docs (step 15).

## Risks

- Session-dependent pages must stay request-time (A23); the isolation e2e checks cache leaks.
- e2e auth budget: customers A and B come from the global setup; the one sign-out test signs in
  through the form first, so the setup's shared sessions are never ended.

## Decisions and deviations

- The A24 "session lost" outcome is `ActionState.code = "checkout_session_lost"`, returned before
  `runAction` (no request scope, no use case); the form switches itself to guest mode from that
  code, so no page refresh is needed and the switch works without JavaScript.
- The account mode adds "This order will appear under My orders." under "Buying as <email>".
- The account order detail shows the contact and address snapshot (the customer's own data) and
  links to the payment page for a pending order; no action buttons (A5).
- Not-found pages inside `<Suspense>` stream after the shell, so the page HTTP status is not the
  signal; the e2e asserts one shared status, one text and `noindex` for foreign, unknown and
  malformed ids. The API answers 404 with one body.
- Phase 3 docs landed here (small), so #97 closes too and the spec moved to `implemented/`.

## Progress

PR: #103

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Account orders

- [x] 1.1 Core customer order read models and use cases — b223c47
- [x] 1.2 Repository customer reads and isolation integration test — 1f3acb4
- [x] 1.3 Checkout modes A24 — f850c34
- [x] 1.4 My orders pages and API — c1ab0a5
- [x] 1.5 Isolation and purchase e2e — 6ada32e
- [x] 1.6 Phase 3 documentation — 372d40f

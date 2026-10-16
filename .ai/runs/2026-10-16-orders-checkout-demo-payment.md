# Run: cart and demo checkout, Phases 2 and 3 (orders, checkout, demo payment, confirmation, lookup)

- Date: 2026-10-16
- Brief: Implement Phases 2 and 3 (steps 6–13) of the cart and demo checkout spec in one PR: the orders schema, checkout with server-side price and stock validation, the clearly labelled demo payment, the confirmation and the rate-limited order lookup.
- Source doc: `.ai/specs/implemented/2026-10-15-cart-and-demo-checkout.md` (moved from `.ai/specs/` in this run: last phases)
- Issues: #29, #17, #18
- Branch: `feat/orders-checkout-demo-payment` (worktree `wt-b2`), from `origin/main` after #45
- Engine: om-auto-implement-spec → implemented directly following the om-auto-create-pr flow (steps: 8, --loop: no)

## Goal

A shopper checks out as a guest, the server prices the cart and decrements stock atomically in one transaction (the last unit sells once, a double submit gives one order), pays with a demo payment that charges nothing, sees a confirmation with a non-guessable reference, and can look the order up later. Lookups are rate-limited.

## Scope

- `core`: `domain/orders/order.ts` (statuses, `buildOrderDraft`, order conflicts, `cartFingerprint`), `order-reference.ts`, `validators/orders/checkout.schema.ts`, ports (`OrderRepositoryPort`, `PaymentGateway`, `RateLimiterPort`), `PlaceOrderUseCase`, `GetOrderByReferenceUseCase`, `ConfirmDemoPaymentUseCase`, in-memory fake.
- `database`: `Order`, `OrderItem`, `RateLimitBucket` entities, two migrations, `DatabaseOrderRepository`, `DatabaseRateLimiter`, unit and integration tests.
- `app`: container, `DemoPaymentGateway`, order crypto helpers, lookup limit, `order.action.ts`, `acceptCartChanges`, `runAction` (`redirectTo`, `refreshOnError`), checkout/payment/order/lookup pages and components, cart page checkout link, guard inventory.
- Docs: README (purchase flow, demo payment, limitations), BACKWARD_COMPATIBILITY (URLs, actions, schema), AGENTS.md (checkout decrement), spec notes and move, lessons.

## Decisions

See the spec's "Implementation notes: Phases 2 and 3". Highlights: cart re-check at placement reports corrections as `cart_changed`; `acceptCartChanges` fixes the stale-cookie loop; post-failure idempotency lookup in the use case; lookups counted on every read by reference; checkout decrements not recorded in `stock_adjustments`.

## Progress

- [x] 1 Core: order domain, references, schema, ports, use cases, unit tests — 15d13d4
- [x] 2 Database: entities, migrations (throwaway PostgreSQL 17 on port 55441), repository, limiter, unit + integration tests — c5448dc
- [x] 3 App: container, actions, pages, components, unit tests — 9d79ba7
- [x] 4 E2E: `checkout.e2e.test.ts`, `purchase.e2e.test.ts`, cart test updated
- [x] 5 Docs, spec notes, spec moved to `implemented/`, lessons
- [x] 6 Full validation gate
- [x] 7 PR

## Validation (local, final code)

See the PR description for the final numbers (lint, format, typecheck, unit coverage 100%, build, integration, e2e all exit 0).

## Outcome

Phases 2 and 3 implemented; the spec is fully implemented. The dev database and the main checkout were not touched. After merging, the user runs `npm run db:migrate` on the dev database (two new migrations).

## Follow-ups

- #22: cancel must restore stock with `update orders … where status = 'pending_payment'` in the same transaction.
- An additive `source` column on `stock_adjustments` if checkout decrements should appear in the stock history.
- A lazy expiry of unpaid orders or a checkout limit before any public hosting (A5).

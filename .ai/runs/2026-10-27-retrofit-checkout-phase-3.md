# Run: retrofit checkout, Phase 3 (payment, confirmation, not-found, lookup, status badges)

- Date: 2026-10-27
- Spec: `.ai/specs/2026-10-26-retrofit-checkout-cart.md`, section "Phase 3" (risk-high: checkout and orders)
- Branch: `feat/retrofit-checkout-phase-3` from `origin/main` 2301582 (Phases 1 and 2 merged as #134, #135)
- Worktree: `wt-checkout-p3`

## Approvals

- **OA-4 (status colours).** Approved by the owner for this run, with the mapping in C7. Implemented in `components/checkout/order-status-badge.ts`.
- **OA-5 (ErrorState titles and retry labels).** NOT approved in the repo or in this run's instructions. Not implemented. The pay page and the order page keep their current unavailable markup (`p role="alert"`). Their `ErrorState` needs the title and the "Try again" label first.
- Copy added without a separate approval: the sr-only loading label "Loading order" (named in the spec's Phase 3 table), and the existing texts moved into `checkout-copy.ts` ("Look up another order", "Look up an order", "Check the reference and try again.", "Find order" unchanged).

## Scope done

1. `orderStatusBadgeVariant(status)` with an exhaustive `Record<OrderStatus, BadgeVariant>` (pending_payment warning, paid success, processing secondary, shipped outline, cancelled destructive, refunded outline). Unit test covers every status. A new `OrderStatus` fails typecheck. `shipped` gets `font-semibold` in the component (the strong text).
2. Payment note is `Alert variant="demo"` with no role (C8).
3. Confirm test payment is `variant="action"` with `aria-busy` next to `disabled` (C1, B1.6). The server error is `Alert destructive role="alert"`.
4. Paid line is `Alert success role="status"` (E02 target). Pay and order links are `TextLink standalone`.
5. Pay page: `SkeletonGroup` "Loading order"; limited and not-payable states are `Alert warning role="alert"`.
6. Order page: `SkeletonGroup` "Loading order"; limited state `Alert warning role="alert"`.
7. Order not-found: `Empty` with the h1 inside `EmptyTitle`, description unchanged, outline link "Look up an order". `AccountOrderHint` stays after it. No reveal (A20).
8. Lookup: `Field`, `FieldLabel`, `Input` (font-mono kept), `FieldError`; the button stays default. Paragraph `max-w-prose`.
9. The storefront no longer imports `components/admin/form-feedback` in these files (C13).
10. Tests: `order-status-badge.test.ts` (new), `checkout-components.test.ts` updated (note has no role, pay button `bg-action` and `aria-busy`, lookup `aria-describedby`, paid status role, shipped strong text, Empty on not-found with one h1).
11. E2E: new `payment and order pages at 320 px` describe in `e2e/storefront-mobile.e2e.test.ts`: buys one mouse, checks pay, order, lookup and not-found pages for no sideways scroll, and the Confirm test payment button at least 44 px tall.
12. Storybook: `stories/storefront/payment.stories.tsx` (PaymentStep, Pending, ServerError, OrderPaid, OrderPending, StatusBadges, OrderNotFoundPage).
13. Docs: `EpicE02CartAndCheckout.mdx` retrofit list and `WhatIsMissing.mdx` E02-S03 row (prettier re-aligned the WhatIsMissing table).
14. Lesson added to `.ai/lessons.md`.

Not in this phase: OA-5 ErrorState on the pay and order unavailable states; the spec's manual "My orders" screenshot; the spec's manual 320/1440 px light and dark walk (see below).

## Decisions

- `shipped` strong text is a class in the component, not a second mapping. The status-to-variant mapping stays one function.
- The success branch of `PayFormView` was dropped: `confirmDemoPayment` redirects on success, so no success state reaches the view.

## Commands and results

| Command | Result |
|---|---|
| `npm run lint` | pass (0 errors; 2 warnings in `.ai/prototypes/ds`, not touched) |
| `npm run format:check` | pass (prettier re-formatted `WhatIsMissing.mdx`) |
| `npm run check:tokens` | pass (279 files) |
| `npm run check:agents` | pass (5 agent files) |
| `npm run typecheck` | pass |
| `npm run test:coverage` | pass: 194 files, 2161 tests; 100% statements, branches, functions, lines |
| `npm run build` | pass |
| `npm run test:integration` | pass: 24 files, 203 tests |
| `npm run test:e2e` (after build) | pass: 25 files, 145 tests |
| `npm run build-storybook` | pass (exit 0; chunk-size and base-ui sourcemap warnings only) |
| `npm run test:storybook:themes` | pass: 76 files, 374 tests (light and dark, a11y as errors) |
| `npm run test:hooks` | pass: 334/334 checks, 9 known gaps still open |

## Gaps

- Visual check at 320 px and 1440 px in light and dark: not done as a manual walk this run. Coverage is by e2e (no sideways scroll, 44 px button at 320 px) and Storybook theme tests.
- The not-payable and limited states on the pay page have no e2e (no easy path to a cancelled or rate-limited order). Covered by the unit tests of the pages' markup only indirectly; not tested.
- Screen-reader pass not done.
- OA-5 is open for the pay and order unavailable states.

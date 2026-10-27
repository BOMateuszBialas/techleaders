# Retrofit: checkout and cart to the design system (lesson 08, phase 2)

- Backlog: none yet. The stories are filed with `om-backlog` after the owner approves this spec (epic E02, `packages/app/stories/design-system/EpicE02CartAndCheckout.mdx`).
- Status: **draft for owner review (design-only PR). No application code is changed by this spec.** Written 2026-10-26 on `origin/main` at `59cfc48`. Implementation starts only after the owner answers the open questions (Q1 to Q12) and approves the items in "Owner approvals needed".
- Risk: **risk-high** for this spec PR and for implementation Phases 2 and 3 (the checkout is the money path: SDLC.md, "money"; the checkout also changes focus behaviour). Phases 1 and 4 are **risk-medium**.
- Baseline check: the request said storefront v2 phases 1, 2 and 4 are merged. On `main` only **Phase 1 (#120)** and **Phase 2 (#121)** are merged. Phase 3 (product technical data, migration) and Phase 4 (home sections, category images, migration) are not in `main`. This spec does not depend on Phases 3 and 4. Both PR titles still say "DO NOT MERGE"; the owner should confirm that is no longer the status.

## TLDR

- The checkout, the order pages and the cart still use hand-written markup for every state. The DS state primitives (`Field`, `Alert`, `Empty`, `ErrorState`, `SkeletonGroup`, `Badge`, `Card`, `TextLink`) exist on `main` since stage 2 and are used **nowhere on these screens**. `Button`, `Input` and `Label` are used, but the purchase steps use the default (graphite) variant and the `action` and `link` variants are unused there.
- The retrofit maps every element on these screens to one DS component and one rule, in four PRs, each shippable alone: 1 cart, 2 checkout form and summary, 3 payment step, confirmation and lookup, 4 storefront error page.
- The purchase colour (`action`) moves to the four purchase steps the owner named (Add to cart on the product page, Checkout in the cart, Place order, Confirm test payment). Remove becomes a link-style button.
- Business rules do not change: prices, stock, the cart fingerprint, the idempotency key, the checkout mode, the test-payment labelling and the order status rules stay as they are (section "Business rules kept").
- Changes that alter behaviour or add copy need the owner (OA-1 to OA-7). Everything else is markup and class changes that follow a rule the owner already approved.

## Decisions and assumptions

| # | Decision | Source | Built as |
|---|---|---|---|
| D1 | Each state on these screens uses its DS component, not a hand-written `<p role="alert">` or `<div class="animate-pulse">` | audit step 2 (checkout, cart), batch 2 Q4, batch 3 Q4 and Q3, B2.24 ("summary = `Alert`, field error = `FieldError`") | Section "Affected files", rule column |
| D2 | The purchase colour is `action` on the four purchase steps only; no other control on these screens is red | owner decision Q4 (2026-10-24, batch 1, "applied in the retrofit"); tokeny §7 rule 2; B1.12 | Phases 1, 2, 3 |
| D3 | Remove is a link-style button (`variant="link"`), not `ghost` | B1.16 | Phases 1 |
| D4 | Errors after an action use `Alert variant="destructive"` with `role="alert"`; success and status use `role="status"`; static notes have no role | B2.18 (owner decision Q4, batch 2: no default role) | Phases 1 to 3 |
| D5 | Empty states use `Empty` (left-aligned, outline or default action, never `action`) | B3.20 to B3.23; tokeny §7 rule 14 | Phases 1, 3 |
| D6 | Unavailable states use `ErrorState` (`Alert destructive`, fixed `role="alert"`), with a retry link to the same URL (works without JavaScript) | batch 3 Q4; E02 target "ErrorState with a retry action" | Phases 1 to 3 |
| D7 | Loading fallbacks use `SkeletonGroup` with a visible-to-screen-reader label; no `aria-label` on a plain `div` | B3.16 to B3.19; B3.18 | Phases 1 to 3 |
| D8 | Checkout fields use `Field`, `FieldLabel` (with `optional`), `Input`, `FieldError`; the server's messages stay as they are | B1.22, B1.23, B1.26; owner decision Q2 (batch 1, "(optional)" only) | Phase 2 |
| D9 | The focus moves to the first invalid field after a failed checkout submit | tokeny §7 rule 13; audit step 2 (focus stays on `body`) | Phase 2, owner approval OA-2 |
| D10 | Only the helper `fieldA11y` moves out of `components/admin/form-feedback.tsx` into a neutral module; the admin keeps its own components until the admin phase | Cross-area imports (checkout and cart import admin code today) | Phase 1 (module), Phase 2 (checkout) |
| D11 | No new DS primitive. Where a pattern has no DS component, it is listed in "What is missing" | the request; WhatIsMissing §3 | Section "What is missing" |
| AS-1 | "Shipping: free" and "Country: Poland" stay as they are; no delivery method exists (shipping is out of scope) | cart spec G5, G6; WhatIsMissing K5 | none |
| AS-2 | Money stays `formatMoney` from the server's values, format unchanged (P12 is open) | cart spec R04; tokeny §7 rule 1 | none |
| AS-3 | Every new string is listed in "Owner approvals needed" or is an existing string moved to a copy file | copy rule (WhatIsMissing P13) | Phases 1 to 4 |

## Problem statement

The shopper's money path (cart, checkout, payment, confirmation) is the part of the store where the design system matters most: one purchase colour, errors that say what to do, and status that is never colour alone. Today these screens:

- use the admin's `FieldError`, `FormMessage` and `fieldA11y` (`components/admin/form-feedback.tsx`) from the storefront (`checkout/checkout-form-view.tsx:3`, `cart/cart-line-view.tsx:3`, `cart/cart-drawer-line-view.tsx:4`, `cart/add-to-cart-view.tsx:2`);
- show the purchase CTAs in the neutral default colour (`checkout/checkout-form-view.tsx:154`, `checkout/order-forms-view.tsx:57`, `cart/cart-summary.tsx:59`, `cart/add-to-cart-view.tsx:73`), so the red purchase colour appears nowhere on the path;
- put the removal control in `ghost` style next to the `outline` Update button (`cart/cart-line-view.tsx:90`, `cart/cart-drawer-line-view.tsx:78`);
- show errors and notices as bare paragraphs with `role` set by hand (`checkout/checkout-form-view.tsx:78`, `cart/cart-drawer-view.tsx:42`, `app/(storefront)/cart/page.tsx:28`, `app/(storefront)/checkout/pay/[reference]/page.tsx:53`);
- use `animate-pulse` `div`s as loading states with an `aria-label` on a plain `div` (`app/(storefront)/cart/page.tsx:43-50`, `app/(storefront)/checkout/page.tsx:33-35`);
- lose focus to `body` after an empty checkout submit (audit, step 2).

## Goal

Move every element of the checkout, the payment step, the order pages (confirmation, not-found, lookup), the cart page, the cart drawer's line and its states, and the cart link onto the DS components and rules listed below. The result looks and reads as one system, keeps every behaviour the shopper has today (except the focus move, which needs approval), and keeps the e2e purchase flow green.

## Non-goals

- No business-rule change: server-side price and stock validation, the cart fingerprint and the idempotency key, the order status transition table (`packages/core/src/domain/orders/order-status.ts`), the stock writers, the checkout mode (E07 A24), the demo-payment rules (no card field, "Test payment. No money is taken.").
- No new DS primitive (section "What is missing").
- No change to the admin (`components/admin/*`, `admin/*`). Its `FormMessage`, `FieldError` and status badges stay until the admin phase of lesson 08.
- No change to "My orders" (`app/(storefront)/account/*`), sign-in or sign-up (E07 area; P10 and P11 are out of scope here). The shared `OrderSummary` and `OrderStatusBadge` change for every caller, so "My orders" will look the same as the confirmation page after Phase 3. That is intended and is listed in the risks.
- No new fields (no delivery method, no consent checkbox, no coupon, no tax line). No `Checkbox`, `RadioGroup` or `NativeSelect` is added to the checkout (see Q10 and Q11).
- No token changes. `globals.css` belongs to stage 1 and the `check:tokens` gate. If a new colour pair is needed, the phase stops and asks.
- No change to the cart header counter's shape or colour (pill, `bg-primary`, tokeny §8 P4).

## Existing rules this changes

Items marked **OA** need the owner's approval before the phase is merged. Items marked **record** follow an approved rule; the owner is told, not asked.

| # | Current behaviour (file:line) | After the retrofit | Rule | Approval |
|---|---|---|---|---|
| C1 | Purchase CTAs in `default` (graphite): Place order `checkout/checkout-form-view.tsx:154`; Confirm test payment `checkout/order-forms-view.tsx:57`; Checkout link `cart/cart-summary.tsx:59` (`buttonVariants()`); Add to cart on the product page `cart/add-to-cart-view.tsx:73` | `action` on those four. Add to cart in the product **card** (`components/catalog/product-card.tsx:30`) stays `outline` `sm` | owner Q4 (batch 1), tokeny §7 rules 1 and 2, B1.12 | **record** (owner decided it; this applies it) |
| C2 | Remove is `ghost` `sm`: `cart/cart-line-view.tsx:90`, `cart/cart-drawer-line-view.tsx:78` | `link` (text style, underline, same accessible name `Remove {name}`) | B1.16 | **record** |
| C3 | After an empty or invalid checkout submit, focus stays on `body` (audit) | Focus moves to the first field with an error | tokeny §7 rule 13; audit step 2 | **OA-2** (behaviour) |
| C4 | Server errors are `<p role="alert">` (`checkout/checkout-form-view.tsx:78`, `:146` via `FormMessage`) | `Alert variant="destructive" role="alert"` | B2.18, B2.24 | **record** (markup; text unchanged) |
| C5 | The cart-changed block is a grey `section` with `ul role="status"` (`cart/cart-changes.tsx:20-31`) | `Alert variant="warning" role="status"` with the title as its heading | E02 target, B2.18, tokeny §7 rule 10 (status not by colour alone) | **OA-3** (colour meaning changes: neutral to warning) |
| C6 | Accept button label "OK, update my cart" (`checkout/checkout-copy.ts:14`) | Label changes (Q2 recommendation: "Update my cart") | WhatIsMissing P9 | **OA-1** (copy) |
| C7 | Order status badge: `paid` is `secondary`, everything else `outline` (`checkout/order-forms-view.tsx:41`) | Mapping from tokeny §7 rule 10 (`pending_payment` warning, `paid` success, `processing` secondary, `shipped` outline with strong text, `cancelled` destructive, `refunded` outline). One mapping, a pure function with a unit test | tokeny §7 rule 10 and §8 P2 (accepted 2026-10-24) | **OA-4** (visible colour on the confirmation page; the admin keeps its own mapping until the admin phase, see Q4) |
| C8 | The payment note is `<p role="note">` with `--demo` classes (`checkout/order-forms-view.tsx:29-34`) | `Alert variant="demo"` with no role; same text | B2.18 (static note: no role), tokeny §7 rule 11 | **record** |
| C9 | Unavailable states are bare paragraphs (`cart/cart-drawer-view.tsx:42`, `app/(storefront)/cart/page.tsx:28`, `checkout/page.tsx:48`, `pay/page.tsx:53`, `orders/page.tsx:40`) | `ErrorState` with a retry link to the same URL (no JavaScript needed). Titles are new copy | batch 3 Q4, B3.24 | **OA-5** (new titles and the retry label) |
| C10 | No `error.tsx` in `app/(storefront)/`: a database error shows Next's default page | A store-level `error.tsx` built on `ErrorState` | WhatIsMissing P18 | **OA-6** (new file, new copy) |
| C11 | `checkout-form.tsx` is a client wrapper with no effect; unit tests render it on the server | A focus effect in the wrapper needs a coverage decision (the repo has no DOM test environment) | AGENTS.md coverage rule | **OA-7** (exclusion with reason, or the alternative in Q1) |
| C12 | "(optional)" is typed into the label text (`checkout/checkout-form-view.tsx:51`) | `FieldLabel optional` prints the same text | owner Q2 (batch 1) | **record** |
| C13 | Checkout, cart and drawer import `FieldError`, `FormMessage` and `fieldA11y` from `components/admin/form-feedback.tsx` | `fieldA11y` moves to `lib/field-a11y.ts`; the admin file re-exports it. Storefront files import DS components | boundary (storefront must not depend on admin UI) | **record** |

## Rule index (sources for the IDs used below)

| ID | Rule | Where it is written |
|---|---|---|
| B1.6 | Pending button: `aria-busy` keeps the variant colour; text stays in place; no spinner | `.ai/design/POSTEP.md`, stage 2 batch 1 table |
| B1.12 | `action` only on purchase actions (Add to cart, Checkout, Place order, Pay) | POSTEP batch 1 table; owner Q4 (batch 1) |
| B1.16 | `link` variant for an action that looks like a link (Remove) | POSTEP batch 1 table |
| B1.18 | `TextLink` for in-text navigation links | POSTEP batch 1 table |
| B1.22, B1.23, B1.26 | `Field` parts; `FieldError` without `role`; part order: label, control, hint, error | POSTEP batch 1 table; owner Q2 (batch 1) |
| B2.18 | `Alert` has no default role; the place sets it (`alert`, `status`, or none for a static note) | POSTEP batch 2 table; owner Q4 (batch 2) |
| B2.24 | Form summary is an `Alert`; field errors are `FieldError` | POSTEP batch 2 table ("in the retrofit, Alert") |
| B3.16 to B3.19 | `SkeletonGroup` with a label; the skeleton takes the size of what it replaces; no variants | POSTEP batch 3 table; owner Q3 (batch 3) |
| B3.20 to B3.23 | `Empty` is left-aligned, has a next step, never uses `action` for its button | POSTEP batch 3 table; `components/ui/empty.tsx` header |
| B3.24 | `ErrorState` on `Alert variant="destructive"`, fixed `role="alert"`, title and description required | POSTEP batch 3 table; owner Q4 (batch 3) |
| E02 target | The "Target after the retrofit" column and "Retrofit (lesson 08)" list | `packages/app/stories/design-system/EpicE02CartAndCheckout.mdx` |
| T1 | Price never in the action colour; price in `--foreground`, semibold, `tabular-nums` | tokeny §7 rule 1 |
| T2 | Action colour only on buying steps; at most one red button in view | tokeny §7 rule 2 |
| T5 | Error is text plus icon plus `aria-invalid`, never a filled red button | tokeny §7 rule 5 |
| T9 | Store text on a phone at least 16 px; text never below 12 px | tokeny §7 rule 9 |
| T10 | Status never by colour alone; badge always has text | tokeny §7 rule 10; tokeny §8 P2 |
| T11 | Demo is `--demo`, never `--warning` | tokeny §7 rule 11 |
| T12 | Control outline `--input` (3 : 1) | tokeny §7 rule 12 |
| T13 | Focus is visible with a 2 px offset; after a failed submit focus goes to the first invalid field | tokeny §7 rule 13 |
| T14 | A disabled control has a visible reason next to it | tokeny §7 rule 14 |
| T15 | Continuous text at most 65 characters (`max-w-prose`) | tokeny §7 rule 15 |
| T16 | Touch targets at least 44 px on a phone in the store | tokeny §7 rule 16 |
| P-items | Open items in `WhatIsMissing.mdx` §4, quoted as P1 to P23 | `packages/app/stories/design-system/WhatIsMissing.mdx` §4 |
| audit | Findings in `.ai/design/audyt.md`, quoted as "audit" with the step | `.ai/design/audyt.md` |

Note on IDs: `tokeny §8 P2` (order status mapping) and `WhatIsMissing P2` (typed values stay after a failed submit) are different items with the same number. This spec always writes the document name.

## Affected files

Line numbers are on `origin/main` at `59cfc48`. The "Rule" column names the DS component and the rule ID. Where a file has a line that does not change, it is not listed.

### Phase 1: cart (risk-medium)

| File | Current (line) | Change | Component and rule |
|---|---|---|---|
| `components/cart/cart-summary.tsx` | empty block `:30-36` (plain `<p>` and link `:32-33`) | `Empty`: title "Your cart is empty.", outline link "Browse all products" | `Empty`, B3.20 to B3.23, T2 |
| `components/cart/cart-summary.tsx` | Checkout link `:58-62`, `buttonVariants()` on `:59` | `buttonVariants({ variant: "action" })` | `Button action`, C1, T2 |
| `components/cart/cart-changes.tsx` | `section` `:20-23`, `ul role="status"` `:27`, accept button `:33-35` | `Alert variant="warning" role="status"`; `AlertTitle` holds the heading; button stays `outline` `sm` (it is not a purchase step) | `Alert`, C5 (OA-3), B2.18 |
| `components/cart/cart-line-view.tsx` | quantity `Label` `:60-63`, `Input` `:64-75` (`className="w-20"`), Update `:77-79` | `Field` and `FieldLabel` around the existing `Label` text; `Input` unchanged; Update stays `outline` | `Field`, B1.22, B1.26 |
| `components/cart/cart-line-view.tsx` | `FieldError` `:81` and `FormMessage` `:82` (admin) | DS `FieldError` (with `id`); the line message becomes an `Alert`: error `destructive` `role="alert"`, success `success` `role="status"` (through `lineMessage`, unchanged logic) | `FieldError`, `Alert`, B1.23, B2.18 |
| `components/cart/cart-line-view.tsx` | Remove `:86-97`, `variant="ghost"` `:90` | `variant="link"`; `aria-label` `Remove {name}` kept | `Button link`, C2, B1.16 |
| `components/cart/cart-drawer-line-view.tsx` | import `:4` (admin); remove `:74-85`, `variant="ghost"` `:78`; error and message `:87-88` | DS `FieldError` and `Alert`, as in the line above; Remove `link`. The "−" and "+" steppers (`:47-72`) stay | `Button link`, `Alert`, `FieldError` |
| `components/cart/cart-drawer-view.tsx` | unavailable `:39-46` (`p role="alert"`); notice `:51-55` (`p role="status"`); empty `:57-63` | `ErrorState` (action: the existing "View full cart" link); notice as `Alert variant="success" role="status"`; empty as `Empty` (outline "Shop all products") | `ErrorState`, `Alert`, `Empty` |
| `components/cart/cart-link.tsx` | link classes `:22` (border, `px-3 py-1`, `hover:bg-muted`) | `buttonVariants({ variant: "outline", size: "sm" })` on the same `Link`; the count pill `:28` keeps its classes | `Button outline sm`, T1 |
| `components/cart/add-to-cart-view.tsx` | submit `Button` `:73` (`default`); quantity `FieldError` `:69` (admin); `FormMessage` `:77` (admin) | Submit takes a `variant` prop: product page `action`, product card `outline` `sm`; `aria-busy={pending}` added next to `disabled={pending}`; `FieldError` and the success message from the DS | `Button`, C1 (owner Q4), B1.6, `Alert success role="status"` |
| `components/catalog/product-card.tsx` | `AddToCart` `:30` | passes `variant="outline"` and `size="sm"` (owner Q4) | C1 |
| `app/(storefront)/products/[slug]/page.tsx` | `AddToCart` `:54` | passes `variant="action"` | C1 |
| `app/(storefront)/cart/page.tsx` | skeleton `:43-50` (raw `div`s, `aria-label` on a `div`); unavailable `:26-31` (`p role="alert"`) | `SkeletonGroup label="Loading cart"` with two `Skeleton` rows sized to a cart line; `ErrorState` with a retry link to `/cart` | `SkeletonGroup`, `ErrorState`, B3.16 to B3.19, B3.24 |
| `components/cart/cart-copy.ts` | `CART_UNAVAILABLE_MESSAGE` `:18-19` | new titles and button labels added here, not inline | copy rule (AS-3) |
| new `lib/field-a11y.ts` | none | `fieldA11y` moved from `components/admin/form-feedback.tsx` (`:38-49`); the admin file re-exports it | C13, D10 |
| `components/cart/*.test.ts`, `app/(storefront)/cart/*.test.ts` | string checks (`role="alert"`, `Remove`) | updated to the new markup; new assertions for `action` and `link` | unit tests |
| `e2e/cart.e2e.test.ts:52`, `e2e/cart-drawer.e2e.test.ts:119` | `clickRole("button", "Remove …")` | `clickRole("link", "Remove …")` | C2 |

### Phase 2: checkout form and order summary (risk-high)

| File | Current (line) | Change | Component and rule |
|---|---|---|---|
| `components/checkout/checkout-form-view.tsx` | import admin `:3`; `FIELDS` `:45-57` (`Address line 2 (optional)` at `:51`) | `FIELDS` keeps names and autocomplete; the label text becomes `label` plus `optional` flag (renders "(optional)") | `FieldLabel optional`, C12 |
| `components/checkout/checkout-form-view.tsx` | per-field `div` and `Label` `:128-129`, `Input` `:130-138`, `FieldError` `:139` | `Field` per field: `FieldLabel`, `Input` (with `fieldA11y`), `FieldError` (rendered only when messages exist) in that order | `Field`, B1.22, B1.23, B1.26, T12 |
| `components/checkout/checkout-form-view.tsx` | session-lost `p role="alert"` `:77-80` | `Alert variant="destructive" role="alert"` | C4, B2.18 |
| `components/checkout/checkout-form-view.tsx` | `FormMessage` `:146` (admin, error alert) | `Alert variant="destructive" role="alert"` with `state.message`; hidden when session-lost (as today) | C4, B2.24 |
| `components/checkout/checkout-form-view.tsx` | `Country:` text `:143-145` | unchanged (AS-1; Q10) | none |
| `components/checkout/checkout-form-view.tsx` | conflict link `:147-151`, sign-in link `:84-86` | `TextLink` (inline) for both; "Review your cart" keeps its copy | `TextLink`, B1.18 |
| `components/checkout/checkout-form-view.tsx` | Place order `Button` `:153-157` (`default`) | `variant="action"`; `aria-busy={pending}` next to `disabled={pending}` (P3: double submit stays blocked) | `Button action`, C1, B1.6, T2 |
| `components/checkout/checkout-form.tsx` | wrapper `:11-13` | focus effect for C3: after a result with field errors, focus the first field with `aria-invalid="true"` (through the pure helper `firstInvalidFieldId`, Phase 2 new module) | C3 (OA-2), T13, C11 (OA-7) |
| new `components/checkout/first-invalid-field.ts` | none | pure function: given the field order and the `fieldErrors` object, returns the first field id with messages, or `null`. Unit tested | C3 |
| `components/checkout/checkout-copy.ts` | `:14` ACCEPT label (Phase 1 changes it) | none in Phase 2 | C6 |
| `components/checkout/order-summary.tsx` | `section` `:22-26` (`rounded-lg border p-4`) | `Card` with `CardContent` around the `section` (`aria-label="Order summary"` kept); the list `:27-40` and the `dl` `:41-52` unchanged; the total keeps `font-semibold` and is not red | `Card`, B2.25 (cards), T1 |
| `app/(storefront)/checkout/page.tsx` | fallback `:32-36` (`h-64` `div`, `aria-label`) | `SkeletonGroup label="Loading checkout"` with `Skeleton` blocks sized to the form | `SkeletonGroup`, B3.16 to B3.19 |
| `app/(storefront)/checkout/page.tsx` | unavailable `:46-51` (`p role="alert"`) | `ErrorState` with a retry link to `/checkout` (C9, OA-5) | `ErrorState`, B3.24 |
| `app/(storefront)/checkout/page.tsx` | "Review your cart" `:61-63` | `TextLink` | B1.18 |
| `lib/field-a11y.ts` | from Phase 1 | used by the checkout | D10 |
| `components/checkout/checkout-components.test.ts` (332 lines) | text and role checks | updated; new checks for `Field` order, `action`, the session-lost alert | unit |
| `components/checkout/first-invalid-field.test.ts` | none | new: returns the first invalid id in field order; `null` with no errors; ignores unknown names | unit, 100% |
| `e2e/checkout.e2e.test.ts` | role and text checks | one new check: after an empty submit, `document.activeElement` is `#checkout-customerName` (OA-2) | e2e |

### Phase 3: payment step, confirmation, not-found and lookup (risk-high)

| File | Current (line) | Change | Component and rule |
|---|---|---|---|
| `components/checkout/order-forms-view.tsx` | `PaymentTestNote` `:27-36` (`p role="note"`, `--demo` classes) | `Alert variant="demo"` with no role; text `PAYMENT_TEST_NOTE` unchanged | `Alert demo`, C8, T11, B2.18 |
| `components/checkout/order-forms-view.tsx` | `OrderStatusBadge` `:39-43` (`paid` vs the rest) | mapping per C7 (one pure function `orderStatusBadgeVariant(status)` with an exhaustive `Record<OrderStatus, BadgeVariant>`, so a new status fails typecheck) | `Badge`, T10, C7 (OA-4) |
| `components/checkout/order-forms-view.tsx` | `PayFormView` button `:57-59` (`default`) | `variant="action"`; `aria-busy={pending}` with `disabled={pending}` | `Button action`, B1.6, T2 |
| `components/checkout/order-forms-view.tsx` | `LookupFormView` `:66-90`: label `:71`, input `:72-81`, error `:82`, button `:85-87` | `Field` with `FieldLabel`, `Input` (`font-mono` kept), `FieldError`; button stays `default` (not a purchase step) | `Field`, B1.22, B1.23 |
| `components/checkout/order-details.tsx` | paid line `:42-44` (`p`, `font-medium`) | `Alert variant="success" role="status"` with `PAID_WITH_TEST`; the `h1` (`:23-25`) keeps `PAID_HEADING` | `Alert success`, B2.18, E02 target |
| `components/checkout/order-details.tsx` | pay link `:45-52`, lookup link `:53-55` (hard-coded English text `:54`) | `TextLink`; the lookup text moves to `checkout-copy.ts` (same words) | `TextLink`, B1.18 |
| `app/(storefront)/checkout/pay/[reference]/page.tsx` | fallback `:33-37` (`h-48` `div`) | `SkeletonGroup label="Loading order"` | B3.16 |
| same file | unavailable `:51-56`; limited `:58` (`p role="alert"`); not payable `:75-77` (`p role="alert"`) | unavailable: `ErrorState` (retry link to the same URL); limited: `Alert variant="warning" role="alert"`; not payable: `Alert variant="warning" role="alert"` | `ErrorState`, `Alert warning`, E02 target |
| `app/(storefront)/orders/[reference]/page.tsx` | fallback `:23` (`h-64` `div`); unavailable `:38-43`; limited `:45` | `SkeletonGroup label="Loading order"`; `ErrorState` with retry link; limited `Alert warning role="alert"` | `SkeletonGroup`, `ErrorState`, `Alert` |
| `app/(storefront)/orders/[reference]/not-found.tsx` | `h1` `:13`, text `:14`, hint `:15`, link `:16-18` | `Empty`: title (the `h1` inside `EmptyTitle`, so the page keeps one `h1`), description "Check the reference and try again.", outline link "Look up an order"; `AccountOrderHint` stays right after `Empty` unchanged | `Empty`, B3.23; E07 A2/A8 (no reveal) |
| `app/(storefront)/checkout/pay/[reference]/not-found.tsx` | re-exports the order not-found | no change | none |
| `app/(storefront)/orders/lookup/page.tsx` | paragraph `:13-15` (no measure) | `max-w-prose` (audit: 84 characters on one line at 1440 px) | T15 |
| `components/checkout/checkout-components.test.ts` | text and role checks for the note, the badge and the pay button | updated; new checks: `bg-action` on the pay button; the note has no `role` | unit |
| `components/checkout/order-status-badge.test.ts` (new) | none | the mapping for all statuses; the exhaustive `Record` is the typecheck guard | unit, 100% |

### Phase 4: store error page (risk-medium, owner decision P18)

| File | Current | Change | Component and rule |
|---|---|---|---|
| `app/(storefront)/error.tsx` (new) | none (audit: a database error shows Next's default page) | client error boundary with `ErrorState` (title, description, a "Try again" button that calls `reset()`, and a link "Browse all products" to `/products`) | `ErrorState`, B3.24, C10 (OA-6) |
| `components/storefront/storefront-error-view.tsx` (new) | none | the hook-free view (title, description, action) so a unit test renders every state without the boundary | unit |

The boundary sits under the storefront layout, so the header and footer stay visible; the admin keeps its own `error.tsx`.

## Phases (one PR each, each shippable alone)

Each phase is one PR with the full gate. The order is fixed by dependencies: Phase 1 creates `lib/field-a11y.ts`, which Phases 2 and 3 use. Phase 4 has no dependency on the others and can move earlier if the owner prefers.

### Phase 1: cart and cart drawer (risk-medium)

Steps:
1. Create `lib/field-a11y.ts` and make the admin `form-feedback.tsx` re-export `fieldA11y` (no admin behaviour change).
2. Cart page: `SkeletonGroup`, `ErrorState` with the retry link (copy from OA-5).
3. Cart summary: `Empty` for the empty cart; Checkout as `action`.
4. Cart changes: `Alert warning role="status"` (OA-3, OA-1 label).
5. Cart line and drawer line: `Field` for the quantity, DS `FieldError`, `Alert` for the line message, Remove as `link`.
6. Drawer: `ErrorState`, `Alert` for the notice, `Empty`.
7. Header cart link as `buttonVariants` outline `sm` (see the `cart-link.tsx` row in "Affected files"; no open question).
8. Add to cart: variant prop (action on the product page, outline `sm` in the card), `aria-busy`, DS `FieldError` and `Alert`.
9. Update the unit tests and the two e2e selectors (`Remove` as a link). Add the Storybook stories: `CartLine` and `CartSummary` with the states default, empty, changed, unavailable (under `packages/app/stories/`, not in a dot-directory).
10. Update `EpicE02CartAndCheckout.mdx` (the cart rows) and `WhatIsMissing.mdx` §2 (E02 cart rows).

Acceptance (Phase 1):
- A1. On `/products/[slug]` the Add to cart button carries the action colour (`bg-action`); in the product card it is `outline`, `sm`. Both are the same component, one prop.
- A2. The cart's Checkout link is `action`; Update is `outline`; Remove is `link`. Remove keeps the accessible name `Remove {product name}`.
- A3. An empty cart shows `Empty` with the title "Your cart is empty." and an outline "Browse all products" link. The drawer's empty state keeps "Shop all products".
- A4. The cart-changed block is an `Alert` of variant `warning` with `role="status"`, its heading is the `h2`-level title, the notices are a list, and the accept button still stores the corrected cart (behaviour unchanged, e2e cart tests pass).
- A5. An unreadable cart shows `ErrorState` with a retry link to `/cart`; the drawer's unreadable cart shows `ErrorState` with "View full cart".
- A6. The loading fallback of the cart page is a `SkeletonGroup` with the label "Loading cart" (one `role="status"`), and no `aria-label` sits on a plain `div`.
- A7. Quantity errors render under the quantity input with `aria-describedby` and `aria-invalid`; the line message is an `Alert` with `role="alert"` for errors and `role="status"` for success.
- A8. No price, total or stock value is computed in a component (all from the server's `PricedCart`; no change in `packages/core`).

Tests (Phase 1):
- Unit (100% coverage): `cart-components.test.ts`, `cart-drawer.test.ts`, `cart-drawer-state.test.ts` updated; new `field-a11y.test.ts` (the moved helper: invalid and valid, with hints).
- E2E: `cart.e2e.test.ts` and `cart-drawer.e2e.test.ts` (Remove as link, same names); `purchase.e2e.test.ts` unchanged (must pass as is); `storefront-mobile.e2e.test.ts` extended: at 320 px, no sideways scroll on `/cart` and on the drawer, and Update, Remove, Checkout at least 44 px tall (T16).
- Storybook: `test:storybook:themes` for the new stories in light and dark.
- Manual: keyboard Tab through a cart with two lines (focus ring visible, Enter on Remove removes the line).

### Phase 2: checkout form and order summary (risk-high)

Steps:
1. `Field` per control (C12 and C4), `FieldError` only with messages, `aria-invalid` and `aria-describedby` from `fieldA11y`.
2. The session-lost and server error alerts (C4).
3. Place order `action` with `aria-busy` (C1, B1.6).
4. Focus after a failed submit: `firstInvalidFieldId` pure helper plus a one-effect call in `checkout-form.tsx` (C3, OA-2, OA-7; Q1).
5. `Card` around the order summary; no other change in the summary (T1).
6. Loading and unavailable states on the checkout page (C9, OA-5).
7. Conflict and sign-in links as `TextLink`.
8. Update the checkout unit tests and the checkout e2e (new focus check). Add the Storybook stories: `CheckoutForm` (default, field errors, server error, session lost, conflict, pending) and `OrderSummary`.
9. Update the EpicE02 and WhatIsMissing rows for checkout.

Acceptance (Phase 2):
- A9. Every control on the checkout is inside a `Field`; the order of parts is label, control, hint, error (B1.26). The "(optional)" text appears for "Address line 2" only.
- A10. Each error appears under its field, once. The server's messages are unchanged (`checkout-components.test.ts` strings for postal code and email stay).
- A11. After a failed submit with field errors, focus moves to the first invalid field in the form's order (`#checkout-customerName` for an empty name). With no field errors (a conflict or a server error), focus stays where the browser puts it and the top alert is shown.
- A12. Place order is `action` and shows "Placing order…" while pending; it stays disabled while pending (one submit per click, P3).
- A13. Typed values stay in the form after a failed submit (today's `fieldDefault` behaviour, WhatIsMissing P2).
- A14. Session-lost and conflict states show the same text and links as today; the form still never places a guest order silently (E07 A24).
- A15. No hidden field, no request field and no server call changed (`idempotencyKey`, `cartFingerprint`, `expectedTotalMinor`, `shippingCountry`, `checkoutAs`).

Tests (Phase 2):
- Unit (100% coverage): `checkout-components.test.ts` updated; `first-invalid-field.test.ts` (new): first invalid in order; none; unknown names ignored; empty `fieldErrors` object.
- E2E: `checkout.e2e.test.ts` (existing checks pass; new focus check after an empty submit; the 320 px check: no sideways scroll on `/checkout` with the form and the summary stacked).
- E2E: `purchase.e2e.test.ts` unchanged (must pass).
- Keyboard: Tab through all fields and the Place order button; the focus ring is visible on every control (T13); Enter submits.
- Contrast: no new colour pair; `npm run check:tokens` stays green.

### Phase 3: payment step, confirmation, not-found and lookup (risk-high)

Steps:
1. The demo payment note as `Alert demo` (C8).
2. The status mapping function and the badge (C7, OA-4).
3. Confirm test payment `action` with `aria-busy` (C1, B1.6).
4. The paid line as `Alert success role="status"` (E02 target).
5. Pay page and order page: `SkeletonGroup`, `ErrorState` (retry link), `Alert warning` for the limited and not-payable states.
6. The order not-found page as `Empty` (no reveal, E07 A2/A8).
7. The lookup form as `Field`; the lookup paragraph `max-w-prose`.
8. Update tests and e2e (`purchase.e2e.test.ts` payment checks; the "My orders" account checks, which reuse the shared components). Add the Storybook stories: `PaymentStep` (default, not payable, limited), `OrderDetails` (pending, paid, not found), `OrderStatusBadge` (all six statuses).
9. Update the EpicE02 and WhatIsMissing rows.

Acceptance (Phase 3):
- A16. The payment page shows one note, the summary and one button; no card field; the note reads "Test payment. No money is taken."; the button reads "Confirm test payment" and is `action`.
- A17. A paid order at `/checkout/pay/[reference]` still redirects to the order page; a non-payable order shows the warning alert and no button.
- A18. Each order status shows its text and a badge variant from the mapping; no status is conveyed by colour alone. The mapping covers every `OrderStatus` value (the typecheck fails if one is missing).
- A19. The order page after payment shows the success alert with the test-payment line; the heading text is unchanged.
- A20. A reference that does not exist, is malformed, or belongs to another customer shows the same "No order found with this reference" page (`Empty`), with the same status (no reveal).
- A21. The lookup field has a visible label, and its error is shown under it.

Tests (Phase 3):
- Unit (100% coverage): `order-status-badge.test.ts` (all statuses; `Record` exhaustive); `checkout-components.test.ts` updated for the note, badge and pay button.
- E2E: `purchase.e2e.test.ts` and `checkout.e2e.test.ts` payment checks (unchanged text, roles updated where the role changes); `customer-isolation.e2e.test.ts` (A/B isolation: "not found" identical; must stay green); `customer-roles.e2e.test.ts` (must stay green).
- E2E at 320 px: `/checkout/pay/[reference]`, `/orders/[reference]`, `/orders/lookup`: no sideways scroll; Confirm test payment at least 44 px tall.
- Manual: the "My orders" page after Phase 3 shows the same status colours as the confirmation page (the shared component); record a screenshot in the PR.

### Phase 4: store error page (risk-medium)

Steps:
1. `storefront-error-view.tsx` (hook-free view) and `app/(storefront)/error.tsx` (client boundary calling `reset()`).
2. Copy from OA-6.
3. Unit test for the view (all states: with and without a retry; the title and description are required).
4. Update `WhatIsMissing.mdx` §2 "Every page error" row for the store.

Acceptance (Phase 4):
- A22. A failed render in the storefront shows the store header and footer with `ErrorState`, one `h1`, a "Try again" button that calls `reset()`, and a link to `/products`.
- A23. The error view contains no stack trace, no error message from the server and no database detail (AGENTS.md security rule).

Tests (Phase 4):
- Unit (100% coverage): the view test. The boundary file itself is a Next.js error component and is excluded from coverage only if the repo's exclusion list already covers `error.tsx` (see Q6; if not, OA-7 applies).
- E2E: none can force a database error without a test hook. Manual verification steps: stop the database container, load `/products`, confirm the store error page with the header, then restart the database and press "Try again". Record the steps in the PR.

## Business rules kept (no change)

- Prices, totals and stock come from the server (`PricedCart`, `order.items` snapshots). The client never sends a price (`expectedTotalMinor` stays a check, not a price).
- The hidden fields `idempotencyKey`, `cartFingerprint`, `expectedTotalMinor`, `shippingCountry` (`PL`) and `checkoutAs` are unchanged (`checkout-form-view.tsx:119-123`).
- The checkout redirects an empty cart to `/cart` (`checkout/page.tsx:55`); a changed cart shows the changes first and blocks checkout.
- Checkout is for a confirmed customer session or a guest; a session that could not be read never becomes a silent guest order (E07 A24).
- The demo payment: no card or payment field exists; the note says no money is taken; the button says "Confirm test payment"; the status moves to `paid` only through the payment flow (`markPaid`).
- The pay page for a non-payable order shows no button; a paid order redirects to the order page.
- "Free" shipping and "Poland" as the only country stay (AS-1).
- Not-found pages reveal nothing (E07 A2, A8).
- The `Remove {name}` accessible name and the quantity label stay (screen-reader names).
- Money is formatted by `formatMoney`; the format is not changed here (P12, Q12).

## UI/UX and states (after the retrofit)

| Screen | Loading | Empty | Error (unavailable) | Error (after action) | Success / status |
|---|---|---|---|---|---|
| Cart page | `SkeletonGroup` "Loading cart" | `Empty` "Your cart is empty." + outline link | `ErrorState` + retry link | n/a (line messages) | cart changed `Alert warning role=status`; line "Removed from your cart." `Alert success role=status` |
| Cart drawer | the drawer opens with the cart from the server (no skeleton; unchanged) | `Empty` "Your cart is empty." + outline "Shop all products" | `ErrorState` + "View full cart" | line `Alert destructive role=alert` | notice `Alert success role=status` |
| Checkout | `SkeletonGroup` "Loading checkout" | n/a (redirect to `/cart`) | `ErrorState` + retry | `Alert destructive role=alert`, field errors | n/a (navigates to the payment step) |
| Payment step | `SkeletonGroup` "Loading order" | n/a | `ErrorState` + retry | not payable: `Alert warning role=alert`; limited: `Alert warning role=alert` | n/a |
| Order page | `SkeletonGroup` "Loading order" | n/a | `ErrorState` + retry | limited: `Alert warning` | paid: `Alert success role=status` |
| Order not found | n/a | `Empty` "No order found with this reference" + "Look up an order" | n/a | n/a | n/a |

All "Try again" and retry actions are links to the same URL, so they work without JavaScript (the link is a navigation, B1.18). The retry labels are new copy (OA-5).

## Accessibility

- Focus: after a failed checkout submit, focus moves to the first invalid field (OA-2). Without JavaScript, the top `Alert` is the only signal, as today; the per-field messages still show.
- Errors: `aria-invalid` and `aria-describedby` on each input; `FieldError` has an id and the icon; the colour is never the only signal (T5, T10).
- Status: `role="status"` for success and for the cart-changed block; `role="alert"` for errors after an action and for the unavailable states; no role for static notes (B2.18). Only one `role="alert"` per form on the checkout (the existing test asserts this, `checkout-components.test.ts:217`).
- Targets: at least 44 px on a phone in the store for Place order, Confirm test payment, Update, Remove, Checkout, and the drawer's "−" and "+" (T16). The drawer's icon buttons are `icon-sm` (32 px) today: see Q9.
- Names: "Remove {name}" and the quantity label "Quantity of {name}" keep their accessible names.
- Motion: none added. The skeleton pulse is the only loop and stops under reduced motion (tokeny §5).
- Language: the copy stays English; P13 (sentence case) is accepted (see the P items table).

## Edge cases and failure scenarios

- The cart changes while the checkout is open: the form stays hidden behind the changes list and the "Review your cart" link (unchanged).
- A conflict (stock or price) after Place order: the `Alert` shows the server's message and the "Review your cart" `TextLink`; no field error; focus does not move (no field to focus).
- A session that cannot be read on checkout: the mode line shows the banner in `Alert destructive role="alert"` and the form posts as guest only when the shopper submits again with the banner shown (E07 A24, unchanged).
- A 320 px phone: the cart line stacks (`sm:flex-row` today); the drawer is full width; the checkout grid stacks (`md:grid-cols-checkout` today). The check is in Phase 1 and 2 e2e.
- A long product name in a cart line: `wrap-anywhere` on the name and no fixed width on the line (unchanged).
- Dark theme: every new `Alert` uses its token pair (`success`, `warning`, `destructive`, `demo`), which the DS already checked in both themes. The `action` button is never placed in `Empty` (B3.20).

## Screen IDs

Screen IDs are from `.ai/design/mapa-ekranow.md` §3. The phasing below is unchanged; this note only maps each phase to the screens it touches.

| Phase | Screen IDs | Note |
|---|---|---|
| 1 Cart, drawer, header cart link, add to cart | s04 (cart), s03 (Add to cart), s02 (product card button) | The drawer has no screen ID in the map; it opens from the header cart link on every shopper screen |
| 2 Checkout form and order summary | s05 | |
| 3 Payment step, confirmation, not-found, lookup, status mapping | s06, s07, s08; the status badge also shows on s11 | |
| 4 Store error page | none of its own | `error.tsx` of the storefront covers the error states of s01–s12 (map §7, Error row) |

## Phasing summary

| Phase | Scope | Risk | Owner approvals that gate it | Migration |
|---|---|---|---|---|
| 1 | Cart, drawer, header cart link, add to cart (product page and card), `lib/field-a11y.ts` | risk-medium | OA-1 (copy), OA-3 (warning), OA-5 (retry titles) | none |
| 2 | Checkout form, order summary, checkout loading and error states | risk-high | OA-2 (focus), OA-5, OA-7 (coverage for the focus wrapper) | none |
| 3 | Payment step, confirmation, not-found, lookup, status mapping | risk-high | OA-4 (status colours), OA-5 | none |
| 4 | Store error page | risk-medium | OA-6 (new file and copy) | none |

No phase changes the database, the schema or any server action.

## Test plan (whole retrofit)

- Unit: 100% lines, branches, functions and statements (`npm run test:coverage`). The new pure modules (`lib/field-a11y.ts`, `first-invalid-field.ts`, `order-status-badge.ts`, `storefront-error-view.tsx` as a view) carry their own tests. No exclusion is added unless OA-7 is approved.
- Integration: none (no schema or repository change).
- E2E (`npm run build && npm run test:e2e`): `purchase`, `checkout`, `cart`, `cart-drawer`, `storefront-mobile`, `customer-isolation`, `customer-roles`, and the admin order and "My orders" paths that reuse `OrderSummary` and `OrderStatusBadge`. New checks: focus after the empty submit (Phase 2); 320 px no sideways scroll on the new pages and the drawer; touch-target heights (T16).
- Storybook: stories for the new product components with states (`build-storybook`, `test:storybook:themes`). Each story passes the a11y addon (`a11y: { test: "error" }`).
- Tokens: `npm run check:tokens` stays green; no palette class and no arbitrary value is added.
- Manual, with steps in each PR: keyboard walk through the cart, the drawer and the checkout (Tab order, focus ring, Enter, Escape closes the drawer); a screen-reader pass (NVDA or VoiceOver) on the checkout error and the cart-changed alert (not done for this spec).

## Risks and impact

- **Colour on the purchase path.** Four buttons change from graphite to red. The owner decided this in batch 1; the risk is a visual one. The e2e tests check roles and text, not colour, so a screenshot is part of the PR evidence.
- **Roles in the tests.** `Remove` moves from `button` to `link` in e2e (`cart.e2e.test.ts:52`, `cart-drawer.e2e.test.ts:119`). The PR updates them in the same change.
- **Focus move.** A focus change is a behaviour change for screen-reader users; it is approved only after OA-2. If the owner rejects it, Phase 2 keeps the top alert only (Q1 option b) and the focus item is closed in the P list.
- **Two implementations of `FieldError` and `FormMessage` until the admin phase.** The admin keeps `components/admin/form-feedback.tsx`; the storefront uses the DS. Drift is possible; the shared `fieldA11y` helper limits it. The admin phase removes the duplicate.
- **Shared components reach "My orders".** `OrderSummary` and `OrderStatusBadge` are used on the account pages. Their change (Card, status colours) appears there too. This is intended, and Phase 3 records a screenshot of it.
- **Status colours before the admin phase.** The storefront mapping (C7) and the admin mapping (`components/admin/orders/order-badges.tsx:7-8`) differ until the admin phase. Q4 recommends one function now, reused by the admin later.
- **Coverage of the focus effect.** A client effect cannot run in the Node unit tests. The pure helper is unit-tested; the effect itself needs OA-7 or the alternative in Q1.
- **Copy.** Every new title and button label is listed in OA-1 and OA-5. Until approved, the existing text stays.

## Open questions (with recommendations)

Each question has a recommendation. The owner answers in the review; the answers are recorded under the question.

1. **Focus after a failed checkout submit (C3).** Options: (a) a one-effect call to `firstInvalidFieldId` in `checkout-form.tsx`, with a coverage exclusion for that one wrapper file (OA-7); (b) no focus move, the top alert and the per-field messages stay (the current behaviour, closes audit step 2 as "accepted, not built"); (c) `autoFocus` on the first invalid input with a remount keyed to each result (no effect, but a remount on each submit; not verified). **Recommendation: (a).** It is the rule the owner approved (tokeny §7 rule 13), and the exclusion is one file with a reason.
2. **Accept button label (C6, WhatIsMissing P9).** "OK, update my cart" tells the shopper nothing about what changes. **Recommendation: "Update my cart"**, with the heading "Your cart changed" and the list of changes above it.
3. **Cart-changed variant (C5).** `warning` (recommended: the shopper must check the change) or `info` (neutral). **Recommendation: `warning`.**
4. **Status mapping timing (C7).** Apply the storefront mapping now and let the admin reuse the same function in the admin phase, or wait. **Recommendation: now**, one pure function, so the two screens never disagree again.
5. **Retry links (C9).** A link to the same URL (works without JavaScript) or a button that calls `router.refresh()` (needs a client component). **Recommendation: the link.**
6. **Store `error.tsx` (C10, WhatIsMissing P18).** Yes, in Phase 4, with copy from OA-6. If the repo's coverage exclusions do not cover `error.tsx`, the boundary file needs OA-7 as well. **Recommendation: yes, and the boundary's exclusion is written with its reason.**
7. **Thank-you heading (Phase 3).** Keep the `h1` "Thank you — test payment received" when a payment has just happened and add no alert, or keep the `h1` "Order status" and show the thank-you as an alert. **Recommendation: keep the `h1` as it is** (no copy change) and show the test-payment line as `Alert success role="status"`.
8. **Remove confirmation (WhatIsMissing P6 is not triggered).** No confirmation dialog for Remove: the line comes back by adding the product again, and an `AlertDialog` would add a step to a reversible action. **Recommendation: no dialog.**
9. **Quantity controls (What is missing, stepper).** The drawer uses two icon buttons (`icon-sm`, 32 px) and the cart page uses a number input and Update. Both work. **Recommendation: keep both in this retrofit**; raise the drawer's icon buttons to 44 px on a phone (T16) by the token `--control-*` at the phone density, and record the page's number input as the one pattern for quantity once a stepper exists.
10. **Country field.** Shipping is to Poland only. Keep the text "Country: Poland" or add a `NativeSelect` with one option. **Recommendation: keep the text** (no choice to make; a select with one option adds a control without a decision).
11. **Checkbox or RadioGroup on checkout.** The checkout has no consent or delivery choice. **Recommendation: add none**, and say so in the spec.
12. **Money format (WhatIsMissing P12).** Money uses `pl-PL` ("249,00 zł") in an English UI. Options: keep `pl-PL` for the Polish shop and say so, or switch the store to `en` format. **Recommendation: keep `pl-PL` for money and the dates of the account (P12 owner decision), decided in a separate PR; this retrofit does not change it.**

### P items on these screens (WhatIsMissing §4) and the recommendation

| P | Item | Recommendation for these screens |
|---|---|---|
| P1 | Field keeps the `--ring` focus while it shows an error | accept: the ring stays `--ring`; the error is shown by text, icon and the border (`--destructive`, B2.10) |
| P2 | Typed values stay after a failed submit | accept: already true (`fieldDefault`, `checkout-form-view.tsx:136`, `cart-line-view.tsx:72`) |
| P3 | A second click on a waiting button does not submit again | accept: `disabled={pending}` today, kept with `aria-busy` |
| P4 | Success is shown only after the server confirms | accept: already true (Added to cart and the cart notice come from the server state) |
| P5 | An error the user must act on is never a toast | accept: no toast exists on these screens |
| P9 | "OK, update my cart" | see Q2 and OA-1 |
| P12 | One money and date format for the store | see Q12 (not changed here) |
| P13 | Sentence case for headings and labels | accept: the copy on these screens is sentence case; new copy follows it |
| P14 | Empty states left-aligned | accept: `Empty` is left-aligned |
| P18 | No `error.tsx` in the store | see Q6 and OA-6 |
| P21 | `cn` does not merge token classes | rule for implementers: never override a token class (`rounded-*`, `h-*`, `p-*`) through `className`; the only override here is the existing `w-20` and `w-24` width on inputs |

Not affected by this retrofit: P6 (dialog title; no dialog here), P7 (tabs), P8 (exit times; the drawer's motion is unchanged), P10 (sign-in copy; the E07 area), P11 (empty orders list; "My orders" is out of scope), P15 to P17 (E03 and E05), P19 and P20 (E07 scope and the home slider), P22 and P23 (contributing rules; no new variant is added).

## What is missing (no DS component; not built here)

| Pattern on these screens | Why it is missing | What the retrofit does instead |
|---|---|---|
| Summary list (label and amount rows) | the DS has no definition-list or summary component; the order summary is a `dl` | `Card` with a `dl` (existing structure); a DS summary component is a future decision |
| Quantity stepper (minus, value, plus) | the DS has no stepper; the drawer uses two `icon-sm` buttons | the drawer keeps its two buttons; the page keeps its number input and Update (Q9) |
| Form error summary with links to each field | the DS has `Alert` but no error summary; B2.24 says the summary is an `Alert` | one `Alert` with the server message, plus the field errors (no list of links) |
| Cart line (product name, unit price, quantity, total, remove) | a product component (lesson 08 list, E02); composed from `Field`, `Button`, `Alert` | app component `components/cart/cart-line-view.tsx`, with stories; no DS primitive added |
| Order status row (text and badge) | composed from `Badge` and the mapping function | app component `order-forms-view.tsx`, with stories |
| Toast or snackbar | left out of the system (WhatIsMissing §3); P5 | inline `Alert` (status or alert role) |
| Checkout step indicator (stepper for cart, checkout, payment) | the checkout is one page and one payment step; no step component is needed | none |
| Tooltip for the delivery and payment terms | left out of the system (WhatIsMissing §3; information needed to act must not sit in a hover) | visible text |

## Owner approvals needed

- **OA-1 (Phase 1).** Accept button label on the cart-changed block: "Update my cart" (recommendation, Q2). Copy change.
- **OA-2 (Phase 2).** Focus moves to the first invalid field after a failed checkout submit (tokeny §7 rule 13). A behaviour change (focus), the only one in this spec.
- **OA-3 (Phase 1).** Cart-changed block becomes an `Alert warning role="status"` (Q3). Changes the colour meaning of the block from neutral to warning.
- **OA-4 (Phase 3).** Order status colours on the storefront follow the mapping in C7 (tokeny §7 rule 10 and §8 P2, accepted 2026-10-24). The admin mapping follows in the admin phase (Q4).
- **OA-5 (Phases 1 to 3).** New copy for the `ErrorState` titles and retry labels (one title per unavailable state; the retry label "Try again"). The list is in the phase files; no other new copy.
- **OA-6 (Phase 4).** New store `error.tsx` with the copy "Something went wrong" and "This page could not load. Try again, or browse the catalogue." (proposed; owner may change the wording), a "Try again" button and a "Browse all products" link. Closes WhatIsMissing P18.
- **OA-7 (Phase 2, and Phase 4 if needed).** Coverage: one documented exclusion for the client wrapper `components/checkout/checkout-form.tsx` (reason: a browser-only effect covered by the e2e focus check), if Q1 option (a) is chosen. `AGENTS.md` requires the owner's approval for any exclusion.

Recorded, no approval needed (the owner already decided them or the rule applies): C1 (purchase colour, owner Q4 batch 1), C2 (Remove as link, B1.16), C4 (alert markup, B2.18), C8 (static demo note, B2.18), C12 ("(optional)" via `FieldLabel`, owner Q2 batch 1), C13 (the shared helper move).

## Verification performed for this spec

- Read: `AGENTS.md`, `ENGINEERING_STANDARDS.md` (headings and the coverage rule), `SDLC.md` (risk rules and labels), `.ai/lessons.md`, `.ai/design/POSTEP.md` (stage record, batch decisions, storefront v2 section), `.ai/design/tokeny.md` (§7 rules, §8 decisions), `.ai/design/audyt.md` (steps 1 to 3), `packages/app/stories/design-system/WhatIsMissing.mdx` (§2 to §4), `EpicE02CartAndCheckout.mdx`, the course plan section "Faza 5 – L08", `.ai/specs/implemented/2026-10-15-cart-and-demo-checkout.md` (headings), the storefront design spec (format), and the current checkout, cart and order code with its tests.
- Checked the DS components on `main`: `ui/alert.tsx`, `ui/badge.tsx`, `ui/button.tsx`, `ui/card.tsx`, `ui/empty.tsx`, `ui/error-state.tsx`, `ui/field.tsx`, `ui/skeleton.tsx`, `ui/text-link.tsx`, `ui/native-select.tsx`, `ui/checkbox.tsx`, `ui/radio-group.tsx`, `ui/drawer.tsx`.
- Confirmed in code: the checkout, cart and order views import only the admin `form-feedback` helpers (no DS `Field`, `Alert`, `Empty`, `ErrorState`, `SkeletonGroup` in these screens); the four purchase CTAs are `default`; Remove is `ghost`; the cart-changed block is a `section`.
- Confirmed the e2e files and selectors that the change touches (`purchase`, `checkout`, `cart`, `cart-drawer`, `storefront-mobile`, `customer-isolation`, `customer-roles`).
- Did not run the gate, the app, the e2e tests or Storybook (design-only PR). No browser check was made for this spec.

## What could not be verified

- **Screen-reader behaviour** of the focus move and of the `Alert` roles (NVDA, VoiceOver): not tested. Listed as a manual step in the test plan.
- **Visual result of the purchase colour on the dark theme** on these screens: the tokens are documented in `tokeny.md`; the screens were not rendered in this run.
- **Coverage of `checkout-form.tsx`** with a focus effect: the repo has no DOM test environment (`vitest.config.mts` uses `environment: "node"`); the decision is OA-7 or Q1 (b).
- **Whether `error.tsx` is covered by the existing exclusions** in `vitest.config.mts` (Phase 4): read only the first exclusions in the list (Next.js pages and layouts are excluded, per the comment; `error.tsx` was not checked line by line).
- **The status of storefront Phases 3 and 4** on `main`: checked by searching for `technical_specs` and category images (not found); the Phase 4 home sections were not checked line by line.
- **The admin's badge and `FormMessage` behaviour** after the shared helper move: only the import path changes, but the admin tests were not run.
- **Whether the e2e suite passes** before any change (not run here).

## Documentation to update with the implementation

- `packages/app/stories/design-system/EpicE02CartAndCheckout.mdx`: the "Target after the retrofit" column becomes "Built" per row, and the "Retrofit (lesson 08)" list is closed item by item.
- `packages/app/stories/design-system/WhatIsMissing.mdx` §2: the E02 rows and the "Every page error" row are marked done; §4 P items change only when the owner decides them.
- `.ai/design/POSTEP.md`: a "Lesson 08: retrofit checkout and cart" section per merged phase (the stage table row for stage 3 points to this spec).
- `.ai/specs/2026-10-26-retrofit-checkout-cart.md` moves to `.ai/specs/implemented/` when all four phases are merged.
- `.ai/lessons.md`: one entry per phase if a surprise is found (for example, the server-only rule for `Alert` roles or the SSR limit on effects).

## Owner approvals

- **OA-2** (focus moves to the first invalid field after a failed checkout submit, C3, D9): approved by the owner on 2026-10-27.
- **OA-5** (new titles and the retry label on the unavailable and error states, C9): approved by the owner on 2026-10-27.
- **OA-7** (coverage of the focus effect in `checkout-form.tsx`: no coverage exclusion; the pure helper is unit-tested and the effect is checked by a Storybook play test and the e2e focus check): approved by the owner on 2026-10-27.

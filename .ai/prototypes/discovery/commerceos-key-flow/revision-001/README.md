# Discovery prototype: CommerceOS key flow (revision 001)

- Brief: `.ai/specs/product-brief.md` (read on 2026-10-26; brief updated 2026-10-24).
- Flow: "Key flows" in the brief, both parts together: the future-state purchase-to-Copilot flow (brief steps 1–6) and the "Customer account flow (D11)" (steps 1–4). One prototype with an account switch (owner decision Q1 in `.ai/design/mapa-ekranow.md`).
- Slug: `commerceos-key-flow`. Revision date: 2026-10-26. Previous revision: none (`previousRevision: null`).
- Map and decisions: `.ai/design/mapa-ekranow.md` (screens s01–s19, owner decisions Q1–Q8, layouts A/B/C for s01 and s18).
- Panel report: none supplied. No `[SYNTHETIC]` suggestions are used in this revision.
- Simulation boundary: the owner accepted the F4 recommendations, which set this scope (19 screens, Q1–Q8, 3 layouts for s01 and s18). This is the explicit authorization for this simulation; it approves the simulation and its assumptions below, not their truth.

## Actor, starting point, outcome

- Actors: a shopper (guest, or customer A or B) and the owner.
- Starting point: storefront home (s01) with the demo catalog, empty cart, guest session.
- Success outcome: a shopper buys with the demo checkout, sees the confirmation, finds the account order under "My orders" and cannot open another customer's order. The owner sees the order in admin, asks Copilot, and saves, dismisses or completes a recommendation.
- Excluded destinations: real payment, shipping, refunds, account cancellation, password reset, email, sign-up nudge after a guest order (N02, N06), Copilot entry points from the dashboard or an order (Q4), analytics beyond the fictional traffic figures.

## Rules and decisions preserved (source: brief)

| ID | Summary | How the prototype shows it |
|---|---|---|
| R01 | Copilot numbers come from tools; period shown; missing data named | s18 period line and limitations; refusal and empty-store states |
| R02 | AI advises; the merchant decides | s17 banner; owner transitions only; recommendation actions are owner clicks |
| R03 | Checkout never implies a real payment | s05 "no card, nothing charged"; s06 demo banner and button label |
| R04 | Price and stock checked server-side; no overselling | s04 "Only N left"; s05 conflict outcomes (price, last unit sold out, cart changed) |
| R05 | Metric definitions in the UI; no causal claims | s14 definitions; s18 "Reasoning" wording |
| R06 | LLM unavailable: explicit fallback, never a fabricated answer | s18 source banners (not configured, timed out, daily limit, failed checks) show rule-based insights |
| R07 | Demo data is marked as demo | demo banners on s06, s14, s16; "Demo" badge in s15; "Fictional demo data" tags on traffic figures |
| R08 | A customer sees only own orders; foreign = "not found" | s11 lists own order only; s12 shows the same "Order not found" for foreign, random and malformed ids (Order view control) |
| R09 | Roles separate; owner and customer sessions do not cross | s13 and s10 redirect and notes; admin routes redirect to s13 for guests and customers |
| R10 | Guest checkout stays available; order owner set by the server | s05 guest mode; order owner is set by the simulation, not by the form |
| N02, N06 | No real payments or shipping; no order attachment or account self-service beyond reading own orders | no such controls; s07 has no sign-up nudge (Q2) |
| D08, D09 | Fictional traffic data; Copilot answers seven named questions and declines others | s17 suggested questions; s18 refusal and outside-list states; traffic evidence tagged |
| D10 | Gaming accessories as the demo catalog | product names and prices in the catalog fixture |
| D11 | Customer accounts beside guest checkout; read-only "My orders" | s09–s12 and the account switch |

Rule status: all R01–R10 and D08–D11 are `active` in the brief. No rule was changed. No decision is superseded.

## Screen and state map

Full map with routes, guards and states: `.ai/design/mapa-ekranow.md`. Screen IDs used in the prototype:

| Screen | Action → next state |
|---|---|
| s01 home (A/B/C) | Add to cart → cart count; "Shop all" → s02 |
| s02 catalog | search (no results, clear); category (empty category); add; product link → s03 |
| s03 product | Add (adding state, then "Added to cart."); out of stock disables the button |
| s04 cart | quantity (stock limit), remove, withdrawn product removed with notice (G12); empty cart state |
| s05 checkout | Validation errors inline; place order → s06 or an error (no order written) |
| s06 demo payment | Confirm (no charge) → s07; cancelled or already paid states |
| s07 confirmation | Thank-you after payment; status text; "Find an order" link (no sign-up nudge) |
| s08 lookup | Malformed reference error; rate-limit message; match → s07 only for a guest order or the owner of the account order |
| s09 sign-up | Validation; duplicate e-mail generic error; creates customer A (simulated) → s11 |
| s10 customer sign-in | Wrong password (generic); unavailable; attempt limit; correct → s05 if the cart has items, else s11 |
| s11 My orders | Empty state; own order link → s12; sign out |
| s12 account order | Own order (read-only) or "Order not found" |
| s13 owner sign-in | Validation; wrong password; unavailable; attempt limit; correct → s14 |
| s14 dashboard | Period buttons; custom range validation (invalid → alert, 7 days); empty; "not enough data"; dashboard error |
| s15 orders | Rows with Demo / Guest / Account badges; empty; unknown reference → s16 not-found |
| s16 order (admin) | Allowed transitions only (A4); cancel needs acknowledgement and restocks (stated); refunded is record-only; stale status conflict |
| s17 Copilot question | Empty question error; 429 message; suggestions ask |
| s18 Copilot answer (A/B/C) | Waiting state; answer with banner and three cards; refusal; outside-list; empty store; 500 |
| s19 recommendations | Save, dismiss, completed; "changed in another tab" conflict; empty list |
| unknown | Unknown fragment shows recovery page |

Loading (Skeleton pattern, Q6): optional, switched on in the review bar; shown for s01, s02, s04, s07, s09, s11, s14, s15, s17.
Database unavailable: review-bar state; every screen shows a retry block.

## Assumptions (all `[ASSUMPTION]`)

- AS-01: an owner session checks out as a guest; the owner is not a customer (R09). The brief does not say this.
- AS-02: `refunded` is reachable from `paid`, `processing` and `shipped`, as in `packages/core/src/domain/orders/order-status.ts`. The spec names it only as a recorded status.
- AS-03: all data is fictional: gaming products (D10) with invented names and prices in PLN, invented customers (`klient-a@demo.test`, `klient-b@demo.test`, `owner@demo.test`). No real person, store or order.
- AS-04: "now" is fixed at 2026-10-16 12:00 Europe/Warsaw, the spec's example period.
- AS-05: loading and "Adding…" delays are fixed local timers (400–900 ms). Real latency is not modelled.
- AS-06: layouts A/B/C use the same content and state set. They differ only in order and grouping. A difference in one layout is not evidence about the others.
- AS-07: Copilot answers (three recommendations, numbers, dates) are invented for the prototype. They are not what the approved tools would return.
- AS-08: a session-read failure at checkout shows an error and places no order, in either mode (A24 is interpreted this way). The message text is prototype copy.
- AS-09: the cart is in memory and is kept when the account changes. The brief does not define cart scope per account.
- AS-10: an owner's stale status conflict (payment arrives first) is modelled as a pending order that becomes Paid, with nothing else written.
- AS-11: recommendation transitions follow `packages/core/src/domain/copilot/recommendation-status.ts`: new → saved or dismissed; saved → completed or dismissed.
- AS-12: after customer sign-in the shopper returns to checkout if the cart has items, else to My orders (approximates A16/A17).
- AS-13: the public lookup and reference page finds only the simulated shopper order (CO-24817), and only for a guest order or the same account. Demo orders (DEMO-1001, DEMO-1002) exist only in the admin list.
- AS-14: customer sign-up (s09) creates a signed-in session as customer A. A duplicate of `klient-a@demo.test` gives a generic error.
- AS-15: copy in error messages is prototype copy, not app copy, except where the plan quotes the app.
- AS-16: the owner's copy on s14 ("Compared with the previous period…") and the numbers are invented.

## Walkthrough and checks

Static checks (passed):
- The script parses; all element IDs referenced by the script exist; every `href="#…"` points to an existing screen.
- No external URLs, fonts, images, scripts or remote requests; no `localStorage`, `sessionStorage`, cookies or `fetch`.
- All simulated text uses text nodes; no user input is inserted as HTML.

Browser walk (headless Chrome, driven over the DevTools protocol; not the configured browser provider):
- 81 scripted checks passed: routes and guards (guest, customer, owner), purchase, checkout conflicts, one-time checkout control, customer isolation (A vs B, foreign reference, guest lookup), owner workflow (transitions, stale status), Copilot states (answer, refusal, empty store, 500, 429, fallback banners), recommendations (save, dismiss, complete, changed-in-another-tab), loading and database-error states, withdrawn product, sign-in and sign-up messages, reset.
- 320 px width: no page-level horizontal overflow on any of the 20 screens.
- No runtime errors or console errors.
- Evidence: `evidence/s01-home-1440.png`, `evidence/s18-copilot-answer-320.png`.
- Walk script: `evidence/browser-walk/scenario.js` (the checks) and `evidence/browser-walk/run.mjs` (the runner). Start Chrome with `--headless=new --remote-debugging-port=9333`, then run `node run.mjs <index.html> <evidence dir>`. Local tooling only; not part of the app.

Not run:
- The configured browser provider (`agent-browser`, `.ai/browsers/agent-browser.md`) was not used. Installing it needs a binary download and was not done. The Chrome extension tools were not connected.
- 1440 px layout review beyond the screenshot; keyboard-only walk; focus order review; dark theme (the theme switch is not simulated); 390 px checks.
- Human walk-through by a person outside the project, and any synthetic panel. Neither is evidence (Definition of Ready; `SDLC.md`).

## How to open and reset

- Open `index.html` directly in a browser (no server, no network).
- Use the review bar at the top for accounts (guest, customer A, customer B, owner) and for states. Its "All screens" list jumps to any screen.
- "Reset simulation" restores the start: home, guest, empty cart, all fixtures.
- The browser's back and forward buttons work. Unknown fragments show a recovery page.

## Limits

- All data is fictitious. This revision cannot establish research evidence, user demand or production readiness.
- Not simulated: catalog paging ("Showing 48 of N"), admin paging beyond one page, theme switch, real latency, double-click protection beyond the disabled flow, expired sessions, real e-mail, real payments or shipping.
- Layout is gray, neutral and not a design. Brand, tokens and components belong to the design-system prototype (a later step).

# Run: storefront v2, Phase 2 (cart drawer)

- **Date:** 2026-10-26
- **Branch:** `feat/storefront-phase-2` (worktree `wt-p2`), stacked on `spec/storefront-design-implementation`
- **Goal:** implement Phase 2 of `.ai/specs/2026-10-26-storefront-design-implementation.md` (A10–A17): design-system Drawer, cart drawer from the header link and after "Add to cart", `/cart` unchanged.

## Steps

1. Read the spec (Phase 2, D3, C4, A10–A17, accessibility, security), AGENTS.md, lessons, the cart components, the prototype `cart.tsx`.
2. Added `components/ui/drawer.tsx` (Base UI Dialog, right side, full width below `sm`) with Storybook primitives page, play tests and docs.
3. Added the cart drawer: pure state module (`cart-drawer-state.ts`), context provider, client wrapper, hook-free view, per-line client wrapper with "−"/"+" and remove. Header link and add-to-cart connect to it. The storefront layout mounts the provider and loads the priced cart on the server.
4. Unit tests (state, view in every state, wiring), Storybook, e2e `cart-drawer.e2e.test.ts`.
5. Gate runs. Fixed: the drawer was padded inside a viewport (288 px at 320 px wide) and the e2e drawer actions failed on a race with hydration.

## Decisions

- **Stock cap (A12) is partial.** `PricedCartLine` has no stock field, and the brief said to use existing DTOs. "+" is never disabled; the server refuses a quantity above the stock and the line shows "Only N left in stock.". Adding `stockQuantity` to the DTO would complete A12.
- **Drawer title and close button** live in `CartDrawer` (they need the Base UI context); the hook-free view holds the body and footer. The spec puts the title in the view.
- **Focus return** uses Base UI `finalFocus` with a ref held in the reducer state. The trigger is read as `document.activeElement` before the add action runs, because the submit button is disabled while pending.
- **"Added to cart." is shown inside the drawer** (spec Accessibility), and the page-level status message stays.
- **`/cart` behaviour unchanged.** `loadCartPage` gained an optional `logInvalid` flag so every page's drawer read does not log an invalid cookie.

## Outcome

- See the PR description for the gate results.
- Known gaps: no real phone, no screen reader, no no-JavaScript browser run (the header link and add form are covered by the markup only).
- `ui/**` is excluded from unit coverage (existing config); `drawer.tsx` is covered by the Storybook play tests.

## Follow-ups

- Add `stockQuantity` to `PricedCartLine` so "+" can be capped before submit (A12 full).
- Investigate `admin-copilot` "declines a margin question" (failed once in the full e2e run, passed alone and on rerun).
- Phase 1 (wording, footer, payment note) overlaps `layout.tsx` (the demo banner) and the header; the rebase is expected to be small.

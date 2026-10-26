# Storefront design implementation (storefront v2)

- Backlog: none yet. The stories should be filed with `om-backlog` after the owner approves this spec.
- Status: **draft, design-only PR**. No application code is changed by this spec. Written on 2026-10-26 from the owner's five decisions (accepted 2026-10-26, recorded in `.ai/design/POSTEP.md`, section "Storefront v2 (2026-10-26)").
- Risk: **risk-high**. It changes the shared storefront shell (header, footer, every page), the cart UI, the payment-step wording and, in Phase 3, the product schema (a migration). It also changes four existing rules that the owner has to approve knowingly (section "Existing rules this changes").
- Design reference (not code to copy): `.ai/prototypes/ds/` (README.md, `src/app/screens/shopper.tsx`, `src/app/cart.tsx`, `src/app/fixtures.ts`, `evidence/storefront-v2-results.json`). The prototype is simulated data; its product names, prices, stock and sales figures are not the seeded catalogue.
- Design authority: `.ai/specs/product-brief.md` (R03, R07, D03, D07, N02), `.ai/specs/2026-10-13-commerceos-mvp.md` (§3, §5, §7, D08), `.ai/specs/implemented/2026-10-15-storefront-catalog.md`, `.ai/specs/implemented/2026-10-15-cart-and-demo-checkout.md`, `.ai/specs/implemented/2026-10-16-orders-dashboard-demo-store.md`, `.ai/specs/implemented/2026-10-24-customer-accounts.md`, `ENGINEERING_STANDARDS.md`, `BACKWARD_COMPATIBILITY.md`, `SDLC.md`, `AGENTS.md`.

## 📝 TLDR

The owner accepted a storefront design in the prototype. This spec turns it into four shippable phases in `packages/app`: (1) remove the storefront demo banner and "demo store" wording, add a fictional footer block and one test-payment note; (2) a right-side cart drawer on a new design-system `Drawer`; (3) a product page with a gallery, a two-column layout from 1024 px and three tabs; (4) the home page sections. Each phase is one PR. Two facts change the plan compared with the prototype:

- **The seed does not put "[DEMO]" in product names.** It puts "[DEMO]" in product and category **descriptions** and in customer names. The storefront shows descriptions on the product page, so the prefix is visible there today. Open question Q1 decides how it is hidden.
- **The app has no photos for the seeded products and no second image per product.** The four Pexels photos show products that are not in the seed (keyboard K7, headset H3). They can be used for the hero and two promo banners, not as product photos for seeded products (Q8). Gallery thumbnails need data that does not exist (Q9).

Several items are copy or policy the owner must supply (footer name, delivery and returns, invented hero copy). They are open questions with recommendations. Nothing is invented as a fact in this spec.

## 📝 Decisions and assumptions

| # | Decision | Source | How this spec builds it |
|---|---|---|---|
| D1 | Remove the storefront demo banner and "demo store" wording from the storefront and footer. One note on the payment step: "Test payment. No money is taken." Admin keeps its labels (D08) | Owner decision 1 | Phase 1. Section "Demo wording inventory" lists every string |
| D2 | Footer: fictional company block (fictional name, no address, tax number or contact) | Owner decision 2 | Phase 1. The name is an open question (Q2) and must pass the register check before merge |
| D3 | Cart as a right-side drawer from "Add to cart" and the header cart link; full width on phones; `/cart` stays as the fallback page | Owner decision 3 | Phase 2 |
| D4 | Home: hero with CTA, featured products, promo banners (no discounts), category tiles with counts, "why buy here", best sellers | Owner decision 4 | Phase 4 |
| D5 | Product page: two columns from 1024 px, gallery with thumbnails, tabs Description / Technical data / Delivery and returns; one column below 1024 px | Owner decision 5 | Phase 3 |
| A-1 | Delivery and returns text is an **assumption (AS-01)** until the owner gives a policy. It is a configurable content item, or removed | Owner decision 4 | Section "Delivery and returns" and Q7 |
| A-2 | Hero, banner and short-description copy is invented (AS-08) and needs owner approval before it ships | Prototype README, POSTEP P-copy | Phase 4 ships only copy the owner has approved (Q13, Q14) |
| A-3 | Technical values are fictional (AS-10) | Prototype fixtures | Phase 3 seed values are labelled (Q10) |
| A-4 | "Best sellers" are real paid-order rankings from `GetTopProductsUseCase`, not fixture numbers | This spec (Q11) | Phase 4 |

Protected rule: `R07` in `.ai/specs/product-brief.md` is "active" and changes only by "superseding row approved by product owner". Owner decision 1 narrows R07 for the storefront, so a superseding row must be written and approved before Phase 1 merges (Q5). `R03` (checkout never implies a real payment) stays in force: the payment note is still required.

## 📝 Problem Statement

The current storefront (`packages/app/src/app/(storefront)/`) carries the demo framing on every page: an amber banner in `layout.tsx`, a footer line, the tagline "A CommerceOS demo store.", and "free (demo store)" shipping on checkout. Its product page is one image and one text block with an "Add to cart" form; the cart is a page at `/cart` only; the home page has a hero, a featured slider and category links. The owner accepted a design that removes the framing from the storefront, keeps one honest payment note, and adds a drawer, a richer home page and a product page with tabs.

## 📝 Non-goals

- Discounts, coupons or promo prices. The promo banners link to categories and never promise a price (brief: discounts are out of scope).
- A real delivery, returns or shipping policy. Shipping stays out of scope (N02, cart spec A11).
- Admin editing of technical data, gallery images or photos. Those belong to the admin catalog spec (E03) and image upload (P1). In this spec they are seed or migration data only.
- Image upload, remote image hosting changes and `next.config.ts` changes.
- A new megamenu or a phone menu using Disclosure (prototype open item P4 / lesson 08). Not part of the owner's five decisions.
- Customer-account, checkout-logic and pricing changes. The server stays the only source of prices and stock (see Security).
- Real company data of any kind in the footer.
- New public URLs. The drawer is a layer over existing pages; `/cart` keeps its URL.
- Storybook docs for the other prototype screens.

## 📝 Existing rules this changes (owner approval needed)

| # | Existing rule | Where it is written (exact reference) | What changes | Phase |
|---|---|---|---|---|
| C1 | The storefront shows a static demo banner on every page ("Demo store. Products and prices are fictional; no real orders or payments.") | `.ai/specs/implemented/2026-10-15-storefront-catalog.md`: Q10 (line 24), G7 (line 42), Phase 1 step 7 (line 253), "Demo banner (R07)" (line 195), Risks R07 (line 230); `R07` in `.ai/specs/product-brief.md` (line 107) | Banner removed. R07 narrowed for the storefront by a superseding row (Q5). Admin keeps its labelling | 1 |
| C2 | The footer shows the demo notice, and the hero says "one sentence about the demo store" | Storefront catalog spec: G12 (line 47), G14 (line 49), step 10e (line 264: "the footer has … the demo notice") | Footer gets the fictional company block; hero copy is replaced (Phase 4, Q14) | 1, 4 |
| C3 | Shoppers see "[DEMO]" in seed descriptions ("Seed descriptions keep their `[DEMO]` prefix") | Storefront catalog spec line 299; `packages/database/src/seeders/DatabaseSeeder.ts` header comment (line 15) | Storefront hides the prefix (Q1). Database and admin keep it. The discriminator is unchanged | 1 |
| C4 | Cart is a page; "No slide-out cart drawer" | Cart spec G9 (line 50) | A right-side drawer is added. `/cart` stays. Header link and "Add to cart" open the drawer | 2 |
| C5 | Payment step shows a persistent demo banner ("Demo store — this is a demo payment. No real money is charged and no card details are collected.") and the button "Confirm demo payment (no charge)" | Cart spec A9 (line 27), G4 (line 45), step 12 (line 356), `/checkout/pay/[reference]` row (line 270), R03 "Demo banner on the payment step and the confirmation" (line 318) | One note: "Test payment. No money is taken." Button wording is open (Q3). R03 "no card fields" still holds | 1 |
| C6 | Shipping reads "Shipping: free (demo store)" | Cart spec G5 (line 46); `packages/app/src/components/checkout/checkout-copy.ts` (`SHIPPING_FREE`) | Wording changes (Q4) | 1 |
| C7 | The product page is one image, a price and a description (no tabs, no gallery) | Storefront catalog spec "Product page" (line 192) | Gallery, two columns from 1024 px and tabs are added. The description stays plain text (no HTML) | 3 |

Not changed: URLs, the cart cookie format, the order and payment flow, the stock writers, the seeder's insert-only rule, admin wording.

## 📝 Affected packages and modules

Only `packages/app`, `packages/core` (Phase 3 schema and Phase 4 counts) and `packages/database` (Phase 3 migration and seed). No new package.

**Phase 1 (wording, footer, payment note)**
- `packages/app/src/components/storefront/storefront-copy.ts`: remove `DEMO_NOTICE` and the "demo store" tagline and hero text; keep `STORE_NAME`; add the fictional company constants (`FICTIONAL_COMPANY`, one object, no address/tax/contact fields).
- `packages/app/src/components/storefront/site-footer.tsx`: remove the notice and the copyright "demo store" wording; add the fictional company block.
- `packages/app/src/app/(storefront)/layout.tsx`: remove the amber `role="note"` banner.
- `packages/app/src/components/checkout/checkout-copy.ts`: `PAY_BANNER` becomes the one note; `SHIPPING_FREE`; button and paid-confirmation copy (per Q3, Q4).
- `packages/app/src/components/checkout/order-summary.tsx`, `order-details.tsx`: copy only.
- `packages/app/src/app/(storefront)/checkout/pay/[reference]/page.tsx`: the note component.
- `packages/app/src/components/account/account-copy.ts` (account sign-in note, Q4).
- A helper for the prefix, e.g. `packages/core/src/domain/catalog/demo-text.ts` `stripDemoPrefix(text)` (pure, used by the storefront view only). Its discriminator sits next to `isDemoOrderReference` in `packages/core/src/domain/orders/demo-order.ts`. Only if Q1 option A is chosen.
- Tests: `storefront-shell.test.ts`, `checkout-components.test.ts`, `checkout-copy` assertions, `account-components.test.ts`, the new `demo-text.test.ts`.
- E2E assertions that name the old wording: `packages/app/e2e/home.e2e.test.ts`, `checkout.e2e.test.ts`, `purchase.e2e.test.ts`, `customer-isolation.e2e.test.ts`, `admin-orders.e2e.test.ts` (checks "free (demo store)"), `admin-dashboard.e2e.test.ts` (checks "Confirm demo payment (no charge)"). Admin-side assertions stay.
- Protected-text update: `.ai/specs/product-brief.md` superseding row for R07 (Q5); `BACKWARD_COMPATIBILITY.md` only if a URL or cookie changes (none expected).

**Phase 2 (drawer)**
- New: `packages/app/src/components/ui/drawer.tsx` (side sheet built on `@base-ui/react/dialog`, like `dialog.tsx`; `"use client"`; right side at every width; full width below `sm`, `max-w-md` from `sm`; the overlay classes shared with `dialog.tsx`). Exports `Drawer`, `DrawerTrigger`, `DrawerContent`, `DrawerHeader`, `DrawerBody`, `DrawerFooter`, `DrawerClose`, following the existing `dialog.tsx` naming. It is a design-system component: story in `packages/app/stories/design-system/` (Storybook page next to the Dialog story), and a unit test that renders every state (open, closed, with and without the close button).
- New: `packages/app/src/components/cart/cart-drawer.tsx` (client wrapper: open state and the trigger) and `cart-drawer-view.tsx` (hook-free view: title "Your cart (n)", line rows, quantity controls, remove, subtotal, "Checkout", "View full cart", empty state). The view is rendered in unit tests in every state.
- New: `packages/app/src/components/cart/cart-drawer-context.tsx` (tiny client context: `open()`/`close()`), mounted once in the storefront layout. Reason: the header link and the "Add to cart" button both open it; a context is the smallest shared state. No store library.
- Changed: `packages/app/src/components/cart/cart-link.tsx` keeps `href="/cart"` (so without JavaScript the link works), and its click opens the drawer when the context is present.
- Changed: `packages/app/src/components/cart/add-to-cart.tsx` (and `add-to-cart-view.tsx`): on a successful `addToCart` the drawer opens (Q6). The status message stays for the form's own result.
- Cart data: the drawer's lines come from `readCartLines` and the existing cart use cases through a Server Component passed as `children` (or a Suspense slot) into the client drawer, so no cart logic moves into the client. Quantity and remove use the existing `updateCartLine` and `removeCartLine` server actions (`packages/app/src/server/cart/cart.action.ts`). No new action or endpoint.
- Changed: `packages/app/src/app/(storefront)/layout.tsx` mounts the provider and the drawer inside `<Suspense>`.
- Unchanged: `/cart` page (`cart/page.tsx`, `load-cart-page.ts`) and its tests.

**Phase 3 (product page)**
- New: `packages/app/public/photos/` with the four JPEGs and `CREDITS.md` (copied from `.ai/prototypes/ds/public/photos/`, see Q8). Use via static paths; no `next.config.ts` change.
- New: `packages/app/src/components/catalog/product-gallery.tsx` (main image plus thumbnail buttons, `aria-pressed` on the active one, each button labelled "Show image 2 of 3", arrow-key support on the thumbnail group, works with one image by hiding the thumbnail row, see Q9). View logic (which image is active, labels) in `product-gallery.ts` with unit tests.
- New: `packages/app/src/components/catalog/product-tabs.tsx` built on the existing `packages/app/src/components/ui/tabs.tsx`. Tabs: Description / Technical data / Delivery and returns.
- Changed: `packages/app/src/app/(storefront)/products/[slug]/page.tsx` (layout classes: `lg:grid-cols-2`, gallery first in DOM order below 1024 px) and `load-product-page.ts` (adds `technicalSpecs` and `deliveryText` to the view model). The description stays plain text.
- Changed: `packages/core/src/services/catalog/catalog.dto.ts` (`CatalogProductDetail` gains `technicalSpecs: { label: string; value: string }[]`; `imageUrls` if Q9 chooses a list).
- Changed: `packages/database/src/entities/products/product.entity.ts`: `technicalSpecs` as `jsonb` (Q10). Zod schema for the shape in `packages/core/src/validators/catalog/technical-spec.schema.ts`, used by the seeder and the read mapper.
- New migration in `packages/database/src/migrations/` (generated by `npm run db:migration:create`, reviewed, committed).
- Changed: `packages/database/src/seeders/DatabaseSeeder.ts`: the demo products get `technicalSpecs` when they are **created** (insert-only, see Data changes).

**Phase 4 (home)**
- Changed: `packages/app/src/app/(storefront)/page.tsx` and `load-home-page.ts`: sections in the order of D4.
- New: `packages/app/src/components/storefront/home-hero.tsx`, `promo-banners.tsx`, `category-tiles.tsx`, `why-buy-here.tsx`, `best-sellers.tsx`. Each is a view with unit tests; branching in colocated `.ts` helpers.
- New content module: `packages/app/src/components/storefront/storefront-content.ts` (hero copy, banner copy, "why buy here" items, delivery text, all typed). The approved copy only (Q13, Q14). No fact in it that the code does not check.
- Changed: `packages/core/src/services/catalog/` gets one read: published product count per category (`listCategoryCounts`, a new use case with a port method and a unit test with a fake port; an integration test for the query). Best sellers reuse `GetTopProductsUseCase` from `packages/core/src/services/metrics/` unchanged (no second metric computation, AGENTS.md "metric definitions").
- Changed: `packages/app/src/app/(storefront)/load-storefront-categories.ts`'s neighbour for counts (same React `cache()` pattern).
- Images: hero and banner photos from `public/photos/`, `alt=""` for decorative images; the existing `public/demo/hero.svg` is removed in this phase if no other page uses it (check with grep first).

**Not touched in any phase:** `packages/app/src/server/*` (except the drawer's use of existing actions), `packages/app/src/server/container.ts`, env, the admin area, the cart cookie format, the checkout and payment use cases, the stock writers.

## 📝 Data changes

### Product technical data (Phase 3, owner choice Q10)

- Recommended: `products.technical_specs jsonb not null default '[]'` with `check (jsonb_typeof(technical_specs) = 'array')`. Shape: an array of `{ label, value }`; at most 12 rows; label 1–60 characters; value 1–200 characters (Zod in core; the database check only guards the type). No unique constraint needed.
- Migration: additive, one column, no backfill in the migration itself. Integration test: migrate on an empty database, the check rejects a non-array, the default is `[]`, and the schema-drift test passes.
- Seeder: `DatabaseSeeder` sets `technicalSpecs` for **products it creates** only. The seeder stays insert-only (`on conflict do nothing` by slug, AGENTS.md "Database conventions"). Existing demo databases therefore show an empty Technical data tab ("No technical data for this product yet.") until the owner decides on a one-off data migration that fills the demo slugs where the column is `[]` (Q10, option C). That migration is a schema-history step, not a seeder change, and it never touches `stock_quantity`.
- Seed values for demo products are fictional (AS-10) and are labelled (Q10).
- Admin cannot edit them in this spec (Non-goals).

### Gallery images (Phase 3, owner choice Q9)

- Recommended for v1: **no new table**. The gallery shows the product's `imageUrl` (one image). The component already accepts a list, so the thumbnail row appears when a product has two or more images. Thumbnails in the prototype are not reachable for any seeded product today.
- Alternative (only if the owner wants the four-view gallery now): `product_images (id uuid, product_id uuid fk on delete cascade, position int check (position >= 0), url varchar(2048), alt varchar(200), unique (product_id, position))`. Requires photos per product, which do not exist yet (Q8).

### Seeded products and photos

- The seed keeps `imageUrl` SVGs under `/demo/products/<slug>.svg` (storefront catalog Q8). Phase 4 does not replace them with the four Pexels photos, because none shows a seeded product (see Q8).

### Counts and best sellers (Phase 4)

- No schema change. Category counts are a read query: published products per category (draft excluded, out-of-stock included). Best sellers are `GetTopProductsUseCase` (paid-order line items in the period, ranked by units, then revenue, then name; the metric definition text is unchanged).

### Seeder marking

- Demo marking discriminators stay as they are: `DEMO-` SKUs and `DEMO-` order references (`isDemoOrderReference` / `DEMO_ORDER_REFERENCE_LIKE` in core), `[DEMO]` in descriptions and customer names. Phase 1 changes what the storefront **shows**, not what the database holds (Q1).

## 📝 Demo wording inventory (Phase 1)

| Where | Current text | Phase 1 result (recommended; see questions) |
|---|---|---|
| `(storefront)/layout.tsx` banner | "Demo store. Products and prices are fictional; no real orders or payments." | Removed |
| `SiteFooter` line | same as above | Removed; replaced by the fictional company block |
| Footer copyright | "© 2026 CommerceOS demo store." | "© 2026 CommerceOS" |
| `STORE_TAGLINE` | "… A CommerceOS demo store." | "Mice, keyboards, headsets, controllers and mousepads for every setup." |
| Hero description (Phase 4 replaces it) | "… Everything here is demo data, so browse freely." | Replaced in Phase 4 by approved copy (Q14) |
| Product description text (seed) | starts with "[DEMO] " | Prefix hidden on the storefront (Q1) |
| Checkout shipping | "Shipping: free (demo store)" | "Shipping: free" (Q4) |
| Payment step banner | "Demo store — this is a demo payment. No real money is charged and no card details are collected." | One note: "Test payment. No money is taken." (C5) |
| Payment button | "Confirm demo payment (no charge)" | Open (Q3) |
| Paid confirmation | "Thank you — demo payment received"; "Paid with: Demo payment (no money charged)" | Open (Q4) |
| Account sign-in note | "This is a demo store: use any email address. There is no password reset and no email verification." | Open (Q4) |
| Admin (all) | `[DEMO]` customers, Demo badges, the dashboard demo note | **Unchanged** (D08) |

## 📝 Proposed Solution

### Phase 1: demo wording, fictional footer, payment note

1. Remove the banner from the storefront layout; remove the footer notice and the "demo store" wording listed above; add the fictional company block.
2. Replace the payment-step banner with the one note (role `note`, visible, not dismissible). Keep "no card fields" (R03) as a fact in the code and tests (no card input exists).
3. Hide the `[DEMO] ` prefix in the storefront product view (if Q1 option A).
4. Update the e2e and unit assertions that name the old text.
5. Write the R07 superseding row (Q5) in the same PR or before it.

### Phase 2: cart drawer

1. `ui/drawer.tsx` with a story and tests (a design-system component; the DS docs "What is missing" list that names Drawer gets updated in the same PR).
2. `CartDrawerProvider` in the storefront layout; `CartDrawer` content as a Server Component inside `<Suspense>`; the drawer body renders the cart lines (product link, line total, quantity minus and plus with aria labels, remove, "Only N left", subtotal, "Checkout" to `/checkout`, "View full cart" to `/cart`).
3. Header `CartLink` opens the drawer on click (no JavaScript: it is a link to `/cart`).
4. `AddToCart` opens the drawer after a successful add (Q6).
5. Quantity and remove use the existing server actions; each action's result re-renders the drawer body. The drawer stays open after the action.
6. E2E `cart-drawer.e2e.test.ts`: open from the header, change quantity, remove, the stock cap, Escape returns focus to the trigger, the page behind is inert while open, and `/cart` still works.

### Phase 3: product page

1. Gallery and tabs components with view logic in colocated `.ts` files.
2. Two columns from 1024 px (`lg`), gallery first in the DOM below that width; price in the foreground colour; the action colour only on "Add to cart".
3. Tabs: Description (existing text), Technical data (table from `technicalSpecs`, or "No technical data for this product yet."), Delivery and returns (configured text or the neutral line in Q7).
4. Migration and seed (Q10); photo files copied (Q8) if approved.
5. E2E `product-page.e2e.test.ts`: two columns at 1280 px and one column at 390 px with the gallery first; tabs switch with the keyboard; the technical table renders for a seeded product; the existing product-page assertions (draft and unknown slugs) stay.

### Phase 4: home sections

1. Order: hero (approved copy and CTA "Shop all products" to `/products`), featured products (the existing featured slider, G9–G11, Q15), promo banners (2–3, text and CTA, no discount wording; "Low stock" banner only when `GetLowStockProducts` returns rows), category tiles with counts, "Why buy here" (Q7 for delivery), best sellers (Q11).
2. Empty states: no featured products, no low stock (banner omitted, not shown as "all good"), no paid orders in the window (best sellers section omitted), no categories.
3. E2E: rewrite the storefront home assertions in `home.e2e.test.ts` for the new sections; each CTA target is checked.

## 📝 Security and validation

- **No client prices.** Drawer and product forms post `productId` and `quantity` only (1–99, as today). Prices, totals, stock and availability are read on the server. The drawer shows server prices as the cart page does.
- **No new endpoints.** Drawer actions reuse `addToCart`, `updateCartLine`, `removeCartLine`. Content and counts render in Server Components.
- **Untrusted text.** Technical values and descriptions are rendered as React text (escaped). No `dangerouslySetInnerHTML`. Labels and values are length-capped by Zod at the boundary (seed and read mapper).
- **Images.** Local `/photos/` and `/demo/` paths only; remote URLs keep the storefront catalog rule G21 (plain `<img>`, `referrerpolicy="no-referrer"`).
- **Content config is code.** Delivery text and banner copy live in a typed TypeScript module reviewed in a PR, not in an env variable (no new env surface; BACKWARD_COMPATIBILITY config rules).
- **Fictional footer.** It is static text, carries no tax number, address or contact, and is labelled fictional. It must not resemble a real trader's company data (Q2 and the register check).
- **Demo marking remains in the data.** The `DEMO-` and `[DEMO]` markers stay in the database and in admin, so R07 still holds for internal views.
- **Logging.** No new logs. Cart cookie invalid-value logging stays as it is (`logInvalid: false` in the layout).
- **Rate limits and auth.** Unchanged. The drawer is a read of the cookie and existing actions; customer and admin guards are not touched.

## 📝 UI/UX and states

- **Drawer:** right side; `max-w-md` from `sm`; full width below `sm` (448 px). Title "Your cart (n)". Loading: skeleton rows. Empty: "Your cart is empty." and "Shop all products". Error (cart cookie unreadable): the cart's existing empty state, never a crash. Notices from auto-corrected lines (cart spec G12, G13) appear at the top, reusing `cart-changes.tsx`.
- **Gallery:** main image with `alt` = product name; thumbnails are buttons labelled "Show image n of m"; the active one has `aria-pressed="true"`. One image: no thumbnail row.
- **Tabs:** Description, Technical data, Delivery and returns; arrow keys move between tabs (Base UI or the existing `tabs.tsx`).
- **Home:** hero, sections in D4 order, one h1 (hero), section headings h2.
- **Action colour** (`tokeny.md`, prototype rule): red (`action` token) only on Add to cart, Checkout, Place order and the payment confirm button. Promo CTAs and "Shop all" use default or outline buttons.
- **Flat surfaces:** 1 px border, no gradients, no blur (prototype rule from `audyt.md`).

## 📝 Accessibility

- **Drawer focus:** on open, focus moves into the drawer (the close button or the heading); Tab and Shift+Tab stay inside; Escape and the backdrop close it; focus returns to the trigger (header link or "Add to cart"). Base UI provides the trap, the inert page and the return; each is tested in the Storybook test run and checked by hand (Phase 2 acceptance).
- **Status messages inside a modal.** While the drawer is open the page is inert and `aria-hidden`; a `role="status"` outside it is not announced (lesson 2026-10-25). The "Added to cart" message is therefore shown inside the drawer when it opens, or before the drawer opens.
- **Reduced motion:** the slide and fade use `motion-safe:` / `motion-reduce:transition-none`, as in `dialog.tsx`.
- **Labels:** every quantity button has an aria label including the product name; the header link keeps the "Cart (n)" accessible name.
- **320 px:** no sideways scroll on any page or inside the drawer. Tables (technical data) scroll inside their own container, never the page; the e2e and the existing 320 px checks run on each phase.
- **Contrast:** only existing token pairs; the note on the payment step uses the existing notice colour pair (checked in the design-system contrast step, `.ai/design/kontrast/`).
- **Keyboard:** every new control reachable by Tab; tab order matches reading order below 1024 px (gallery first).

## 📝 Edge cases & failure scenarios

| Case | Expected |
|---|---|
| JavaScript disabled | Header cart link goes to `/cart`; "Add to cart" works as a form; no drawer |
| Cart cookie with a sold-out line | Drawer shows the existing correction notice; count follows the cookie (cart spec G12/G13) |
| Product with no photo | Neutral placeholder with a text label (`ProductImage` "No image" today; the label wording is Q8) |
| Product with no technical data | Tab shows "No technical data for this product yet." |
| No paid orders in 30 days | Best sellers section omitted |
| No low-stock product | "Low stock" banner omitted |
| Category with no published products | Tile shows "0 products" or is omitted (Q12) |
| Metric or DB error on the home page | The page shows the error for that section (as the featured slider does), never a stack trace; the rest of the page renders |

## 📝 Risks & Impact Review

- **Protected-rule change (R07, C1–C7).** Mitigated by the superseding row (Q5) and by listing every change here. The owner must approve the list knowingly.
- **Stock and money.** Not touched. The drawer and the product page only call existing actions and reads.
- **Visible fake data.** Demo data on the storefront becomes less labelled by design (owner decision). Mitigation: no demo wording on the storefront except the payment note, the fictional footer block, labelled technical values (Q10) and the admin keeps all marks. The risk is accepted only with the owner's decision on Q1 and Q4.
- **Invented facts.** Delivery, returns, warranty and the sale ranking could look like real claims. Mitigation: Q7 (no policy text by default), Q11 (real paid-order ranking), Q10 (labelled values).
- **Schema.** One additive column (Phase 3). Reversible by dropping the column; no existing data is changed by the migration.
- **Client state.** A React context for the drawer is client-only; the cart stays in the cookie, so a reload keeps the cart and closes the drawer.
- **Test cost.** The e2e suite gets new assertions in every phase (about four files change text). Budget for it in each PR.
- **Prototype is not verified in a real browser or a screen reader** (prototype README "Not verified"); Phase 2 has a manual keyboard check.

## 📝 Decisions in play

- **Demo prefix (Q1).** Options: (A) keep the prefix in the database and hide it in the storefront view; (B) remove the prefix from seed text (only new databases change, because the seeder is insert-only; existing demo rows keep it); (C) keep it visible. Recommendation: A.
- **Gallery data (Q9):** single image now, table later (recommended) or the table now.
- **Drawer state:** React context (recommended) rather than a global store or URL state. A URL flag (`?cart=open`) was rejected: it adds a public URL state and does not help without JavaScript.

## 📋 Phasing

Each phase is one PR, shippable alone, with the full gate (lint, format, typecheck, unit coverage 100%, build, integration where the DB changes, e2e for every changed flow). Order follows the owner's list, but Phase 1 is first because it removes the framing before new surfaces ship. Phase 2 can ship before Phase 3 because it does not depend on it.

## 📋 Implementation Plan

### Phase 1: demo wording, fictional footer, payment note (`risk-high`, one PR)

Depends on: Q1, Q2, Q3, Q4, Q5 answered; the R07 superseding row approved.

1. **Storefront copy and footer.** Edit `storefront-copy.ts`, `site-footer.tsx`, `layout.tsx`; add `FICTIONAL_COMPANY`. Unit tests in `storefront-shell.test.ts`: no "demo store" text, the fictional block present, no address, tax or contact fields.
2. **Description prefix (Q1 A).** `demo-text.ts` in core with `stripDemoPrefix`; unit tests (prefix removed once, other text unchanged, lowercase "[demo]" not stripped, empty string). The storefront product view and category description use it.
3. **Checkout and pay copy.** Payment note, button and shipping wording per Q3/Q4; component tests for the note and for "Test payment. No money is taken.".
4. **E2E and wording sweep.** Update the e2e assertions listed in "Affected packages"; a grep step in the PR lists remaining "demo store" strings outside admin (must be none on the storefront).

Acceptance (Phase 1):
- **A1:** no storefront page (home, `/products`, a product, `/cart`, checkout, payment, confirmation, sign-in) shows the amber banner or the words "demo store".
- **A2:** the footer shows the fictional company block (name from Q2, text "fictional", no address, tax number or contact), and no demo notice.
- **A3:** the payment page shows exactly one note, "Test payment. No money is taken.", and no card input.
- **A4:** product descriptions on the storefront show no "[DEMO]" prefix; the database and admin still show it.
- **A5:** admin screens are unchanged (their e2e tests pass unchanged).
- **A6:** `R07` superseding row exists in `product-brief.md` with the owner's approval recorded.
- **A7:** unit coverage 100%; e2e green; 320 px no sideways scroll on home, product, checkout and pay pages.

### Phase 2: cart drawer (`risk-high`, one PR)

1. `ui/drawer.tsx`, its Storybook story and unit tests; DS docs "What is missing" updated.
2. `cart-drawer-context.tsx`, `cart-drawer.tsx`, `cart-drawer-view.tsx` (+ tests in every state).
3. `CartLink` and `AddToCart` integration; layout mounts the provider inside Suspense.
4. E2E `cart-drawer.e2e.test.ts`; manual keyboard check recorded in the PR.
5. Update `BACKWARD_COMPATIBILITY.md` only for the new client surface (no URL change) and cart spec G9 note.

Acceptance (Phase 2):
- **A8:** the header cart link and each "Add to cart" open a right-side drawer; on 390 px it is full width.
- **A9:** the drawer shows the same lines, quantities, prices and subtotal as `/cart`, read on the server.
- **A10:** quantity plus is capped at stock; "Only N left" appears at the cap; the add button is disabled for a sold-out product (existing rule).
- **A11:** remove and quantity changes work from the drawer; the page behind updates its count.
- **A12:** Escape, the backdrop and the close button close it, focus returns to the trigger; Tab cannot leave the open drawer.
- **A13:** with JavaScript off, the header link goes to `/cart`.
- **A14:** `/cart` unchanged in URL and behaviour (its unit and e2e tests pass).
- **A15:** the drawer does not overflow at 320 px; reduced motion removes the slide.

### Phase 3: product page (`risk-high`, one PR; migration)

Depends on: Q8, Q9, Q10, Q7.

1. Migration `technical_specs` (if Q10 A/B) with integration test; entity and Zod schema; seed values for created products; unit tests for the seeder (insert-only, no stock change).
2. `product-gallery.tsx` + `product-gallery.ts`; `product-tabs.tsx`; the page layout at `lg`.
3. `load-product-page.ts` and DTO additions with tests.
4. E2E `product-page.e2e.test.ts` (two columns, gallery first at 390 px, tabs by keyboard, technical table).
5. Photos copied with `CREDITS.md` (only if Q8 approved).

Acceptance (Phase 3):
- **A16:** at 1024 px and wider the gallery and the details sit side by side; below 1024 px the gallery is first.
- **A17:** the gallery button for each thumbnail has an accessible label and `aria-pressed`; the row is hidden for one image.
- **A18:** tabs switch with the keyboard (arrow keys, Home/End) and the panel is labelled by its tab.
- **A19:** the technical table shows the seeded rows for a new demo product; a product without rows shows the neutral line.
- **A20:** the migration applies on a fresh and on an existing database; the check rejects a non-array; no stock value changes.
- **A21:** the Delivery and returns tab shows only the configured text (or the neutral line).

### Phase 4: home sections (`risk-high`, one PR)

Depends on: Q11–Q15.

1. `listCategoryCounts` use case, port, database adapter and integration test; unit tests with a fake port.
2. Best sellers through `GetTopProductsUseCase` (unchanged); view helper for ranking and the empty case.
3. Hero, promo banners (static approved copy, photos), category tiles, "Why buy here", featured section reuse; `storefront-content.ts`.
4. E2E rewrite of `home.e2e.test.ts`.

Acceptance (Phase 4):
- **A22:** the home page shows the sections in the D4 order; each CTA leads to an existing route with the expected filter.
- **A23:** category counts equal the published products per category in the seed (integration test).
- **A24:** best sellers list only products with paid orders in the window, names only, no numbers; the section is omitted when empty.
- **A25:** the "Low stock" banner appears only when a published product is at or below the threshold (from `GetLowStockProducts`).
- **A26:** no discount or price-promise text anywhere on the home page (grep test on the content module).
- **A27:** the page has one h1 and no sideways scroll at 320 px.

## 📝 Test plan

- Unit (100% coverage, `npm run test:coverage`): every new view, helper and use case; the new `stripDemoPrefix`, gallery and tabs helpers, the category count mapping and the content module shape.
- Integration (Testcontainers): Phase 3 migration and check constraint; Phase 4 category count query; seeder insert-only behaviour on an existing database.
- E2E (agent-browser): `cart-drawer`, `product-page`, rewritten `home`, updated `purchase`, `checkout`, `customer-isolation`, `admin-orders`, `admin-dashboard` assertions. Screenshots at 320 px and 1280 px for each changed page go into the PR evidence (`needs-qa`, no self-QA: risk-high).
- Storybook: `npm run test:storybook:themes` for the drawer (light and dark, a11y as errors) and the gallery and tabs if they get stories.
- Manual: keyboard walk of the drawer and the tabs; a real phone or a 390 px emulation check (the prototype did not test a real phone).

## 📝 Open questions

Each question needs the owner's answer before the phase named in brackets. The recommendation is not an answer.

1. **[DEMO] in descriptions (Phase 1).** The seed puts "[DEMO]" at the start of product and category descriptions, not in product names. Options: (A) keep the prefix in the database and hide it in the storefront view with `stripDemoPrefix` (the marker stays in data and admin). (B) Remove it from the seed text; existing databases keep the old text because the seeder is insert-only, so the storefront would show it on old installs. (C) Keep it visible. **Recommendation: A.** It satisfies decision 1 and the seeder rule, and the cost is one tested helper.
2. **Footer company name (Phase 1).** The prototype name "Kwadrat Peryferii Sp. z o.o." is not an exact match in a web search, but the search found "KWADRAT sp. z o.o." (KRS 0000549038, Warsaw) and other close names, so it is too close to a real company. **Recommendation:** a name that is plainly invented and has no legal-form suffix, for example "CommerceOS Demo Shop (fictional company)", with the text "Fictional company for the demo. No address, tax number or contact." The owner picks the name. **Before merge:** search the KRS register (ekrs.ms.gov.pl or rejestr.io) for the exact name and its main words; the PR records the search and the result. This check could not be completed from this environment (see "What could not be verified").
3. **Payment step wording (Phase 1).** The owner's note "Test payment. No money is taken." replaces the banner. Should the button "Confirm demo payment (no charge)" also change, for example to "Confirm test payment"? **Recommendation: yes**, so the page uses one word for the mode. The e2e tests change with it.
4. **Other storefront demo wording (Phase 1).** Shipping "free (demo store)"; the paid confirmation "Thank you — demo payment received" and "Paid with: Demo payment (no money charged)"; the account sign-in note "This is a demo store: use any email address…". Owner decision 1 says remove "demo store" wording from the storefront. **Recommendation:** "Shipping: free"; "Paid with: test payment (no money taken)"; keep the account note only as a limitation, reworded ("No password reset and no email verification in this demo."), because principle 6 requires limitations to be stated.
5. **R07 superseding row (Phase 1).** `R07` in `.ai/specs/product-brief.md` changes only by a superseding row approved by the product owner. Owner decision 1 narrows it for the storefront. **Recommendation:** the owner approves a dated superseding row that keeps admin and Copilot labelling and removes the storefront banner requirement. Until it exists, Phase 1 must not merge.
6. **Drawer behaviour (Phase 2).** Open the drawer after a successful "Add to cart" (recommended) or only show the status message? Keep the header link as a real link to `/cart` for JavaScript-off users (recommended, yes)?
7. **Delivery and returns (Phase 3 and 4).** No real policy exists. Options: (A) the content module holds `null` until the owner gives text; the "Why buy here" card is omitted and the Delivery tab shows "Delivery and returns are not set for this demo store." (recommended); (B) keep the prototype's assumption (1–3 working days, 14 days returns) marked as an assumption on the page; (C) remove the tab and the card. **Recommendation: A.**
8. **Photos (Phase 3 and 4).** The four Pexels photos show K7 and H3 and a generic desk. None of them shows a seeded product (the seed has Vortex mouse, Nova TKL, Strike 60, Drift headset, Echo headset, and others). Using a photo of another product would mislead a shopper (principle 2). **Recommendation:** use the hero photo and the "Build your setup" and "Audio for calls" banner photos (`CREDITS.md` already records their licence checks); keep SVGs for seeded product cards and the product page; the placeholder label for products without a photo is "No photo yet". The owner also checks the small marks on the hero and the mouse at full size (`CREDITS.md`, open item). The controller photo is not used (licence and author check still open).
9. **Gallery (Phase 3).** The seed has one image per product, so the four-view gallery cannot be filled with real photos now. **Recommendation:** ship the gallery component with one image and show the thumbnail row only for two or more images, with no new table; a table comes with a later spec and image upload (P1).
10. **Technical data (Phase 3).** (A) new `technical_specs jsonb` column with a migration and seed values for newly created demo products (recommended); (B) seeded JSON in code only, no column (rejected: the product page would read code, not data); (C) plus a one-off data migration that fills the demo slugs where the column is empty, so existing demo databases show the table. **Recommendation: A, and decide C separately.** Also: should the technical table carry one neutral line "Example values for the demo store."? **Recommendation: yes** (principle 6; AS-10).
11. **Best sellers (Phase 4).** (A) real paid-order ranking from `GetTopProductsUseCase`, 30-day window, names only, section omitted when empty (recommended); (B) an owner-curated featured flag (new column; the featured column already exists for the slider); (C) hide the section. Note: the seeded orders are fictional, so the ranking is real data about fictional orders. **Recommendation: A**, and the section copy does not claim sales volume.
12. **Category tiles (Phase 4).** Count published products per category, draft excluded, out-of-stock included (recommended). Show "0 products" or omit empty categories? **Recommendation: omit**.
13. **Promo banner copy (Phase 4).** The three banners ("Build your setup", "Audio for calls", and the stock banner) use invented copy (AS-08). Approve the copy, or give replacements. The stock banner must come from `GetLowStockProducts`, not a fixed fixture (recommended, as in A25).
14. **Hero copy (Phase 4).** AS-08 copy ("Gear for every desk and every match", the stock line, "Shop all products"). Approve or replace. The prototype's line "Everything here is demo data" is not carried over (decision 1).
15. **Featured section (Phase 4).** Keep the existing featured slider with category tabs (storefront catalog G9–G11, recommended, no rule change) or replace it with the prototype's static featured strip (would change G9–G11)?
16. **Admin scope.** Confirm that technical data and photos stay seed or migration data until the admin catalog spec (E03) and image upload (P1) cover them. **Recommendation: yes.**
17. **Phase order.** Confirm the order 1 wording, 2 drawer, 3 product page, 4 home. **Recommendation: as listed.** Phase 2 may move before Phase 1 only if the owner accepts a banner on the drawer's pages in the meantime (not recommended).

## 📋 Review log

- Spec written 2026-10-26 by an agent from the owner's five decisions and the repository state at commit `dd9902c`. Not yet reviewed by a second model or a human reviewer.
- Fresh-context review is required before Phase 1 starts (SDLC: risk-high needs a second person; the spec is design-only).

## What could not be verified

- **Footer name against the Polish company register.** A web search found no exact match for "Kwadrat Peryferii" and found close matches (for example KWADRAT sp. z o.o., KRS 0000549038). The official KRS search (ekrs.ms.gov.pl) was not reachable from this environment. The check is a required pre-merge step (Q2).
- **The prototype's visual and keyboard behaviour in a real browser or screen reader.** The prototype walk was headless; the Chrome extension was not connected.
- **The gate.** This PR changes only a Markdown spec, so lint, typecheck, tests, build, integration and e2e were not run. Nothing in `packages/` was touched.
- **Current e2e text matches.** Named from grep (`home`, `checkout`, `purchase`, `customer-isolation`, `admin-orders`, `admin-dashboard`); the exact lines are found in Phase 1, not here.
- **Behaviour of `GetTopProductsUseCase` on the storefront** (cache, performance) and of Base UI's focus return inside a server-rendered children slot. Both are checked in Phases 2 and 4.

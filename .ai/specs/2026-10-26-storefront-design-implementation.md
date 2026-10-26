# Storefront design implementation (storefront v2)

- Backlog: none yet. The stories should be filed with `om-backlog` after the owner approves this spec.
- Status: **ready for the owner to merge (design-only PR; owner answers Q1–Q17 applied; OA-1 to OA-11 approved by the owner on 2026-10-26)**. No application code is changed by this spec. Written on 2026-10-26 from the owner's five decisions (accepted 2026-10-26, recorded in `.ai/design/POSTEP.md`, section "Storefront v2 (2026-10-26)"). The owner's answers are applied in the sections below; each answer is recorded under its question in "Open questions". All OA items are owner-approved (2026-10-26) and listed in "Owner approvals needed".
- Risk: **risk-high**. It changes the shared storefront shell (header, footer, every page), the cart UI, the payment-step wording, demo text in the database and in the admin (OA-2), the AI description demo marker (OA-3), and, in Phases 3 and 4, the product and category schema (migrations). It also changes protected rules that the owner has to approve knowingly (section "Existing rules this changes" and "Protected rule change").
- Design reference (not code to copy): `.ai/prototypes/ds/` (README.md, `src/app/screens/shopper.tsx`, `src/app/cart.tsx`, `src/app/fixtures.ts`, `evidence/storefront-v2-results.json`). The prototype is simulated data; its product names, prices, stock and sales figures are not the seeded catalogue.
- Design authority: `.ai/specs/product-brief.md` (R03, R07, D03, D07, N02), `.ai/specs/2026-10-13-commerceos-mvp.md` (§3, §5, §7, D08), `.ai/specs/implemented/2026-10-15-storefront-catalog.md`, `.ai/specs/implemented/2026-10-15-cart-and-demo-checkout.md`, `.ai/specs/implemented/2026-10-16-orders-dashboard-demo-store.md`, `.ai/specs/implemented/2026-10-18-ai-product-descriptions.md` (A12), `.ai/specs/implemented/2026-10-24-customer-accounts.md`, `ENGINEERING_STANDARDS.md`, `BACKWARD_COMPATIBILITY.md`, `SDLC.md`, `AGENTS.md`.

## 📝 TLDR

The owner accepted a storefront design in the prototype and has answered the open questions. This spec turns it into four shippable phases in `packages/app` (with `packages/database` and `packages/core` where data changes, and `packages/ai` for the AI description marker): (1) remove the storefront demo banner and "demo store" wording, remove the `[DEMO]` marker from shopper-visible and seeded text, add a fictional footer block and one test-payment note; (2) a right-side cart drawer on a new design-system `Drawer`; (3) a product page with a photo, a gallery, a two-column layout from 1024 px, three tabs and technical data; (4) the home page sections, with category photos and counts. Each phase is one PR, in the order 1, 2, 3, 4 (Q17). The main consequences of the owner's answers:

- **`[DEMO]` leaves the text.** The owner asked for it to be removed from the storefront and from the database (Q1). Seed text for new rows drops the prefix. Existing demo rows keep it until a one-off data update runs (OA-4). The AI description feature uses the prefix as its demo marker, so its discriminator moves to the `DEMO-` SKU (OA-3). The admin part of this change needs the owner's explicit approval (OA-2).
- **Photos are used wherever a photo is mapped.** Product cards, the product page and category tiles show a photo; anything without one shows the text placeholder "No photo yet" (Q8). The mapping is seed data (`imageUrl` for products, a new `image_url` for categories), so no photo or technical data is editable in the admin (Q16).
- **Technical data is seed data.** A new `technical_specs` jsonb column, with fictional values for new demo products, labelled (Q10).
- **Sample delivery text is shown,** clearly labelled as an example (Q7, OA-5).
- **The R07 narrowing is written as R11** (exact text in "Protected rule change"). It must be written into the brief by a separate PR and approved by the owner before Phase 1 merges (Q5, OA-1). This spec does not edit the brief.

## 📝 Decisions and assumptions

| # | Decision | Source | How this spec builds it |
|---|---|---|---|
| D1 | Remove the storefront demo banner and "demo store" wording from the storefront and footer. The payment step has one note, "Test payment. No money is taken.", and the button "Confirm test payment". The `[DEMO]` marker is removed from shopper-visible and seeded text, in the database and the admin (Q1, OA-2). Machine markers (`DEMO-` SKUs and order references) and the demo-data labels on the admin dashboard, traffic views and Copilot stay (R11) | Owner decision 1; owner answers Q1, Q3, Q4 | Phase 1. Section "Demo wording inventory" lists every string |
| D2 | Footer: fictional company block, name "CommerceOS Demo Shop", labelled fictional, no legal form, address, tax number or contact (Q2) | Owner decision 2; Q2 | Phase 1. The register check is a pre-merge step (OA-8) |
| D3 | Cart as a right-side drawer, opened after a successful "Add to cart" and from the header cart link (a real `/cart` link, so it works without JavaScript). Full width on phones. `/cart` stays as the fallback page (Q6) | Owner decision 3; Q6 | Phase 2 |
| D4 | Home: hero with CTA, featured products (existing slider, unchanged, Q15), promo banners (no discounts), category tiles with counts and photos (empty categories omitted, Q12), "why buy here", best sellers from real paid orders (Q11) | Owner decision 4; Q11–Q15 | Phase 4 |
| D5 | Product page: two columns from 1024 px, gallery (one image now, thumbnails from two, Q9), tabs Description / Technical data / Delivery and returns; one column below 1024 px | Owner decision 5; Q9, Q10 | Phase 3 |
| D6 | Photos: wherever a photo is mapped (product cards, product page, category tiles). Unmapped items show the placeholder "No photo yet" (Q8). This supersedes the earlier recommendation to keep the SVG product images on the storefront | Owner answer Q8 | Phases 3 and 4. Section "Photo mapping" |
| D7 | Delivery and returns: example text, labelled as an example on the storefront: "Example policy: delivery in 1–3 working days, 14-day returns." (Q7) | Owner answer Q7 | Phase 3 (Delivery tab) and Phase 4 ("Why buy here"). OA-5 |
| A-1 | The example delivery text is an **assumption (AS-01)**. It is shown only with its example label, never as the store's real policy | Owner answer Q7 | Section "Delivery and returns" |
| A-2 | Hero, banner and "Low stock" copy is invented (AS-08). The owner approved it (Q13, Q14). The two banner lines name only catalogue items (OA-6, approved) | Owner answers Q13, Q14 | Phase 4 |
| A-3 | Technical values are fictional (AS-10). The tab carries the note "Example values for the demo store." | Owner answer Q10; prototype fixtures | Phase 3 |
| A-4 | "Best sellers" are real paid-order rankings from `GetTopProductsUseCase` over the last 30 days, not fixture numbers. The seeded orders are fictional, so the ranking is real data about fictional orders (OA-7) | Owner answer Q11 | Phase 4 |
| A-5 | The AI description demo marker is moved from the `[DEMO] ` text to the `DEMO-` SKU. AI drafts get no visible prefix (OA-3, approved) | Owner answer Q1 (consequence) | Phase 1 |

Protected rules: `R07` in `.ai/specs/product-brief.md` is "active" and changes only by "superseding row approved by product owner". Owner answer Q5 approves the narrowing. The exact new row is "R11" in section "Protected rule change". Until that row is written and approved, Phase 1 must not merge. `R03` (checkout never implies a real payment) stays in force: the payment note is the label, and the button names a test payment.

## 📝 Problem Statement

The current storefront (`packages/app/src/app/(storefront)/`) carries the demo framing on every page: an amber banner in `layout.tsx`, a footer line, the tagline "A CommerceOS demo store.", and "free (demo store)" shipping on checkout. The seed also writes "[DEMO]" into product and category descriptions and customer names, which the storefront shows. Its product page is one image and one text block with an "Add to cart" form; the cart is a page at `/cart` only; the home page has a hero, a featured slider and category links. The owner accepted a design that removes the framing from the storefront, keeps one honest payment note, and adds a drawer, a richer home page and a product page with tabs.

## 📝 Non-goals

- Discounts, coupons or promo prices. The promo banners link to categories and never promise a price (brief: discounts are out of scope).
- A real delivery, returns or shipping policy. The delivery text is an example with a label (Q7). Shipping stays out of scope (N02, cart spec A11).
- Admin editing of technical data, gallery images or photos. Those belong to the admin catalog spec (E03) and image upload (P1). In this spec they are seed or migration data only (Q16).
- Image upload, remote image hosting changes and `next.config.ts` changes.
- A new megamenu or a phone menu using Disclosure (prototype open item P4 / lesson 08). Not part of the owner's answers.
- Customer-account, checkout-logic and pricing changes. The server stays the only source of prices and stock (see Security).
- Real company data of any kind in the footer.
- New public URLs. The drawer is a layer over existing pages; `/cart` keeps its URL.
- Storybook docs for the other prototype screens.
- A backfill of technical data or photos for existing databases without the owner's decision (OA-4b, OA-4c). Phase 1's text update for existing rows (OA-4a) is part of the approved scope (OA-4a, approved).

## 📝 Existing rules this changes (owner approval needed)

| # | Existing rule | Where it is written (exact reference) | What changes | Phase |
|---|---|---|---|---|
| C1 | The storefront shows a static demo banner on every page ("Demo store. Products and prices are fictional; no real orders or payments.") | `.ai/specs/implemented/2026-10-15-storefront-catalog.md`: Q10 (line 24), G7 (line 42), Phase 1 step 7 (line 253), "Demo banner (R07)" (line 195), Risks R07 (line 230); `R07` in `.ai/specs/product-brief.md` (line 107) | Banner removed. R07 narrowed for the storefront and for product and customer text by the superseding row R11 (Q5, OA-1). Admin keeps its demo-data labels (R11) | 1 |
| C2 | The footer shows the demo notice, and the hero says "one sentence about the demo store" | Storefront catalog spec: G12 (line 47), G14 (line 49), step 10e (line 264: "the footer has … the demo notice") | Footer gets the fictional company block (Q2); hero copy is replaced by the approved copy (Q14, Phase 4) | 1, 4 |
| C3 | Shoppers see "[DEMO]" in seed descriptions ("Seed descriptions keep their `[DEMO]` prefix") | Storefront catalog spec line 299; `packages/database/src/seeders/DatabaseSeeder.ts` header comment (line 15) and category and product descriptions (lines 40–59) | The prefix is removed from seed text (Q1) and from existing demo rows by a one-off update (OA-4a). Admin also loses it (OA-2) | 1 |
| C4 | Cart is a page; "No slide-out cart drawer" | Cart spec G9 (line 50) | A right-side drawer is added. `/cart` stays. Header link and "Add to cart" open the drawer | 2 |
| C5 | Payment step shows a persistent demo banner ("Demo store — this is a demo payment. No real money is charged and no card details are collected.") and the button "Confirm demo payment (no charge)" | Cart spec A9 (line 27), G4 (line 45), step 12 (line 356), `/checkout/pay/[reference]` row (line 270), R03 "Demo banner on the payment step and the confirmation" (line 318) | One note: "Test payment. No money is taken." Button "Confirm test payment" (Q3). R03 "no card fields" still holds | 1 |
| C6 | Shipping reads "Shipping: free (demo store)" | Cart spec G5 (line 46); `packages/app/src/components/checkout/checkout-copy.ts` (`SHIPPING_FREE`) | "Shipping: free" (Q4) | 1 |
| C7 | The product page is one image, a price and a description (no tabs, no gallery) | Storefront catalog spec "Product page" (line 192) | Photo or placeholder, gallery, two columns from 1024 px and tabs are added. The description stays plain text (no HTML) | 3 |
| C8 | Admin shows "[DEMO]" in product and category descriptions and in customer names (demo marking, D08) | `.ai/specs/2026-10-13-commerceos-mvp.md` principle 6 and §3 (demo labelling); `.ai/specs/product-brief.md` R07 (scope "admin"); seeder header comment; `packages/database/src/seeders/demo-store.ts` (customer names, line 180) | The text marker is removed from admin-visible text (Q1 "remove in both places", OA-2). The DEMO- SKU and order references and the demo-data labels stay. This change needs the owner's explicit approval | 1 |
| C9 | A product is demo content when its notes start with `[DEMO]`; drafts get the `[DEMO] ` prefix | `.ai/specs/implemented/2026-10-18-ai-product-descriptions.md` A12 (line 29), A4 step 3 and step 7; `packages/ai/src/descriptions/description-sources.ts` (`isDemoNotes`, `stripDemoMarker`), `draft-product-description.use-case.ts` (`DEMO_PREFIX`) | The discriminator becomes the `DEMO-` SKU (OA-3, required by Q1). Drafts get no `[DEMO] ` prefix (OA-3, approved). Eval fixtures and tests that use the text marker are updated | 1 |

Not changed: URLs, the cart cookie format, the order and payment flow, the stock writers, the seeder's insert-only rule, the admin's labels for demo orders (the `DEMO` badge on `DEMO-` orders) and the demo-data labels on the dashboard, traffic views and Copilot.

## 📝 Protected rule change: R11 supersedes R07 (Q5, OA-1)

The owner approved the narrowing of R07 for the storefront (Q5). This spec does not edit `.ai/specs/product-brief.md`. The first step of Phase 1 is a separate PR to the brief that adds this row and marks R07 "superseded by R11" in its status column. The owner approves the exact text before that PR merges.

Proposed row (the rule table columns are Id, Rule, Applies to, Source, Status, Review by, Required path to change, Owner, Supersedes):

| Id | Rule | Applies to | Source | Status | Review by | Required path to change | Owner | Supersedes |
|---|---|---|---|---|---|---|---|---|
| R11 | Demo data is labelled as demo data wherever fictional figures appear as results: the admin dashboard, the demo traffic views and Copilot answers (D08). Machine markers stay in the database: `DEMO-` SKUs and `DEMO-` order references, with the demo badge on those orders. The storefront shows no demo banner and no "demo store" wording. Its demo framing is limited to the payment note "Test payment. No money is taken.", the fictional company block in the footer, the labelled example values on the product page and the labelled example delivery text. Product, category and customer text carries no "[DEMO]" prefix | admin, Copilot, storefront, checkout, demo | owner decision 1 (2026-10-26; owner answers Q1, Q3, Q4, Q7); D08 | active | trigger: a real customer, a real payment, or a change of D08 | superseding row approved by product owner | product owner | R07 |

R03 is still met: the payment page names the mode ("Test payment") and says no money is taken. Whether "Test payment" counts as a clearly labelled demo under R03 is part of the owner's approval (OA-1).

R07's status cell becomes "superseded by R11 (2026-10-26)". The R07 row stays in the file as history.

## 📝 Affected packages and modules

Packages: `packages/app` (all phases), `packages/database` (seed text, data-only updates, Phase 3 and 4 migrations), `packages/core` (Phase 3 schema validator and DTO; Phase 4 counts), and `packages/ai` (Phase 1, the AI description discriminator, OA-3). No new package.

**Phase 1 (wording, footer, payment note, seed text)**
- `packages/app/src/components/storefront/storefront-copy.ts`: remove `DEMO_NOTICE` and the "demo store" tagline and hero text; keep `STORE_NAME`; set `STORE_TAGLINE` to "Mice, keyboards, headsets, controllers and mousepads for every setup."; add `FICTIONAL_COMPANY` (one object: name "CommerceOS Demo Shop", the label "Fictional company. No address, tax number or contact.", no address, tax or contact fields).
- `packages/app/src/components/storefront/site-footer.tsx`: remove the notice and the "demo store" copyright wording (copyright "© 2026 CommerceOS"); add the fictional company block.
- `packages/app/src/app/(storefront)/layout.tsx`: remove the amber `role="note"` banner.
- `packages/app/src/components/checkout/checkout-copy.ts`: `PAY_BANNER` becomes the one note; `SHIPPING_FREE`; button and paid-confirmation copy (Q3, Q4).
- `packages/app/src/components/checkout/order-summary.tsx`, `order-details.tsx`: copy only.
- `packages/app/src/app/(storefront)/checkout/pay/[reference]/page.tsx`: the note component.
- `packages/app/src/components/account/account-copy.ts` (sign-in note, Q4, OA-10).
- `packages/database/src/seeders/DatabaseSeeder.ts`: category and product descriptions without the `[DEMO] ` prefix; header comment updated. `packages/database/src/seeders/demo-store.ts`: customer names without `[DEMO] `. Only new rows change (the seeder is insert-only), and the DEMO- orders are regenerated on each seed run.
- New one-off data migration in `packages/database/src/migrations/` (data only, see "Data changes", OA-4a).
- `packages/ai/src/descriptions/description-sources.ts`, `draft-product-description.use-case.ts` and the description eval fixtures under `packages/ai/src/evals/descriptions/`: the discriminator uses the `DEMO-` SKU; the draft prefix is removed (OA-3). The tests that name `[DEMO]` are updated with it.
- Tests: `storefront-shell.test.ts`, `checkout-components.test.ts`, `checkout-copy` assertions, `account-components.test.ts`, `DatabaseSeeder.test.ts` (which asserts the `[DEMO]` prefix today), `demo-store.test.ts`.
- E2E assertions that name the old wording: `packages/app/e2e/home.e2e.test.ts`, `checkout.e2e.test.ts`, `purchase.e2e.test.ts`, `customer-isolation.e2e.test.ts`, `admin-orders.e2e.test.ts` (checks "free (demo store)" and the `[DEMO]` customer name), `admin-dashboard.e2e.test.ts` (checks "Confirm demo payment (no charge)"), `product.e2e.test.ts` (checks the `[DEMO]` description). Admin assertions for demo labels stay.
- Protected-text update: `.ai/specs/product-brief.md` (R11 row, R07 status) in its own PR (OA-1). `BACKWARD_COMPATIBILITY.md` only if a URL or cookie changes (none expected).

**Phase 2 (drawer)**
- New: `packages/app/src/components/ui/drawer.tsx` (side sheet built on `@base-ui/react/dialog`, like `dialog.tsx`; `"use client"`; right side at every width; full width below `sm`, `max-w-md` from `sm`; the overlay classes shared with `dialog.tsx`). Exports `Drawer`, `DrawerTrigger`, `DrawerContent`, `DrawerHeader`, `DrawerBody`, `DrawerFooter`, `DrawerClose`, following the existing `dialog.tsx` naming. It is a design-system component: story in `packages/app/stories/design-system/` (Storybook page next to the Dialog story), and a unit test that renders every state (open, closed, with and without the close button).
- New: `packages/app/src/components/cart/cart-drawer.tsx` (client wrapper: open state and the trigger) and `cart-drawer-view.tsx` (hook-free view: title "Your cart (n)", line rows, quantity controls, remove, subtotal, "Checkout", "View full cart", empty state). The view is rendered in unit tests in every state.
- New: `packages/app/src/components/cart/cart-drawer-context.tsx` (tiny client context: `open()`/`close()`), mounted once in the storefront layout. Reason: the header link and the "Add to cart" button both open it; a context is the smallest shared state. No store library.
- Changed: `packages/app/src/components/cart/cart-link.tsx` keeps `href="/cart"` (so without JavaScript the link works), and its click opens the drawer when the context is present.
- Changed: `packages/app/src/components/cart/add-to-cart.tsx` (and `add-to-cart-view.tsx`): on a successful `addToCart` the drawer opens (Q6). The status message stays for the form's own result.
- Cart data: the drawer's lines come from `readCartLines` and the existing cart use cases through a Server Component passed as `children` (or a Suspense slot) into the client drawer, so no cart logic moves into the client. Quantity and remove use the existing `updateCartLine` and `removeCartLine` server actions (`packages/app/src/server/cart/cart.action.ts`). No new action or endpoint.
- Changed: `packages/app/src/app/(storefront)/layout.tsx` mounts the provider and the drawer inside `<Suspense>`.
- Unchanged: `/cart` page (`cart/page.tsx`, `load-cart-page.ts`) and its tests.

**Phase 3 (product page, photos, technical data; migration)**
- New: `packages/app/public/photos/` with the four JPEGs and `CREDITS.md`, copied from `.ai/prototypes/ds/public/photos/` (`hero-desk-curved-monitor.jpg`, `banner-build-your-setup.jpg`, `product-headset-black.jpg`, `product-keyboard-rgb.jpg`; `product-controller-transparent.jpg` is not used, see OA-9). Further product photos come from the second photo set (local branch `design/more-storefront-photos`, not on origin); they must be merged or copied, with their credits, before this phase. Served as static files; no `next.config.ts` change.
- New: `packages/app/src/components/catalog/product-gallery.tsx` (main image plus thumbnail buttons, `aria-pressed` on the active one, each button labelled "Show image 2 of 3", arrow-key support on the thumbnail group; the thumbnail row appears only for two or more images, Q9). View logic (which image is active, labels) in `product-gallery.ts` with unit tests.
- New: `packages/app/src/components/catalog/product-tabs.tsx` built on the existing `packages/app/src/components/ui/tabs.tsx`. Tabs: Description / Technical data / Delivery and returns.
- New: `packages/app/src/components/catalog/product-photo.tsx` (or the existing `ProductImage` extended): shows the mapped photo, or the placeholder "No photo yet". Used by product cards and the product page. Its branching sits in a colocated `product-photo.ts` with unit tests (see "Photo mapping").
- Changed: `packages/app/src/app/(storefront)/products/[slug]/page.tsx` (layout classes: `lg:grid-cols-2`, gallery first in DOM order below 1024 px) and `load-product-page.ts` (adds `technicalSpecs` and `deliveryText` to the view model). The description stays plain text.
- Changed: product card components on the catalog pages (photo or placeholder).
- Changed: `packages/core/src/services/catalog/catalog.dto.ts` (`CatalogProductDetail` gains `technicalSpecs: { label: string; value: string }[]`; the gallery takes the single `imageUrl`).
- Changed: `packages/core/src/validators/catalog/technical-spec.schema.ts` (new): the shape of one row and the array (at most 12 rows, labels 1–60 characters, values 1–200 characters); used by the seeder and the read mapper.
- Changed: `packages/database/src/entities/products/product.entity.ts`: `technicalSpecs` as `jsonb`. A new migration in `packages/database/src/migrations/` (generated by `npm run db:migration:create`, reviewed, committed).
- Changed: `packages/database/src/seeders/DatabaseSeeder.ts`: the demo products get `technicalSpecs` and a photo `imageUrl` when they are **created** (insert-only, see "Data changes").
- Changed: `packages/app/src/components/storefront/` delivery text: the example text (OA-5) is a typed constant in `storefront-content.ts`, shown with its label.

**Phase 4 (home, category photos and counts; migration)**
- Changed: `packages/app/src/app/(storefront)/page.tsx` and `load-home-page.ts`: sections in the order of D4.
- New: `packages/app/src/components/storefront/home-hero.tsx`, `promo-banners.tsx`, `category-tiles.tsx`, `why-buy-here.tsx`, `best-sellers.tsx`. Each is a view with unit tests; branching in colocated `.ts` helpers.
- New content module: `packages/app/src/components/storefront/storefront-content.ts` (hero copy, banner copy, "why buy here" items, the example delivery text, all typed). The approved copy only (Q13, Q14; OA-6). No fact in it that the code does not check.
- Changed: `packages/core/src/services/catalog/` gets one read: published product count per category (`listCategoryCounts`, a new use case with a port method and a unit test with a fake port; an integration test for the query). Best sellers reuse `GetTopProductsUseCase` from `packages/core/src/services/metrics/` unchanged (no second metric computation, AGENTS.md "metric definitions").
- New migration: `categories.image_url varchar(2048) null` (additive; see "Data changes", OA-11a). `packages/core` category DTO and read mapper gain `imageUrl`.
- Changed: `packages/app/src/app/(storefront)/load-storefront-categories.ts`'s neighbour for counts (same React `cache()` pattern).
- Images: hero and banner photos from `public/photos/`, `alt=""` for decorative images (the headset banner photo gets a descriptive alt text, see the prototype fixtures); the existing `public/demo/hero.svg` is removed in this phase if no other page uses it (check with grep first).

**Not touched in any phase:** `packages/app/src/server/*` (except the drawer's use of existing actions), `packages/app/src/server/container.ts`, env, the admin screens' layout and behaviour, the cart cookie format, the checkout and payment use cases, the stock writers.

## 📝 Photo mapping (Q8)

- **Products.** The seeded product definition's `imageUrl` (an existing column) is set to `/photos/<file>.jpg` for each product that has a photo. No new column. Seed data is the mapping, so it stays out of the admin (Q16).
- **Categories.** A new nullable `categories.image_url` column (Phase 4 migration) holds `/photos/<file>.jpg` for a mapped category. Seed data sets it for new categories.
- **Rule on the storefront.** An item "has a photo" when its path starts with `/photos/`. Anything else (an SVG under `/demo/`, empty, or null) shows the placeholder "No photo yet" as a text label. The SVG product images are no longer shown on the storefront. Admin keeps showing `imageUrl` as it does today.
- **Tests.** `product-photo.ts` and `category-photo.ts` branch on the rule and are unit-tested. A unit test in `packages/database` reads the seed definitions and checks that every `/photos/` path has a file under `packages/app/public/photos/` and a line in `CREDITS.md`.
- **Existing databases.** The seeder is insert-only, so rows that already exist keep their old `imageUrl` and `image_url`. Those databases show the placeholder until the one-off update runs (OA-4b, OA-4c). New demo slugs inserted by a later seed run do get their photo.
- **Licences.** Only photos with a recorded licence check go into the seed (OA-9).

## 📝 Data changes

### Demo text (Phase 1, Q1, OA-2, OA-4a)

- The seed text for new rows has no `[DEMO] ` prefix: categories, products, and customer names in `demo-store.ts`. The DEMO- orders are regenerated on every seed run, so their customer names change on the next run.
- Existing demo product and category rows keep the prefix until a one-off data migration runs. It removes the exact prefix `[DEMO] ` only where the row is a seeded demo row: products with a `DEMO-` SKU, categories by seed slug, and orders with a `DEMO-` reference (customer name). It is data-only and idempotent, and it never touches `stock_quantity`, prices, statuses or non-demo rows.
- The demo marker for AI descriptions is the `DEMO-` SKU (OA-3). `isDemoOrderReference` and `DEMO_ORDER_REFERENCE_LIKE` in core are unchanged.

### Product technical data (Phase 3, Q10, OA-4b)

- `products.technical_specs jsonb not null default '[]'` with `check (jsonb_typeof(technical_specs) = 'array')`. Shape: an array of `{ label, value }`; at most 12 rows; label 1–60 characters; value 1–200 characters (Zod in core; the database check only guards the type). No unique constraint needed.
- Migration: additive, one column, no backfill in the migration itself. Integration test: migrate on an empty database, the check rejects a non-array, the default is `[]`, and the schema-drift test passes.
- Seeder: `DatabaseSeeder` sets `technicalSpecs` for **products it creates** only. The seeder stays insert-only (`on conflict do nothing` by slug, AGENTS.md "Database conventions"). Existing demo databases show the neutral line until the owner decides on the one-off backfill (OA-4b, option C of Q10). That backfill is a schema-history step, not a seeder change, and it never touches `stock_quantity`.
- Values for demo products are fictional (AS-10) and the tab carries the note "Example values for the demo store." (Q10).
- Admin cannot edit them in this spec (Non-goals).

### Photos and category images (Phase 3 and 4, OA-4b, OA-4c, OA-11a)

- Product photos: the `imageUrl` value of mapped seeded products (no schema change). Backfill of existing demo rows: OA-4b.
- Category photos: the new `categories.image_url` column (Phase 4 migration, additive, nullable, with a check that a non-null value starts with `/photos/`). Backfill of existing category rows: OA-4c.
- The gallery shows one image now (`imageUrl`). Thumbnails appear when a product has two or more images. No `product_images` table in this spec (Q9). A table comes with image upload (P1).

### Counts and best sellers (Phase 4)

- No schema change beyond the category image column. Category counts are a read query: published products per category (draft excluded, out-of-stock included). Best sellers are `GetTopProductsUseCase` for the last 30 days (paid-order line items, ranked by units, then revenue, then name; the metric definition text is unchanged).

### Seeder marking

- Demo marking discriminators: `DEMO-` SKUs and `DEMO-` order references (`isDemoOrderReference` / `DEMO_ORDER_REFERENCE_LIKE` in core) stay. The `[DEMO]` text markers in descriptions and customer names are removed (Q1, OA-2). The AI description discriminator moves to the `DEMO-` SKU (OA-3). Seeded orders never change stock (seed rule, orders spec A18).

## 📝 Demo wording inventory (Phase 1)

| Where | Current text | Phase 1 result (owner answer) |
|---|---|---|
| `(storefront)/layout.tsx` banner | "Demo store. Products and prices are fictional; no real orders or payments." | Removed |
| `SiteFooter` line | same as above | Removed; replaced by the fictional company block ("CommerceOS Demo Shop", "Fictional company. No address, tax number or contact.") |
| Footer copyright | "© 2026 CommerceOS demo store." | "© 2026 CommerceOS" |
| `STORE_TAGLINE` | "… A CommerceOS demo store." | "Mice, keyboards, headsets, controllers and mousepads for every setup." |
| Hero description (Phase 4 replaces it) | "… Everything here is demo data, so browse freely." | Replaced in Phase 4 by the approved copy (Q14) |
| Product and category description text (seed, storefront and admin) | starts with "[DEMO] " | Prefix removed for new rows (seed) and existing rows (one-off update, OA-4a; approval OA-2) |
| Customer names (seed, orders) | "[DEMO] Name" | Prefix removed (seed; DEMO- orders regenerated; OA-2) |
| Checkout shipping | "Shipping: free (demo store)" | "Shipping: free" (Q4) |
| Payment step banner | "Demo store — this is a demo payment. No real money is charged and no card details are collected." | One note: "Test payment. No money is taken." (C5, Q3) |
| Payment button | "Confirm demo payment (no charge)" | "Confirm test payment" (Q3) |
| Paid confirmation | "Thank you — demo payment received"; "Paid with: Demo payment (no money charged)" | "Thank you — test payment received"; "Paid with: test payment (no money taken)" (Q4) |
| Account sign-in note | "This is a demo store: use any email address. There is no password reset and no email verification." | "Sign-in has no password reset and no email verification." (Q4, limitation kept, OA-10) |
| Admin: `DEMO` badge on `DEMO-` orders; demo-data labels on the dashboard, traffic views and Copilot | demo marking | **Unchanged** (R11, D08) |

## 📝 Proposed Solution

### Phase 1: demo wording, fictional footer, payment note, seed text (risk-high)

0. **Gate.** The R11 row is written into `product-brief.md` by its own PR and approved (OA-1). The AI discriminator decision (OA-3) and the admin approval (OA-2) are recorded. Without them the phase does not merge.
1. **Storefront copy and footer.** Edit `storefront-copy.ts`, `site-footer.tsx`, `layout.tsx`; add `FICTIONAL_COMPANY`. Unit tests in `storefront-shell.test.ts`: no "demo store" text, the fictional block present, no address, tax or contact fields.
2. **Seed text and AI discriminator.** Remove the `[DEMO] ` prefix from the seed definitions (`DatabaseSeeder.ts`, `demo-store.ts`). In `packages/ai`, `isDemoNotes` is replaced by a `DEMO-` SKU check passed from the use case; `stripDemoMarker` and `DEMO_PREFIX` are removed (OA-3). Tests and eval fixtures move with it. A seeded demo product still gets its demo handling (test).
3. **One-off data migration (OA-4a).** Data-only, idempotent, scoped to the seeded demo rows (see "Data changes"). Integration test: an existing database with the old prefix after the migration has none; a non-demo row is unchanged; `stock_quantity` is unchanged.
4. **Checkout and pay copy.** Payment note, button, shipping and paid-confirmation wording (Q3, Q4); the account note (OA-10). Component tests for the note and for "Test payment. No money is taken.". The note has role `note`, is visible and is not dismissible. Keep "no card fields" (R03) as a fact in the code and tests (no card input exists).
5. **E2E and wording sweep.** Update the e2e assertions listed in "Affected packages". A grep step in the PR lists remaining "demo store", "demo payment" and "[DEMO]" strings. The storefront must have none; the admin may keep only the demo-data labels and the `DEMO-` markers.

Acceptance (Phase 1):
- **A1:** no storefront page (home, `/products`, a product, `/cart`, checkout, payment, confirmation, sign-in) shows the amber banner or the words "demo store".
- **A2:** the footer shows the fictional company block ("CommerceOS Demo Shop", labelled fictional, no address, tax number or contact) and no demo notice.
- **A3:** the payment page shows exactly one note, "Test payment. No money is taken.", the button "Confirm test payment", and no card input.
- **A4:** no product, category or customer text shows "[DEMO]" on the storefront or in the admin, for new databases and (after OA-4a) for existing ones. The `DEMO-` SKUs, the `DEMO-` order references and the demo-data labels remain.
- **A5:** the admin keeps its demo-data labels (dashboard, traffic views, Copilot) and the `DEMO` badge on `DEMO-` orders; its other e2e tests pass after the text assertions are updated.
- **A6:** the R11 row exists in `product-brief.md` with the owner's approval recorded (OA-1).
- **A7:** the AI description demo handling works on the `DEMO-` SKU, with no draft prefix (OA-3).
- **A8:** the register check for "CommerceOS Demo Shop" is recorded in the PR (OA-8).
- **A9:** unit coverage 100%; e2e green; 320 px no sideways scroll on home, product, checkout and pay pages.

### Phase 2: cart drawer (risk-high)

1. `ui/drawer.tsx`, its Storybook story and unit tests; DS docs "What is missing" updated.
2. `cart-drawer-context.tsx`, `cart-drawer.tsx`, `cart-drawer-view.tsx` (+ tests in every state).
3. `CartLink` and `AddToCart` integration; layout mounts the provider inside Suspense. The "Added to cart" message is shown inside the drawer when it opens (see "Accessibility").
4. E2E `cart-drawer.e2e.test.ts`; manual keyboard check recorded in the PR.
5. Update `BACKWARD_COMPATIBILITY.md` only for the new client surface (no URL change) and cart spec G9 note.

Acceptance (Phase 2):
- **A10:** the header cart link and each "Add to cart" open a right-side drawer; on 390 px it is full width. "Add to cart" opens the drawer only after a successful add (Q6).
- **A11:** the drawer shows the same lines, quantities, prices and subtotal as `/cart`, read on the server.
- **A12:** quantity plus is capped at stock; "Only N left" appears at the cap; the add button is disabled for a sold-out product (existing rule).
- **A13:** remove and quantity changes work from the drawer; the page behind updates its count.
- **A14:** Escape, the backdrop and the close button close it, focus returns to the trigger; Tab cannot leave the open drawer.
- **A15:** with JavaScript off, the header link goes to `/cart` and "Add to cart" works as a form.
- **A16:** `/cart` unchanged in URL and behaviour (its unit and e2e tests pass).
- **A17:** the drawer does not overflow at 320 px; reduced motion removes the slide.

### Phase 3: product page, photos, technical data (risk-high; migration)

Depends on: Phase 1 and 2 merged (order, Q17); the photo files and their licence check (OA-9); the owner's decisions on OA-4b and OA-5.

1. Migration `technical_specs` with integration test; entity and Zod schema; seed values for created products; unit tests for the seeder (insert-only, no stock change).
2. Photo files and `CREDITS.md` copied; seed `imageUrl` set to `/photos/…` for each product with a checked photo; the mapping test (see "Photo mapping").
3. `product-gallery.tsx` + `product-gallery.ts`; `product-tabs.tsx`; `product-photo.tsx` and the product card photo; the page layout at `lg`.
4. `load-product-page.ts` and DTO additions with tests. The Delivery tab shows the example text with its label (OA-5).
5. E2E `product-page.e2e.test.ts` (two columns, gallery first at 390 px, tabs by keyboard, technical table, a placeholder for an unmapped product).

Acceptance (Phase 3):
- **A18:** at 1024 px and wider the gallery and the details sit side by side; below 1024 px the gallery is first.
- **A19:** the gallery button for each thumbnail has an accessible label and `aria-pressed`; the row is hidden for one image.
- **A20:** tabs switch with the keyboard (arrow keys, Home/End) and the panel is labelled by its tab.
- **A21:** the technical table shows the seeded rows for a new demo product, with the note "Example values for the demo store."; a product without rows shows "No technical data for this product yet.".
- **A22:** the migration applies on a fresh and on an existing database; the check rejects a non-array; no stock value changes.
- **A23:** the Delivery and returns tab shows only the example text with its label (or the neutral line if the constant is removed by the owner).
- **A24:** product cards and the product page show the mapped photo, or "No photo yet" as text; no SVG product image is shown on the storefront.

### Phase 4: home sections, category photos and counts (risk-high; migration)

Depends on: Phase 3 (photo set), the second photo set (local branch `design/more-storefront-photos`, merged or copied, with its credits, OA-9), Q11–Q15 as answered, OA-6, OA-7, OA-11.

1. `listCategoryCounts` use case, port, database adapter and integration test; unit tests with a fake port.
2. Migration `categories.image_url` (additive, nullable, check on the `/photos/` prefix); category DTO and read mapper; category tiles show the photo or "No photo yet".
3. Best sellers through `GetTopProductsUseCase` (unchanged), 30-day window; view helper for ranking and the empty case.
4. Hero (approved copy, hero photo, CTA "Shop all products" to `/products`), promo banners (approved copy and photos), category tiles, "Why buy here" (example delivery text with its label, OA-5), featured section reuse (Q15); `storefront-content.ts`.
5. E2E rewrite of `home.e2e.test.ts`.

Approved copy as shown in the owner-approved prototype (Q13, Q14):
- Hero: "Gear for every desk and every match" / "Mice, keyboards, headsets and desk gear. Stock is shown on every product." / CTA "Shop all products" (to `/products`).
- Banner "Build your setup": "Mousepads for every desk setup." / CTA "Browse desk gear" (to the mousepads category filter). Photo `banner-build-your-setup.jpg`. Claim check: OA-6.
- Banner "Audio for calls": "Gaming headsets for PC and consoles." / CTA "See audio" (to the headsets category filter). Photo `product-headset-black.jpg`. Claim check: OA-6.
- Banner "Low stock" (only when `GetLowStockProducts` returns a published product at or below the threshold): title "Low stock", text "<product name>: <n> left" (template, OA-11b), CTA "View product" (to that product). No photo.

Order of sections: hero, featured slider (unchanged), promo banners, category tiles, "Why buy here", best sellers. Empty states as in "Edge cases".

Acceptance (Phase 4):
- **A25:** the home page shows the sections in the D4 order; each CTA leads to an existing route with the expected filter (the category filter parameter name is checked against the catalog spec in this phase).
- **A26:** category counts equal the published products per category in the seed (integration test); a category with no published products is omitted (Q12).
- **A27:** best sellers list only products with paid orders in the window, names only, no numbers; the section is omitted when empty.
- **A28:** the "Low stock" banner appears only when a published product is at or below the threshold (from `GetLowStockProducts`); it is omitted otherwise, never shown as "all good".
- **A29:** no discount or price-promise text anywhere on the home page (grep test on the content module).
- **A30:** the page has one h1 and no sideways scroll at 320 px; category tiles show their photo or "No photo yet".

## 📝 Security and validation

- **No client prices.** Drawer and product forms post `productId` and `quantity` only (1–99, as today). Prices, totals, stock and availability are read on the server. The drawer shows server prices as the cart page does.
- **No new endpoints.** Drawer actions reuse `addToCart`, `updateCartLine`, `removeCartLine`. Content and counts render in Server Components.
- **Untrusted text.** Technical values and descriptions are rendered as React text (escaped). No `dangerouslySetInnerHTML`. Labels and values are length-capped by Zod at the boundary (seed and read mapper).
- **Images.** Local `/photos/` paths only for the storefront; remote URLs keep the storefront catalog rule G21 (plain `<img>`, `referrerpolicy="no-referrer"`). Only `/photos/` paths earn a photo (see "Photo mapping").
- **Content config is code.** Delivery text, banner copy and the approved hero copy live in a typed TypeScript module reviewed in a PR, not in an env variable (no new env surface; BACKWARD_COMPATIBILITY config rules).
- **Fictional company.** The footer block is static text, carries no tax number, address or contact, and is labelled fictional. It must not resemble a real trader's company data (OA-8).
- **Demo marking remains in the data.** The `DEMO-` SKUs and order references stay in the database and admin; the demo-data labels stay on the admin dashboard, traffic views and Copilot (R11).
- **Logging.** No new logs. Cart cookie invalid-value logging stays as it is (`logInvalid: false` in the layout).
- **Rate limits and auth.** Unchanged. The drawer is a read of the cookie and existing actions; customer and admin guards are not touched.

## 📝 UI/UX and states

- **Drawer:** right side; `max-w-md` from `sm`; full width below `sm` (448 px). Title "Your cart (n)". Loading: skeleton rows. Empty: "Your cart is empty." and "Shop all products". Error (cart cookie unreadable): the cart's existing empty state, never a crash. Notices from auto-corrected lines (cart spec G12, G13) appear at the top, reusing `cart-changes.tsx`.
- **Gallery:** main image with `alt` = product name; thumbnails are buttons labelled "Show image n of m"; the active one has `aria-pressed="true"`. One image: no thumbnail row.
- **Placeholder:** a text label "No photo yet" in the photo's frame (products and category tiles). It is not an image and carries no alt text beyond the label.
- **Tabs:** Description, Technical data, Delivery and returns; arrow keys move between tabs (Base UI or the existing `tabs.tsx`).
- **Labelled examples:** the Technical data tab carries "Example values for the demo store."; the delivery text carries "Example policy:" as its first words (Q7, OA-5).
- **Home:** hero, sections in D4 order, one h1 (hero), section headings h2.
- **Action colour** (`tokeny.md`, prototype rule): red (`action` token) only on Add to cart, Checkout, Place order and the payment confirm button. Promo CTAs and "Shop all" use default or outline buttons.
- **Flat surfaces:** 1 px border, no gradients, no blur (prototype rule from `audyt.md`).

## 📝 Accessibility

- **Drawer focus:** on open, focus moves into the drawer (the close button or the heading); Tab and Shift+Tab stay inside; Escape and the backdrop close it; focus returns to the trigger (header link or "Add to cart"). Base UI provides the trap, the inert page and the return; each is tested in the Storybook test run and checked by hand (Phase 2 acceptance).
- **Status messages inside a modal.** While the drawer is open the page is inert and `aria-hidden`; a `role="status"` outside it is not announced (lesson 2026-10-25). The "Added to cart" message is therefore shown inside the drawer when it opens.
- **Reduced motion:** the slide and fade use `motion-safe:` / `motion-reduce:transition-none`, as in `dialog.tsx`.
- **Labels:** every quantity button has an aria label including the product name; the header link keeps the "Cart (n)" accessible name.
- **Images:** decorative photos (hero, banners) have `alt=""`; the product image has the product name as alt text; the category photo has the category name as alt text.
- **320 px:** no sideways scroll on any page or inside the drawer. Tables (technical data) scroll inside their own container, never the page; the e2e and the existing 320 px checks run on each phase.
- **Contrast:** only existing token pairs; the note on the payment step uses the existing notice colour pair (checked in the design-system contrast step, `.ai/design/kontrast/`).
- **Keyboard:** every new control reachable by Tab; tab order matches reading order below 1024 px (gallery first).

## 📝 Edge cases & failure scenarios

| Case | Expected |
|---|---|
| JavaScript disabled | Header cart link goes to `/cart`; "Add to cart" works as a form; no drawer |
| Cart cookie with a sold-out line | Drawer shows the existing correction notice; count follows the cookie (cart spec G12/G13) |
| Product with no photo (no `/photos/` path) | "No photo yet" text placeholder; no SVG shown on the storefront |
| Existing demo database before the one-off updates | Storefront shows "[DEMO] " text (before OA-4a), placeholders (before OA-4b/c) and the neutral technical line; this is a known state until the owner runs the updates. Stated in the release notes |
| Product with no technical data | Tab shows "No technical data for this product yet." |
| No paid orders in the last 30 days | Best sellers section omitted (OA-7 covers the stale-seed case) |
| No low-stock product | "Low stock" banner omitted |
| Category with no published products | Tile omitted (Q12) |
| Metric or DB error on the home page | The page shows the error for that section (as the featured slider does), never a stack trace; the rest of the page renders |

## 📝 Risks & Impact Review

- **Protected-rule change (R07 → R11, C1–C9).** Mitigated by the superseding row (Q5, OA-1) and by listing every change here. The owner must approve the list knowingly.
- **Admin text (C8).** Removing `[DEMO]` from admin-visible text reduces the labelling the brief asks for on admin pages (R07 scope "admin"). The demo-data labels on the dashboard, traffic views and Copilot and the `DEMO` badge on `DEMO-` orders remain. OA-2 is the owner's explicit approval of this part.
- **AI descriptions.** The `[DEMO] ` prefix is the marker that the implemented AI feature uses (A12). Moving to the SKU marker is required by Q1; drafts get no visible prefix (OA-3, approved). A wrong choice would show a seeded demo product's draft as if it were a real product.
- **Stock and money.** Not touched. The drawer, the product page and the home page only call existing actions and reads, and the one-off migrations never touch `stock_quantity`, prices or statuses.
- **Visible fake data.** Demo data on the storefront becomes less labelled by design (owner decision). Mitigation: the payment note, the fictional footer block, the labelled technical values and the labelled delivery text; best sellers carry no label (OA-7). The risk is accepted only with the owner's approvals.
- **Invented facts.** Delivery, returns, warranty, the banner claims (OA-6) and the sale ranking could look like real claims. Mitigation: Q7 (labelled example), Q11 (real paid-order ranking, names only), Q10 (labelled values), OA-6 (claim check).
- **Schema.** Phase 3 adds one column (`technical_specs`); Phase 4 adds one (`categories.image_url`). Both are additive and nullable or defaulted; the migrations change no existing values.
- **Client state.** A React context for the drawer is client-only; the cart stays in the cookie, so a reload keeps the cart and closes the drawer.
- **Test cost.** The e2e suite gets new assertions in every phase (about seven files change text in Phase 1). Budget for it in each PR.
- **Prototype is not verified in a real browser or a screen reader** (prototype README "Not verified"); Phase 2 has a manual keyboard check.

## 📝 Decisions in play

- **Demo marker (Q1).** Answered: remove `[DEMO]` from shopper-visible and seeded text (both the storefront and the database). The discriminator moves to the `DEMO-` SKU for AI descriptions (OA-3). Existing rows change by a one-off update (OA-4a).
- **Photos (Q8).** Answered: photos wherever a photo is mapped; placeholder "No photo yet" otherwise. Mapping by seed data (`imageUrl`, `categories.image_url`).
- **Gallery data (Q9).** Answered: one image now, thumbnails from two images, no new table.
- **Technical data (Q10).** Answered: option A (jsonb column, seed values for new demo products, labelled). Option C is OA-4b.
- **Drawer state:** React context (recommended, accepted with Q6) rather than a global store or URL state. A URL flag (`?cart=open`) was rejected: it adds a public URL state and does not help without JavaScript.

## 📋 Phasing

Each phase is one PR, shippable alone, with the full gate (lint, format, typecheck, unit coverage 100%, build, integration where the DB changes, e2e for every changed flow). Order: 1 wording, 2 drawer, 3 product page, 4 home (Q17). Phase 2 can ship before Phase 3 because it does not depend on it. Phase 1 must not merge without OA-1, OA-2, OA-3 and OA-8.

## 📋 Implementation Plan

Phase 1, 2, 3 and 4 are detailed in "Proposed Solution" and the steps below are the PR checklist. Each phase starts with a spec check: the owner approvals it depends on are listed in "Owner approvals needed".

### Phase 1: demo wording, fictional footer, payment note, seed text (`risk-high`, one PR)

Depends on: Q1–Q5 answered (done); OA-1 (R11 row written and approved), OA-2 and OA-3 (admin and AI decisions), OA-4a (one-off text update), OA-8 (register check), OA-10 (account note wording).

1. **Brief PR (separate).** Add the R11 row and set R07's status to "superseded by R11 (2026-10-26)". Approved by the owner first.
2. **Storefront copy and footer.** As in "Proposed Solution" step 1.
3. **Seed text and AI discriminator.** As in step 2; tests and eval fixtures updated.
4. **One-off data migration** (OA-4a) with integration test.
5. **Checkout, pay and account copy.** As in step 4.
6. **E2E and wording sweep.** As in step 5.

Acceptance: A1–A9 (above).

### Phase 2: cart drawer (`risk-high`, one PR)

Depends on: Phase 1 merged (Q17).

Steps and acceptance: see "Proposed Solution" (Phase 2) and A10–A17.

### Phase 3: product page, photos, technical data (`risk-high`, one PR; migration)

Depends on: OA-4b (decision on the one-off backfill for existing rows), OA-5 (exact delivery text), OA-9 (photo licences), the photo files.

Steps and acceptance: see "Proposed Solution" (Phase 3) and A18–A24.

### Phase 4: home sections, category photos and counts (`risk-high`, one PR; migration)

Depends on: Phase 3; OA-4c (category backfill), OA-6 (claim check of the banner copy), OA-7 (best sellers), OA-11 (category column and banner template), the second photo set.

Steps and acceptance: see "Proposed Solution" (Phase 4) and A25–A30.

## 📝 Test plan

- Unit (100% coverage, `npm run test:coverage`): every new view, helper and use case; the gallery and tabs helpers, the photo rule helpers (`product-photo.ts`, `category-photo.ts`), the category count mapping, the content module shape, and the AI discriminator on the `DEMO-` SKU.
- Integration (Testcontainers): Phase 1 one-off text migration; Phase 3 migration and check constraint; Phase 4 category count query and the category image check; seeder insert-only behaviour on an existing database.
- Database unit test: every seeded `/photos/` path has a file and a `CREDITS.md` line.
- E2E (agent-browser): `cart-drawer`, `product-page`, rewritten `home`, updated `purchase`, `checkout`, `customer-isolation`, `admin-orders`, `admin-dashboard`, `product` assertions. Screenshots at 320 px and 1280 px for each changed page go into the PR evidence (`needs-qa`, no self-QA: risk-high).
- Storybook: `npm run test:storybook:themes` for the drawer (light and dark, a11y as errors) and the gallery and tabs if they get stories.
- Manual: keyboard walk of the drawer and the tabs; a real phone or a 390 px emulation check (the prototype did not test a real phone).

## 📝 Open questions

Each question was answered by the owner on 2026-10-26. The answer is recorded under the question; where an answer needs a further approval, it is listed in "Owner approvals needed".

1. **[DEMO] in descriptions and names (Phase 1).** Options were: (A) hide the prefix in the storefront view; (B) remove it from the seed text; (C) keep it visible.
   **Answer (owner):** remove "[DEMO]" in both places, the storefront and the database ("usunąć i tu i tu"). Applied: no prefix in seed text; existing rows by a one-off update (OA-4a); the storefront shows no prefix; the admin part needs approval (OA-2); the AI discriminator moves to the `DEMO-` SKU (OA-3). Machine markers and the demo-data labels on the admin dashboard, traffic views and Copilot stay (R11). `stripDemoPrefix` is not built.
2. **Footer company name (Phase 1).**
   **Answer (owner):** "CommerceOS Demo Shop", a fictional company with no legal form, address, tax number or contact. Applied in `FICTIONAL_COMPANY`. The register search is still a pre-merge step (OA-8).
3. **Payment step wording (Phase 1).**
   **Answer (owner):** button "Confirm test payment". Note "Test payment. No money is taken.". Applied in `checkout-copy.ts`.
4. **Other storefront demo wording (Phase 1).**
   **Answer (owner):** all other demo wording changed. Applied: "Shipping: free"; "Thank you — test payment received"; "Paid with: test payment (no money taken)"; the sign-in note as a stated limitation, "Sign-in has no password reset and no email verification." (OA-10 for the exact wording).
5. **R07 superseding row (Phase 1).**
   **Answer (owner):** the narrowing is approved. The brief is not edited by this spec. The exact text is R11 (section "Protected rule change"), to be written by a separate PR and approved before Phase 1 merges (OA-1).
6. **Drawer behaviour (Phase 2).**
   **Answer (owner):** open the drawer after a successful "Add to cart"; the header link is a real link to `/cart` for users without JavaScript. Applied in D3 and Phase 2.
7. **Delivery and returns (Phase 3 and 4).**
   **Answer (owner):** show sample text, labelled as an example, with the owner's wording: "Example policy: delivery in 1–3 working days, 14-day returns." Shown on the Delivery tab and in "Why buy here". Option A (no text) is not used. The exact wording is approved in OA-5.
8. **Photos (Phase 3 and 4).**
   **Answer (owner):** photos wherever possible ("wszędzie zdjęcia gdzie możliwe"): product cards, the product page gallery and each category tile. Unmapped items show "No photo yet". Mapping: seed `imageUrl` for products and a new `categories.image_url` for categories (Phase 4). This supersedes the earlier recommendation to keep SVG product images. The second photo set (local branch `design/more-storefront-photos`) is needed for the missing products and the category tiles. Licences: OA-9.
9. **Gallery (Phase 3).**
   **Answer (owner):** one image now; thumbnails from two images; no new table.
10. **Technical data (Phase 3).**
   **Answer (owner):** option A: a `technical_specs jsonb` column, with fictional seed values for newly created demo products, labelled. The labelling note "Example values for the demo store." is used. Option C (backfill of existing demo databases) is a separate owner decision (OA-4b).
11. **Best sellers (Phase 4).**
   **Answer (owner):** option A: real paid-order ranking from `GetTopProductsUseCase`, last 30 days, names only, section omitted when empty. The caveat (fictional orders, 30-day window on an old seed, no label) is OA-7.
12. **Category tiles (Phase 4).**
   **Answer (owner):** count published products per category; empty categories are omitted.
13. **Promo banner copy (Phase 4).**
   **Answer (owner):** the copy is approved. Applied as written in "Proposed Solution" (Phase 4). The "Low stock" banner comes from `GetLowStockProducts` only. The two banner lines were replaced with catalogue-only copy (OA-6, approved); the "Low stock" template and CTA are approved (OA-11b).
14. **Hero copy (Phase 4).**
   **Answer (owner):** approved without "Everything here is demo data". Applied: "Gear for every desk and every match" / "Mice, keyboards, headsets and desk gear. Stock is shown on every product." / "Shop all products" (OA-6, approved).
15. **Featured section (Phase 4).**
   **Answer (owner):** keep the existing featured slider with category tabs, unchanged (storefront catalog G9–G11).
16. **Admin scope.**
   **Answer (owner):** yes. Technical data and photos stay seed or migration data until the admin catalog spec (E03) and image upload (P1) cover them.
17. **Phase order.**
   **Answer (owner):** 1 wording, 2 drawer, 3 product page, 4 home.

## 📝 Owner approvals needed

All items below were approved by the owner on 2026-10-26 with the recommended option (OA-3, OA-5 and OA-6 with the wording given here). Each item names the phase it gates. The R11 row is still written by a separate PR to the brief (Phase 1, step 1); this spec does not edit the brief.

- **OA-1 (approved 2026-10-26).** R11 supersedes R07 as written in "Protected rule change"; R07's status changes in the brief by a separate PR. "Test payment" with the note "Test payment. No money is taken." is the R03 label. Gates Phase 1.
- **OA-2 (approved 2026-10-26).** Admin text loses "[DEMO]" in product and category descriptions and customer names. Kept: `DEMO-` SKUs and order references, the `DEMO` badge on `DEMO-` orders, and the demo-data labels on the dashboard, traffic views and Copilot. Gates Phase 1.
- **OA-3 (approved 2026-10-26, recommended option).** The AI demo marker moves from the `[DEMO] ` text to the `DEMO-` SKU. Drafts for demo products get no visible prefix. `isDemoNotes`, `stripDemoMarker` and `DEMO_PREFIX` are removed in `packages/ai` in Phase 1, with the tests and eval fixtures. Gates Phase 1.
- **OA-4 (approved 2026-10-26, a, b and c).** One-off data updates for existing databases (phases 1, 3, 4). The seeder is insert-only, so existing rows keep their old values. Each update is data-only, idempotent and scoped to seeded demo rows; none touches `stock_quantity`, prices or statuses.
  - **OA-4a (Phase 1):** remove the `[DEMO] ` prefix from demo product and category descriptions and from the DEMO- orders' customer names. Without it, existing installs show "[DEMO] " on the storefront.
  - **OA-4b (Phase 3):** set `imageUrl` to the `/photos/` path for mapped demo products, and fill `technical_specs` for the demo slugs (Q10 option C). Without it, existing installs show "No photo yet" and an empty technical tab.
  - **OA-4c (Phase 4):** set `categories.image_url` for mapped demo categories.
- **OA-5 (approved 2026-10-26, wording changed).** Sample delivery text: "Example policy: delivery in 1–3 working days, 14-day returns." It has no "demo store" wording and is labelled as an example on the Delivery tab and in "Why buy here". Gates Phases 3 and 4.
- **OA-6 (approved 2026-10-26, banner lines replaced).** The two banner lines name only items in the catalogue: "Build your setup" reads "Mousepads for every desk setup." and "Audio for calls" reads "Gaming headsets for PC and consoles.". The hero copy is approved as written. Gates Phase 4.
- **OA-7 (approved 2026-10-26).** Best sellers from paid orders in the last 30 days, names only, no demo label. A database whose seed is older than 30 days shows no best sellers. Gates Phase 4.
- **OA-8 (approved 2026-10-26).** The footer name "CommerceOS Demo Shop" is approved. The register search is still a pre-merge step: search the Polish company register (KRS, ekrs.ms.gov.pl or rejestr.io) for the name and its main words, and record the result in the Phase 1 PR before merge. This spec did not run it (see "What could not be verified"). Gates Phase 1 merge.
- **OA-9 (approved 2026-10-26).** The photo set and its use are approved. Before the photos are merged, the open items in `.ai/prototypes/ds/public/photos/CREDITS.md` and the licence and credit check of the second photo set (local branch `design/more-storefront-photos`) are recorded in the PR. The controller photo stays unused. Gates Phases 3 and 4.
- **OA-10 (approved 2026-10-26).** Sign-in note: "Sign-in has no password reset and no email verification." Gates Phase 1.
- **OA-11 (approved 2026-10-26).** (a) Nullable `categories.image_url` column (Phase 4 migration, additive, with the `/photos/` check). (b) "Low stock" banner text "<product name>: <n> left" and CTA "View product". Gates Phase 4.

## 📋 Review log

- Spec written 2026-10-26 by an agent from the owner's five decisions and the repository state at commit `dd9902c`. Not yet reviewed by a second model or a human reviewer.
- Updated 2026-10-26 with the owner's answers to Q1–Q17. Changes: Q1 (`[DEMO]` removed; OA-2, OA-3, OA-4a added), Q2 (name), Q3 and Q4 (button and copy), Q5 (R11 text), Q6 (confirmed), Q7 (example text, OA-5), Q8 (photo mapping; Phase 3 and 4 steps), Q9 and Q10 (confirmed; OA-4b), Q11 (OA-7), Q12 and Q13 and Q14 (copy; OA-6, OA-11), Q15 and Q16 and Q17 (confirmed). The `stripDemoPrefix` helper from the earlier draft is removed. The AI-description conflict (C9) was found while applying Q1 and is new.
- Fresh-context review is required before Phase 1 starts (SDLC: risk-high needs a second person; the spec is design-only). The owner approvals OA-1 to OA-11 were given on 2026-10-26; the R11 brief PR is still the first Phase 1 step.

## What could not be verified

- **Footer name against the Polish company register.** The official KRS search was not run from this environment. It is a required pre-merge step (OA-8).
- **Photo licences.** The open items in `CREDITS.md` and the second photo set have not been checked (OA-9).
- **The category filter parameter name** (`?category=` or similar) used by the banner CTAs. To be checked against the storefront catalog spec in Phase 4.
- **`GetTopProductsUseCase` with a 30-day window ending today** on a seeded database: the seeded orders end on the seed date, so the section depends on the seed's age (OA-7).
- **The prototype's visual and keyboard behaviour in a real browser or screen reader.** The prototype walk was headless; the Chrome extension was not connected.
- **The gate.** This PR changes only a Markdown spec, so lint, typecheck, tests, build, integration and e2e were not run. Nothing in `packages/` was touched.
- **Current e2e text matches.** Named from grep (`home`, `checkout`, `purchase`, `customer-isolation`, `admin-orders`, `admin-dashboard`, `product`); the exact lines are found in Phase 1, not here.
- **Behaviour of `GetTopProductsUseCase` on the storefront** (cache, performance) and of Base UI's focus return inside a server-rendered children slot. Both are checked in Phases 2 and 4.

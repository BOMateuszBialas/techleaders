# Storefront visual refresh (2026-11-04)

Status: implemented on the working tree, not yet merged. Owner: product owner (requests in the
session of 2026-11-04). Scope: the storefront only (`packages/app/src/app/(storefront)`, storefront
components, product card, one data migration). The admin keeps its scale and layout.

## Owner decisions (override earlier spec text)

| Area | Earlier rule | New rule |
|---|---|---|
| Storefront width | 1120 px content (`max-w-6xl`) | 1440 px outer width, token `--storefront-width` (gutters included) |
| Type scale | Default scale | Every storefront size +2 px, token override under `:root:not(:has([data-density="admin"]))` |
| Home hero | Two columns, photo beside the text | Full-bleed photo at 50 vh (min 380 px), text panel bottom-left on a translucent surface |
| Featured products | Arrow-less scroll-snap row (spec G10: no JavaScript, no arrows) | Scroll-snap track paged by dots, mouse drag, no scrollbar. JavaScript allowed for this one component |
| Product card | Flat bordered card, small add-to-cart | Translucent panel, mono category tag and price, full-width `action` (red) add-to-cart, whole card links to the product |
| Why buy here | Four text blocks | Four glass panels with a line icon and a number |
| Best sellers | Numbered names | Ranked cards with the product photo, a link when the product is still published, units sold |
| Collection photos | Placeholders for most demo products | Each demo product in a collection shows a collection photo (migration `Migration20261104090000_demo_collection_photos`) |

Decisions that stay: one action colour (red, `--action`, rule R03.1 in `.ai/design/referencje.md`),
rounded 12 px cards, owner data never overwritten by migrations (only rows still holding the
seeded SVG path change).

## Files

- `packages/app/src/app/globals.css`: width token, storefront type scale, `.storefront-hero`, `.featured-track`.
- `packages/app/src/app/(storefront)/layout.tsx`, `components/storefront/site-footer.tsx`: width token, `overflow-x-clip` on `main`.
- `components/storefront/home-hero.tsx`: full-bleed hero.
- `components/storefront/featured-carousel.tsx` and `featured-carousel-state.ts` (+ `.test.ts`): dots, drag, slide maths. No ref in render.
- `components/storefront/featured-products.tsx`: uses the carousel.
- `components/catalog/product-card.tsx`: new card; `components/cart/add-to-cart(-view).tsx` gain a `fill` option.
- `components/storefront/why-buy-here.tsx`, `storefront-icons.tsx`, `storefront-content.ts` (icon per item).
- `components/storefront/best-sellers.tsx` and `app/(storefront)/load-home-sections.ts`: `loadBestSellers` joins the ranking with published products.
- `packages/database/src/migrations/Migration20261104090000_demo_collection_photos.ts` + integration test; `DatabaseSeeder.ts` points the demo products at the same photos for fresh databases.

## Validation

- Unit: full suite green, coverage 100% (statements, branches, functions, lines).
- Integration: `demo-collection-photos.int.test.ts`, `demo-product-media.int.test.ts`, `demo-store.int.test.ts` green.
- E2E: home, product-page, catalog, storefront-mobile, cart-drawer, admin-products, purchase (see the run log of the session).
- `check:tokens` OK. Lint: no errors (existing warnings in `.ai/prototypes` only).

## Known gaps

- Product photos in a collection are stand-ins: the same photo appears on several products. Replace them with each product's own photo through the admin.
- The `qa-*` products left in a local database by e2e runs were given photos by hand, not by migration.
- Mobile layout (320 px) and the cart drawer were not inspected visually in this pass.
- The horizontal overflow fix (`overflow-x-clip` on `main`) was checked in headless Chrome, which hides scrollbars; check on a machine with classic scrollbars.

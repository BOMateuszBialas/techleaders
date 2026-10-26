# Run: storefront v2 Phase 4 (home page)

- Date: 2026-10-26
- Branch: `feat/storefront-phase-4-home` from `origin/main` (59cfc48, Phases 1 and 2 already on main)
- Spec: `.ai/specs/2026-10-26-storefront-design-implementation.md`, Phase 4 (A25–A30), owner approvals OA-1 to OA-11

## Goal

Implement Phase 4 only: hero with CTA, featured slider (unchanged), promo banners, "Low stock" banner, category tiles with published counts, "Why buy here", best sellers (30 days, paid orders, names only). No migration.

## Steps and decisions

1. `CatalogReadPort.countPublishedProductsByCategory` (database adapter: one grouped query, zero counts kept) and `ListCategoryCountsUseCase` (drops zero counts). Integration test compares the counts with `findProducts` per category.
2. `LowStockRow` gained `slug` (additive) so the banner links to the product. Fixtures in core, ai, app updated.
3. Photos: three JPEGs copied with `git show HEAD:<prototype path>` (hash-equal to their blobs), credits file for those three. The prototype's full credits file and its open items stay in the prototype.
4. Content in `storefront-content.ts` (approved copy only). A unit test checks no discount or price promise (A29).
5. Views: `home-hero`, `promo-banners`, `category-tiles`, `why-buy-here`, `best-sellers`, `home-section-unavailable`. Each section loads through its own loader (`load-home-sections.ts`); a failing section shows its own alert.
6. Product images without a photo show "No photo yet" (was "No image"); applies wherever `ProductImage` is used, including the admin.
7. `public/demo/hero.svg` removed (no other user).
8. Category tiles: neutral "No photo yet" in the photo slot. No `categories.image_url` (waits for the data migration, OA-11a).
9. Layout: `aspect-[4/3]` flagged by `check:tokens`; switched to `aspect-video`.

## Outcome

Gate on the final tree: typecheck, lint (0 errors; 2 pre-existing warnings), format:check, check:tokens, test:coverage (178 files, 2025 tests, 100%), test:hooks, build, test:integration (21 files, 185 tests, run before the last CSS-only change), build-storybook, test:storybook:themes (62 files, 302 tests), test:e2e (24 files, 131 tests, run before the last CSS-only change), and the home e2e file re-run on the final build (12 tests).

## Follow-ups

- Category images: `categories.image_url` migration (OA-11a, OA-4c backfill). Tiles then show the photo.
- E2E "best sellers hidden when empty" and "low-stock banner omitted" are not covered end to end (the shared e2e database always has both); covered by unit tests and Storybook play tests.
- 320 px visual check and real photos on screen: asserted by e2e (no sideways scroll), not inspected by eye.
- Photo licences for the three photos: open items in `packages/app/public/photos/CREDITS.md` (OA-9).

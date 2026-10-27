# Run: Category images on the home tiles (OA-11a, OA-4c)

- Date: 2026-10-27
- Branch: `design/category-images` from `origin/main` (743a491)
- Spec: none written. The brief in the run request is the scope (schema, backfill, seeder, tile, tests). The work is a small additive schema change plus a data update.
- Risk: medium as requested by the owner. Note: SDLC.md infers `risk-high` for a schema migration; the PR carries `risk-medium` on the owner's instruction, and the label comment says so.

## Goal

Home category tiles show the photo from `categories.image_url` (OA-11a) and the seeded demo categories get their photos on existing databases (OA-4c). A category without a photo keeps "No photo yet".

## Steps and decisions

1. Schema: nullable `image_url varchar(2048)` on `categories` (`CategorySchema.imageUrl`, `Migration20261027100000_category_image`, additive, down drops the column).
2. Backfill (data only): `Migration20261027100100_demo_category_images`. Sets the photo only where `image_url` is null and the slug matches (`mice`, `keyboards`, `headsets`, `controllers`, `mousepads`). `down` nulls only the value it wrote. Kept as a separate migration from the schema change, following the repo's pattern (`Migration20261026173123` schema, `Migration20261026180000_demo_product_media` data).
3. Seeder: `DEMO_CATALOG` categories carry `imageUrl`; `seedCatalog` inserts it (insert-only, `onConflict ignore`, unchanged). A fresh install gets the photos; existing rows are handled by the backfill. Chosen over a second "update where null" pass in the seeder, because the seeder must not touch existing rows (A18).
4. Read path: `CatalogCategoryRecord.imageUrl` and `CatalogCategoryCountRecord.imageUrl` (port), `CategoryCount.imageUrl` (`ListCategoryCountsUseCase`), `DatabaseCatalogRepository` selects `c.image_url`. The admin DTOs and screens are unchanged.
5. Tile: `category-tiles.tsx` uses `photoSrc` (the storefront photo rule: only `/photos/` paths) and `next/image` (unoptimized, `fill`, decorative `alt=""` because the link names the category). The keyboard tile reuses `/photos/product-keyboard-rgb.jpg` (owner decision, CREDITS.md). No monitors category or photo.
6. Fix found by the build: the inferred entity type makes a nullable column `T | undefined`, so `category.imageUrl` needed `?? null` for the strict app build; `tsc` in `packages/database` alone had passed. The branch is covered by a unit test that passes `imageUrl: undefined`.

## Tests

- Unit: `list-category-counts.use-case.test.ts` (photo carried, null kept), `database-catalog-repository.test.ts` (count mapping, `imageUrl` null/undefined), `DatabaseSeeder.test.ts` (photos on the seed rows, null for a category without one, exactly five demo photos), `demo-photos.test.ts` (category photos have files and CREDITS lines), `home-sections.test.ts` (photo rendered, label kept, demo SVG not shown).
- Integration: `packages/database/src/seeders/demo-category-images.int.test.ts` (column type and nullability; up sets only nulls, keeps the owner photo, no other change; read path carries the photo; idempotent; down reverses exactly; schema down and up).
- Storybook: `Storefront/Home sections` category tiles story shows two photos and one label; its play test checks the image count.
- e2e: `home.e2e.test.ts` tile check reads the `img` src for mice and headsets and asserts no "No photo yet" in the tiles.

## Commands run (worktree)

| Command | Result |
|---|---|
| `npm ci` | ok |
| `npm run lint` | pass, 0 errors; 2 pre-existing warnings in `.ai/prototypes/ds` |
| `npm run format:check` | pass |
| `npm run check:tokens` | pass |
| `npm run check:agents` | pass |
| `npm run test:hooks` | pass, 334/334 checks, 9 known gaps still open |
| `npm run typecheck` | pass |
| `npm run test:coverage` | pass, 193 files, 2156 tests, 100% statements/branches/functions/lines |
| `npm run build` | pass (after the `?? null` fix; first run failed the strict app type check) |
| `npm run test:integration` | pass, 23 files, 199 tests (Testcontainers) |
| `npm run test:e2e` | pass, 25 files, 144 tests (after build) |
| `npm run build-storybook` | pass |
| `npm run test:storybook:themes` | pass, 74 files, 356 tests (light and dark) |

Visual check: Storybook static build served locally, agent-browser screenshots of the category tiles story at 320 px and 1440 px, light and dark. Photos show in the tiles; "No photo yet" shows on the Mousepads-style empty slot; text and tile frames stay inside the 320 px width. The mouse photo is portrait and is cropped (object-cover) to landscape; the mouse stays visible.

## Not done

- No admin category screen change (out of scope).
- No new photos; no monitors category.
- No migration generator run (blocked by the hook); migrations were written by hand in the existing format.

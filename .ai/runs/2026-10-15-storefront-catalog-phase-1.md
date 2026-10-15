# Run: storefront catalog, Phase 1 (E01-S01, #14)

- Source doc: `.ai/specs/2026-10-15-storefront-catalog.md`
- Branch: `feat/storefront-catalog-phase-1`
- Engine: om-auto-create-pr (steps: 10, --loop: no)

## Goal

Shoppers browse published products at `/products`, narrow them by category (`?category=<slug>`) and open a product page at `/products/<slug>`; drafts never appear. Phase 1 of the spec only (steps 1–10).

## Scope

- `core`: `getAvailability`, `CatalogReadPort`, slug + catalog query schema (category only), catalog use cases and DTOs.
- `database`: `DatabaseCatalogRepository`, `toContainsPattern`, seeder `status`/`imageUrl`, `[E2E]` catalog fixtures.
- `app`: container wiring, `(storefront)` layout (header, demo banner), home with category list, `/products`, `/products/<slug>` + not-found, loaders, `components/catalog/*`, demo SVGs, e2e tests.
- Docs: `BACKWARD_COMPATIBILITY.md` §1, README current state.

## Non-goals

- Phase 1b (hero, featured slider, header menu, footer, `featured` column) and Phase 2 (`?q` search) — separate PRs.
- Cart slots: product cards and header leave room for the cart (G22) but render nothing for it.
- No migration, no new dependency, no `next.config.ts` change.

## Implementation Plan

### Phase 1: browse by category and product details (E01-S01)

1. Core domain and port.
2. Core use cases and DTOs.
3. Slug and catalog query schema (category part).
4. Seeder and fixtures.
5. Database adapter (+ integration test).
6. Container wiring.
7. Storefront layout and home.
8. Listing page (+ e2e).
9. Product page (+ e2e).
10. Docs and gate.

## Risks

- Streamed `notFound()` answers HTTP 200 + `noindex` (Q4); the e2e test asserts the actual status.
- Moving `page.tsx` into `(storefront)` changes the home e2e expectations; the admin e2e "back to storefront" step waits for home text.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: browse by category and product details

- [ ] 1.1 Core domain and port
- [ ] 1.2 Core use cases and DTOs
- [ ] 1.3 Slug and catalog query schema (category part)
- [ ] 1.4 Seeder and fixtures
- [ ] 1.5 Database adapter
- [ ] 1.6 Container wiring
- [ ] 1.7 Storefront layout and home
- [ ] 1.8 Listing page
- [ ] 1.9 Product page
- [ ] 1.10 Docs and gate

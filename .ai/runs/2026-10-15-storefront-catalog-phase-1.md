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

PR: #34

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: browse by category and product details

- [x] 1.1 Core domain and port — 8965872
- [x] 1.2 Core use cases and DTOs — 8965872
- [x] 1.3 Slug and catalog query schema (category part) — 8965872
- [x] 1.4 Seeder and fixtures — ded8fdf
- [x] 1.5 Database adapter — 91463ae
- [x] 1.6 Container wiring — 8bd52ff
- [x] 1.7 Storefront layout and home — aeb8403, ead7ba4
- [x] 1.8 Listing page — aeb8403, 66b7c6a
- [x] 1.9 Product page — aeb8403, 66b7c6a
- [x] 1.10 Docs and gate — 376447d

## Outcome

- Full gate green locally (lint, format, typecheck, unit 183 tests at 100% coverage, build, integration 28, e2e 22).
- Bug found by e2e and fixed: `instanceof NotFoundError` failed across Next.js server chunks; errors now match by code (`isNotFoundError`), lesson recorded.
- Deviations recorded in the spec's "Implementation notes, Phase 1".

## Follow-ups

- `apiHandler` maps errors with `instanceof`, so it has the same cross-chunk risk; switch it to code matching.
- Phase 1b (home page as a shop front) and Phase 2 (search, #15).

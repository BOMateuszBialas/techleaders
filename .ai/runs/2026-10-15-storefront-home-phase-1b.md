# Execution plan: storefront home as a shop front (Phase 1b) + gaming demo catalog (D10)

- Source doc: `.ai/specs/2026-10-15-storefront-catalog.md` (Phase 1b, steps 10a–10e; grill-me G1, G9–G22)
- Branch: `feat/storefront-home-phase-1b`
- Refs #14 (Phase 1b has no issue of its own). Phase 2 (search, #15) is a separate PR.
- Engine: om-auto-create-pr (steps: 9, --loop: no)

## Goal

The home page `/` looks like a normal shop (hero, featured-products slider with category tabs, header menu, footer), backed by a new `featured` product flag, and the demo store sells gaming accessories instead of coffee (product owner decision D10, 2026-10-15).

## Scope

- **D10 catalog switch:** decision record `D10`, product-brief Decisions row, spec grill-me row `G23`; seed with 5 gaming categories and 15 products (PLN prices, `[DEMO]` descriptions, `DEMO-` SKUs, local SVGs, one or more out of stock, ~6 featured across ≥3 categories); coffee SVGs and seed rows removed; every test, fixture, e2e assertion and README example updated.
- **10a:** `featured` boolean column (default false, indexed) + reviewed migration; seed and `[E2E]` fixtures set it.
- **10b:** featured read model (criteria flag on the existing port + `ListFeaturedProductsUseCase`, max 12, sorted by name, unknown category → all).
- **10c:** storefront shell: header menu (logo, "Shop all", category links, empty cart slot, mobile `<details>`), footer (store line, categories, "Owner sign-in", demo notice, copyright); "Admin" leaves the header.
- **10d:** home page: static hero with local SVG, featured tabs (`/?category=<slug>`), CSS scroll-snap slider, empty state.
- **10e:** e2e rewrite of `home.e2e.test.ts`, `BACKWARD_COMPATIBILITY.md` §1 (`/?category`), README note.

## Non-goals

- Phase 2 search (`?q`), the cart, admin "featured" checkbox (admin catalog spec), visual design (after the design-system lesson, G15).
- `packages/app/src/server/http/api-handler.ts` and `packages/core/src/errors/app-error.ts` (issue #36, parallel work).
- Destructive seed cleanup of old coffee rows in existing local databases (documented in README instead).

## Implementation Plan

### Phase 1: gaming demo catalog (D10)

1. Decision record D10, product-brief row, spec G23.
2. Seed catalog, SVGs, fixtures and every coffee reference in tests, e2e and README.

### Phase 2: featured column (10a)

3. `featured` on `ProductSchema`, migration, seed + fixture flags, tests.

### Phase 3: featured read model (10b)

4. Port criteria `featured`, `ListFeaturedProductsUseCase`, adapter, container wiring, unit + integration tests.

### Phase 4: storefront shell (10c)

5. Header menu and footer components, layout wiring, unit tests.

### Phase 5: home page (10d)

6. Hero, featured tabs and slider, `load-home-page.ts`, unit tests.

### Phase 6: e2e and docs (10e)

7. `home.e2e.test.ts` rewrite (+ mobile menu viewport), other e2e updates.
8. `BACKWARD_COMPATIBILITY.md`, README, spec implementation notes, lessons.

### Phase 7: gate

9. Full validation gate.

## Risks

- Schema migration (`risk-high`): additive column with a default; forward-only.
- Existing local databases keep the old coffee rows (upsert by slug never deletes); README documents a manual reset.
- Header and footer read categories inside `<Suspense>`; the layout must stay prerenderable (cacheComponents).

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: gaming demo catalog (D10)

- [x] 1.1 Decision record D10, product-brief row, spec G23 — 2bea3fc
- [x] 1.2 Seed catalog, SVGs, fixtures and coffee references — 89c00c6

### Phase 2: featured column (10a)

- [x] 2.1 Featured column, migration, seed and fixture flags — 831b250

### Phase 3: featured read model (10b)

- [x] 3.1 Featured criteria, use case, adapter and wiring — 7bf08ff

### Phase 4: storefront shell (10c)

- [x] 4.1 Header menu and footer — 6e1e375

### Phase 5: home page (10d)

- [x] 5.1 Hero, featured tabs and slider — 3e97858

### Phase 6: e2e and docs (10e)

- [x] 6.1 E2E home rewrite and updates — 6d70570
- [x] 6.2 Docs, spec notes and lessons — accae98

### Phase 7: gate

- [x] 7.1 Full validation gate — gate green 2026-10-15 (lint, format, typecheck, coverage 100%, build, integration 31, e2e 26)

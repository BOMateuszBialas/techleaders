# Run: demo store seed (E04-S03, #24) — Phase 2 of the orders/dashboard/demo-store spec

- Source doc: `.ai/specs/implemented/2026-10-16-orders-dashboard-demo-store.md` (Phase 2, steps 6–9; moved to `implemented/` in this PR, the last E04 phase)
- Issue: #24 (E04-S03)
- Branch: `feat/demo-store-phase-2`, started from `feat/admin-orders-phase-1` (Phase 1, #50) while #50 waited for CI; after #50 was squash-merged (7f3b5da) the two Phase 2 commits were replayed onto `origin/main` by cherry-pick, so the diff holds Phase 2 only
- Engine: om-auto-create-pr (steps: 4, --loop: no); lane A of a parallel session (lane B builds Phase 3, the dashboard)
- Mode: autonomous (owner away); judgment calls under "Decisions"

## Goal

`npm run db:seed` on an empty database gives the whole demo: catalog, stock, a fictional `DEMO-` order history and fictional traffic over a rolling 35-day window ending on the seed date (D08); running it again creates no duplicates and never overwrites the owner's edits (A18); demo data is visibly marked and never presented as real customer data (R07).

## Scope

- `core`: `domain/traffic/demo-traffic.ts` (`TRAFFIC_SOURCES`, `DEMO_TRAFFIC_LABEL`)
- `database`: `entities/traffic/traffic-daily-stat.entity.ts`, `entities/traffic/product-view-daily-stat.entity.ts`, `Migration20261017130131_demo_traffic`, `seeders/demo-store.ts` (pure generator, `mulberry32`), `seeders/DatabaseSeeder.ts` (insert-only catalog, `seedDemoStore`)
- `app`: e2e on the seeded store (Demo badge, fictional-customer note); the badge and note themselves shipped in Phase 1
- Docs: README (demo store, re-seed behaviour, fictional traffic), AGENTS.md seeder rule, `BACKWARD_COMPATIBILITY.md` §5

Non-goals: any reader of the traffic tables (E05-S04, #28), the dashboard (Phase 3, lane B), auto-seed on start (A20).

## Decisions

- **Insert-only uses `on conflict do nothing` without a target** (query builder `onConflict().ignore()`), not `on conflict (slug)`: a demo product whose SKU now belongs to an owner's product is then skipped with a warning instead of crashing the seed (spec Demo store seed, "skipped with a seed warning, never a crash"). The spec's open note ("`onConflictAction: "ignore"` on `em.upsert` versus `em.insert` with `onConflict().ignore()`") is settled in favour of the query builder; integration-tested.
- **Lines are priced from the seed catalog** (`DEMO_CATALOG`), ids come from the database by slug: an owner's later price edit does not rewrite the demo history, which is the snapshot semantics of real orders.
- **Status mix**: ≥ 7 days old shipped, 3–6 days processing, 0–2 days paid; cancelled = the second order 20 and 4 days ago, refunded = the second order 11 days ago. Each day's first order in the last 7 days carries two Pulse mice, so "Pulse is the best seller of the last 7 days" holds by construction, not by luck of the PRNG.
- **Traffic is derived upward and split top-down by source** (checkouts, then extra add-to-carts, views, sessions), so each source row satisfies the funnel check exactly; per product and day `views ≥ add-to-carts ≥ units ordered` (all orders that day, cancelled included). `traffic.product_views` and `add_to_carts` per day equal the sums of the product rows.
- **Titan gets no add-to-carts after its last sale** (it is out of stock, so adding it to a cart is impossible), but keeps base views ("views continue").
- **A seed that runs before 08:00 store time leaves today without orders** (timestamps stay 08:00–22:00 and never after the seed instant); traffic rows still cover today.
- **`DatabaseSeeder` takes an optional clock** (`new DatabaseSeeder(() => date)`) so tests fix the seed date; `orm.seeder.seed(DatabaseSeeder)` keeps using "now". The seed warning goes to `console.warn` (dev CLI output, like `cli/seed.ts`).
- **Migration generated on a throwaway PostgreSQL 17 container** (not the shared local database) so it contains only this phase's tables; renamed with the `_demo_traffic` suffix, SQL reviewed against the Data Model.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 2: Demo store seed

- [x] 2.6 Traffic entities and migration — cb5c155
- [x] 2.7 Generator (`demo-store.ts`) with unit tests — cb5c155
- [x] 2.8 Seeder: insert-only catalog, `seedDemoStore`, integration tests — cb5c155
- [x] 2.9 Labels e2e, docs, full gate — ed587c6

## Outcome

- Rebased onto `origin/main` after Phases 1 (#50) and 3 (#51) merged; no conflicts.
- Full gate on the rebased branch, all green: lint, format:check, typecheck, test:coverage (988 tests, 100 % on all four metrics), build, test:integration (105 tests), test:e2e (67 tests, including the Phase 3 dashboard suite now running on the full seeded store).
- E04 spec moved to `.ai/specs/implemented/`.

## Follow-ups

- The traffic tables have no reader until E05-S04 (#28), which must label the data as fictional.

# Run: admin catalog management, Phase 2 (manual stock adjustment with history)

- Date: 2026-10-16
- Brief: Implement Phase 2 (steps 15–19, E03-S03) of the admin catalog spec: the stock panel on `/admin/products/<id>` with the conditional absolute set (A5), the stale message, and the recorded history (last 20).
- Source doc: `.ai/specs/implemented/2026-10-15-admin-catalog-management.md` (moved from `.ai/specs/` in this run: last phase)
- Issue: #21 (closes with this phase)
- Branch: `feat/admin-stock-phase-2` (worktree `tl-wt-stock`)
- Engine: om-auto-implement-spec → implemented directly following the om-auto-create-pr flow (steps: 7, --loop: no)

## Goal

The signed-in owner sets a product's stock to an absolute quantity. The change applies only while the stored stock still equals the quantity the page showed, so a concurrent change is never overwritten; a stale page is told the current value and reset to it. Every applied change is recorded (time, previous, new) in the same transaction and listed on the product page. A negative quantity is refused with a field error. Admin and storefront show the new availability.

## Scope

- `core`: `stockQuantitySchema`, `setStockSchema`, `StockRepositoryPort`, `StaleStockError` / `isStaleStockError`, `AdjustStockUseCase`, `ListStockAdjustmentsUseCase`, `StockAdjustment` DTO, in-memory fake.
- `database`: `StockAdjustment` entity, migration `Migration20261016115407_stock_adjustments`, `DatabaseStockRepository`, `toStockWriteError`.
- `app`: container wiring, `stock.action.ts`, stock panel view + thin wrapper, `stock-copy.ts`, product page and loader, edit form without the read-only stock line.
- Docs: README, BACKWARD_COMPATIBILITY §5, AGENTS.md (single writer of `stock_quantity`), spec notes + move to `implemented/`, lessons.

## Non-goals

- Checkout decrements (E02-S02), reason/source columns, low-stock badge (G8), fixing the seeder (#24), follow-up #41.

## Decisions

- The initial stock of a new product is **not** recorded (spec Data Model, A6 minimalism); the panel says so.
- The use case validates its own input (text or numbers), so invalid quantities never reach the port; the create-product schema reuses the same `stockQuantitySchema`.
- An "unchanged" request is checked against the stored value: equal → `unchanged`, nothing written; different → stale.
- Stale → `StaleStockError` (a `ConflictError` with `currentQuantity`); the action returns N as both form values, so the panel resets to N.
- The panel form is `noValidate` so `-1` reaches the server and its field error shows.
- The availability preview is a static sentence by status (deviation from a live preview; recorded in the spec).
- History times: owner's locale from `Accept-Language`, store time zone `Europe/Warsaw`.

## Progress

- [x] 1 Core: schemas, port, error, use cases, unit tests — 1dfe1a5
- [x] 2 Database: entity, migration (generated on a throwaway PostgreSQL 17 on port 55439, reviewed), adapter, unit + integration tests — 533eae1
- [x] 3 App: container, action, stock panel, page, unit tests — 9bca4e6
- [x] 4 E2E: no-session redirect of a product page, 8 → 0 with history row, −1 refused, storefront out of stock — e2e commit
- [x] 5 Docs, spec notes, spec moved to `implemented/`, lessons
- [x] 6 Full validation gate
- [x] 7 PR

## Validation (local, final code)

- `npm run lint` exit 0 · `npm run format:check` exit 0 · `npm run typecheck` exit 0
- `npm run test:coverage` exit 0: 539 tests, 100% statements / branches / functions / lines
- `npm run build` exit 0
- `npm run test:integration` exit 0: 55 tests (new: 9 stock repository tests incl. rollback, stale, concurrency, constraints, cascade; the drift test stays empty)
- `npm run test:e2e` exit 0: 41 tests (new `admin-stock.e2e.test.ts`, updated `admin-products.e2e.test.ts`)

## Outcome

Phase 2 implemented; the spec is fully implemented and moved to `.ai/specs/implemented/`. The dev database and the main checkout were not touched (all tests use Testcontainers).

## Follow-ups

- #24: the seeder resets demo products' stock without a history row (documented).
- E02-S02 (#17): checkout decrements should use the same conditional update and, if wanted, an additive `source` column on `stock_adjustments`.
- #41 (sticky "created" banner, 0.00 PLN price) remains open.

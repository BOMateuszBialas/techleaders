# Run: admin catalog management, Phase 1b (products and "Featured on home page")

- Date: 2026-10-16
- Brief: Implement Phase 1b (products, publish/unpublish with the stated effect, duplicate slug/SKU errors, "Featured on home page") of the spec; Phase 2 (stock adjustment) is a separate PR.
- Source doc: `.ai/specs/implemented/2026-10-15-admin-catalog-management.md`
- Issue: #20 (closes with this phase)
- Branch: `feat/admin-catalog-phase-1b`
- Engine: om-auto-create-pr (steps: 9, --loop: no)

## Goal

The signed-in owner lists products (sorted by name, with availability and "Featured" badges), creates a product with its initial status and stock, edits its details (stock is read-only after creation, spec A14), publishes or unpublishes it with the effect stated before the click, and marks it "Featured on home page". Duplicate slugs and SKUs show a field error and keep the typed values.

## Scope

- `core`: `getStoreAvailability`, `describeStoreAvailability`, `normalizeSku`, `parsePriceInput`, `formatPriceInput`, `MAX_PRICE_MINOR`, `productInputSchema` / `createProductInputSchema` / `productStatusSchema`, `ProductRepositoryPort`, product use cases.
- `database`: `DatabaseProductRepository` (list by name, get, create, update without stock, set status), constraint mapping reused from `toCatalogWriteError`.
- `app`: container wiring; `product.action.ts`; `/admin/products`, `/new`, `/[id]`; view + thin `"use client"` wrapper forms (A15); publish control; image preview (G6); "Products" sidebar link; category page product names link to the product pages.
- Docs: README, BACKWARD_COMPATIBILITY §1, AGENTS.md, spec implementation notes, lessons.

## Non-goals

- Phase 2 (stock adjustment and history), product deletion (A4), pagination, low-stock badge (G8).
- No schema change: `products.featured` exists since #37.

## Decisions (given by the caller)

- Stock is set only on create (A14 / cross-model review wins over step 13's e2e text). The e2e step "set stock to 0 in the edit form" becomes "create a published product with stock 0 → Out of stock".
- The product list is sorted by name (G7 wins over A13).
- The re-seed resetting `featured` (#24) is documented, not fixed.

## Implementation Plan

### Phase 1: Core

1. Product rules, price parsing and the product input schemas (unit tests).
2. Product port and use cases with an in-memory fake (unit tests).

### Phase 2: Database

3. Product repository adapter (unit + integration tests).

### Phase 3: App

4. Container wiring and product actions (unit tests, one no-session test per export).
5. Product pages, forms, publish control, image preview, sidebar and category links (unit tests).
6. E2E: no-session redirect, list badges, create → publish → featured on `/` → unfeature → unpublish, stock 0 → out of stock, duplicate SKU.

### Phase 4: Docs

7. README, BACKWARD_COMPATIBILITY, AGENTS.md, spec notes, lessons.
8. Full validation gate.
9. PR, review, QA evidence.

## Progress

PR: #40

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Core

- [x] 1.1 Product rules, price parsing and product input schemas — 638f437
- [x] 1.2 Product port and use cases — 638f437

### Phase 2: Database

- [x] 2.1 Product repository adapter — abbe4a0

### Phase 3: App

- [x] 3.1 Container wiring and product actions — 4e45b4d
- [x] 3.2 Product pages, forms and links — e50aa0b
- [x] 3.3 Product e2e tests — 5468746

### Phase 4: Docs and delivery

- [x] 4.1 Docs, spec notes, lessons — 479e125
- [x] 4.2 Full validation gate (lint, format:check, typecheck, test:coverage 100%, build, test:integration 46/46, test:e2e 39/39)
- [x] 4.3 PR, review, QA evidence — review fixes: the details form remounts on a status change (no stale save message after Publish), the slider note states the 12-product limit, the SKU length is checked after upper-casing, the Featured checkbox shows its field error, stronger stock/featured integration assertions

## Outcome

- Steps 1.1–4.2 done; the full gate passed locally on the final code.
- Deviations (recorded in the spec's "Implementation notes: Phase 1b"): stock on create only (A14), list by name (G7), the image rule also accepts the seeded `/demo/…` paths, native `<select>`/checkbox instead of new shadcn primitives.

## Follow-ups

- Phase 2 (#21): stock adjustment and history; the read-only "Stock: N" line becomes the stock panel.
- #24: the seeder overwrites owner edits to demo products (stock, Featured).

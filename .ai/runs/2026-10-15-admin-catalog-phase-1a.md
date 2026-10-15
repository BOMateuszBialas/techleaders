# Run: admin catalog management, Phase 1a (categories and the shared action layer)

- Date: 2026-10-15
- Brief: Implement Phase 1a (categories and the shared action layer) of the spec; Phase 1b and Phase 2 are separate PRs.
- Source doc: `.ai/specs/2026-10-15-admin-catalog-management.md`
- Issue: #20 (part 1; the issue closes with Phase 1b, so the PR says "Refs #20")
- Branch: `feat/admin-catalog-phase-1a`
- Engine: om-auto-create-pr (steps: 10, --loop: no)

## Goal

The signed-in owner lists, creates, edits and deletes categories in `/admin/categories`. Deleting a category that still has products is refused with its product count and up to 10 product names (G1, row lock). Mutations are server actions running through one shared `runAdminAction` layer that checks the session itself, maps application errors to form states and never swallows framework control flow.

## Scope

- `core`: `slugify`, `isValidSlug`, `UniqueFieldConflictError` (+ code-based guard), `categoryInputSchema`, `parseInput`, `CategoryRepositoryPort`, category use cases.
- `database`: `DatabaseCategoryRepository` (list with counts, get, create, update, `deleteIfEmpty` with `for update`), `toCatalogWriteError` (SQLSTATE + constraint name, no `instanceof`).
- `app`: container wiring; `runAdminAction`, `ActionState`, `form-data.ts`, `cache-tags.ts`; `category.action.ts`; `/admin/categories`, `/new`, `/[id]`; `admin/(protected)/error.tsx`; view + thin `"use client"` wrapper forms (A15); "Categories" sidebar link; guard inventory accepts `runAdminAction(`.
- Docs: BACKWARD_COMPATIBILITY §1, AGENTS.md (admin mutation pattern), spec deviations, gaming examples in the admin-catalog and cart specs (D10), lessons.

## Non-goals

- Phase 1b (products, the "Products" sidebar link) and Phase 2 (stock) — separate PRs.
- No schema change, no new HTTP endpoint, no change to the `on delete set null` FK.

## Risks

- MikroORM 7 constraint name exposure: confirmed by an integration test against real PostgreSQL before the mapping is relied on.
- 100% unit coverage of client components: handled by the view/wrapper split; no new coverage exclusion.

## Implementation Plan

### Phase 1: Core

1. Slug rule, `UniqueFieldConflictError`, `categoryInputSchema`, `parseInput` (unit tests).
2. Category port and use cases with an in-memory fake (unit tests).

### Phase 2: Database

3. Constraint-name spike, `toCatalogWriteError`, `DatabaseCategoryRepository` (unit + integration tests, including the concurrent insert/delete).

### Phase 3: App

4. Container wiring (unit test).
5. Action layer: `runAdminAction`, `ActionState`, form data, cache tags, `error.tsx`; guard inventory accepts `runAdminAction(` (unit tests).
6. Category actions (unit test per export, including "no session → redirect, no use case").
7. Category pages, view/wrapper forms, sidebar link (unit tests for views and wrappers).
8. E2E: create, duplicate slug, refused delete, empty delete, no-session redirect.

### Phase 4: Docs

9. BACKWARD_COMPATIBILITY, AGENTS.md, lessons, spec deviations.
10. Gaming examples in the admin-catalog and cart specs (D10).

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Core

- [x] 1.1 Slug rule, unique-field conflict error, category input schema — 89ec213
- [x] 1.2 Category port and use cases — 89ec213

### Phase 2: Database

- [x] 2.1 Category repository adapter and error mapping — 160b47f

### Phase 3: App

- [x] 3.1 Container wiring — 2ee59be
- [x] 3.2 Action layer and admin error boundary — d8fe0ff
- [x] 3.3 Category actions — 693eb61
- [x] 3.4 Category pages, forms and sidebar link — 99c5ffd
- [ ] 3.5 Category e2e tests

### Phase 4: Docs

- [ ] 4.1 Contract docs, AGENTS.md, lessons, spec deviations
- [ ] 4.2 Gaming examples in the catalog and cart specs

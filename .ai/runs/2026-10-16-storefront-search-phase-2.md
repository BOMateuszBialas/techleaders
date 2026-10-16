# Run: storefront catalog, Phase 2 (search and category filter)

- Date: 2026-10-16
- Brief: Implement Phase 2 (steps 11–14, E01-S02) of the storefront catalog spec: `?q` search combined with `?category`, the header search box (G13), the listing's search form, the no-results and too-long states, e2e.
- Source doc: `.ai/specs/implemented/2026-10-15-storefront-catalog.md` (moved from `.ai/specs/` in this run: last phase)
- Issue: #15 (closes with this phase)
- Branch: `feat/storefront-search` (worktree `wt-a1`)
- Engine: om-auto-implement-spec → implemented directly following the om-auto-create-pr flow (steps: 4, --loop: no)

## Goal

A shopper searches published products by a term (name or description, case-insensitive, wildcards literal), optionally within a category; no match shows a "no results" state; drafts are never returned.

## Steps

- [x] 11 Query schema (`q`, `qError`, `catalogSearchSchema`) and use case `search` (re-validated, forwarded with the category and the published status)
- [x] 12 Adapter search (`$or` over name and description with `toContainsPattern`); integration tests for case-insensitivity, description match, intersection with a category, drafts excluded, literal `%`, `_` and `\`
- [x] 13 Search UI: header search box, listing search form with category select, `CatalogResults` (count, no results, Clear search, unknown category), category links keep `q`; e2e for AC1–AC3, the category switch, literal `%` and the too-long term
- [x] 14 Docs: BACKWARD_COMPATIBILITY §1 (`?q`), README, spec notes, spec moved to `implemented/`

## Decisions

- Header search is static (no request data in the layout shell); the listing form shows the current term and category.
- The listing area moved into `components/catalog/catalog-results.tsx` so its branches are unit-covered; the loader returns `unknownCategory`.
- The use case validates `search` itself (`ValidationError` before any query).
- Accepted limitation: an unexpected DB error is logged as is and may quote the search term in the driver message.

## Validation

- `npm run lint` exit 0; `npm run format:check` exit 0; `npm run typecheck` exit 0
- `npm run test:coverage` exit 0, 100% statements, branches, functions and lines
- `npm run build` exit 0
- `npm run test:integration` exit 0 (60 tests)
- `npm run test:e2e` exit 0 (47 tests; 6 new in `catalog.e2e.test.ts`)
- Screenshots at 1280 px and 390 px checked by hand; the narrow header's "Menu" wrapped, fixed (`whitespace-nowrap`, narrower input).

## Outcome

PR opened against `main`; review and merge follow the lane policy.

## Follow-ups

- None filed yet (see the PR review).

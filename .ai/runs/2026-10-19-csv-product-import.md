# Run: CSV product import (P1)

- Goal: implement `.ai/specs/2026-10-19-csv-product-import.md` (spec PR #84): upload a CSV on `/admin/products/import`, see a checked preview, confirm a create-only, all-or-nothing import.
- Source doc: `.ai/specs/implemented/2026-10-19-csv-product-import.md` (moved there in step 4.1)
- Mode: autonomous (user away). Branch / worktree: `feat/csv-product-import`, `../wt-csv-import` (from `origin/main` f793905)
- Merge order: this PR carries `do-not-merge` until spec PR #84 merges; the user merges.

## Scope

Core CSV parsing and row rules, plan and two use cases, one port and its database adapter, one guarded server action, the import page and its view/wrapper, docs. Non-goals: updating existing products, creating categories, a background job, an API route, schema changes, `next.config.ts` changes.

## Risks

- A3 (initial stock through import) awaits the product owner's confirmation (⚠ in the spec).
- `runAdminAction` gets two additive optional fields; existing actions must behave as before.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Core

- [x] 1.1 CSV decoding and parsing — 23892bf
- [x] 1.2 Import row rules — 23892bf
- [x] 1.3 Plan, port and use cases — 23892bf

### Phase 2: Persistence and wiring

- [x] 2.1 Database adapter and integration tests — 26e0a3c
- [x] 2.2 Container wiring — 26e0a3c

### Phase 3: Admin UI

- [x] 3.1 Server action and runAdminAction options — 3a8479a
- [x] 3.2 Import page, view and wrapper — 2ac6a5e
- [x] 3.3 E2E test — ac16833

### Phase 4: Docs and gate

- [ ] 4.1 Docs, spec moved to implemented
- [ ] 4.2 Full validation gate

## Decisions (resume 2026-10-23)

- The 3.1 WIP (`runAdminAction` `details`/`unchanged`, `submitProductImport`, the copy module) matched the spec and was kept; a write conflict returns the import-level message without the preview (the owner checks the file again).
- The view shows exactly one submitting form at a time (the upload form, or the confirm form for an importable preview), so the shared `pending` flag always labels the button that was pressed. "Check another file" / "Import another file" are plain GET forms (a full reload resets `useActionState`).
- A3 implemented as the spec default (optional `stock` column, initial value only); the PR keeps `do-not-merge` until spec PR #84 is approved.
- `next build` stopped once with a Next.js "SecurityFatalError" upgrade nudge for 16.4.0; the retry built. Upgrading Next.js is outside this PR's scope and is reported as a follow-up.

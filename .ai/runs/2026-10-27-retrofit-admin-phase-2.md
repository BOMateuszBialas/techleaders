# Run: retrofit admin, Phase 2 (dashboard)

- Date: 2026-10-27
- Branch: `feat/retrofit-admin-phase-2` from `origin/main` (2301582)
- Spec: `.ai/specs/2026-10-26-retrofit-admin.md`, Phase 2 only. Owner approvals OA-1 to OA-9 and Q1 to Q10 are recorded there as approved on 2026-10-26.

## Goal

Dashboard on the design system: `TabsNav` period switch, `type-display` metric values, 12 px metric gap, `TextLink` and `warning` badge in low stock, `Empty` with a products link instead of the seed command, demo note as a `demo` alert with no role, labelled skeletons for the Suspense fallbacks, `type-h1` page title, `success` badge for healthy components. No guard, action, use case, port, entity, migration, env or token change.

## Steps and decisions

1. Period switch: `TabsNav` and `TabsNavLink` (`active` drives `aria-current`). The `bg-primary` fill is gone (C7, rule 14). The e2e selector `main nav[aria-label="Period"] a[aria-current="page"]` still holds.
2. Metric values: `type-display` (admin 24/32, 600, tabular). Metric grid `gap-3`. The lower two-panel grid keeps `gap-4` (a between-groups gap, not a between-items gap).
3. Low stock: the product name is a `TextLink variant="resource"`. The out-of-stock badge is `warning` (spec: low stock = warning).
4. Empty period (OA-5, Q2): `Empty` with "No orders in this period. Orders appear here after a checkout." and a `TextLink` "Go to products" to `/admin/products`. The `npm run db:seed` text is removed. Link text "Go to products" is my wording inside the approved Q2 ("a link to Products"). Owner to confirm.
5. Demo note: `Alert variant="demo"` with no role (D8, text unchanged). The other-currency note stays muted text.
6. Date range form (A5): `Field` and `FieldLabel` replace the bare `Label`. The error is `Alert variant="destructive" role="alert"` with `id="range-error"`. The spec did not list this form for phase 2. I did it because A5 applies to every admin form field.
7. Loading: `MetricsSkeleton` (label "Loading metrics") and `StatusSkeleton` (label "Checking system status") live in `dashboard-view.tsx`, so they are unit-tested. `page.tsx` is excluded from coverage, so they could not be tested from there.
8. System status badge: `up` is `success` (it was `default`, the graphite primary). Same status-map rule as D5. Not listed in the spec; flagged here.
9. The top products name is plain text on `main`, not a `Link`, so there is nothing to convert. The spec's "product name Link → TextLink" for that table does not match the code. I did not add a link (that would be a new behaviour). Left for the owner to decide.
10. The dashboard h1 is `type-h1` (admin h1 style per tokeny section 4). Not explicitly listed in the spec; flagged.
11. Storybook: `patterns/admin/dashboard.stories.tsx` (Loaded, EmptyPeriod, RangeError, Loading) and `dashboard.mdx`. Fixture data is fictional and built from core helpers.
12. e2e: `admin-dashboard.e2e.test.ts` gains `it.each([320, 768])`: no sideways scroll, and the period links are at least 44 px tall below 768 px and 32 px from 768 px.

## Files

- `packages/app/src/components/admin/dashboard/dashboard-view.tsx`
- `packages/app/src/components/admin/dashboard/dashboard-copy.ts`
- `packages/app/src/components/admin/dashboard/dashboard-components.test.ts`
- `packages/app/src/app/admin/(protected)/page.tsx`
- `packages/app/e2e/admin-dashboard.e2e.test.ts`
- `packages/app/stories/patterns/admin/dashboard.stories.tsx` (new)
- `packages/app/stories/patterns/admin/dashboard.mdx` (new)
- `.ai/runs/2026-10-27-retrofit-admin-phase-2.md` (this file)

Not touched: `packages/core`, `packages/database`, `packages/ai`, `packages/app/src/server/**`, migrations, env, `globals.css`, `components/ui/*`, `.claude/`, `.agents/`, `.mcp.json`, `.github/workflows/`.

## Commands run (worktree `wt-admin-p2`)

| Command | Result |
|---|---|
| `npm ci` | Pass (fresh worktree, no `node_modules` before) |
| `npx vitest run --project unit <dashboard>` | Pass: 31 tests |
| `npm run format:check` | First run failed on the new story file (one line reflow). Prettier applied to that file; rerun pass |
| `npm run lint` | Pass: 0 errors. 2 warnings, both in `.ai/prototypes/ds` (not touched, pre-existing) |
| `npm run typecheck` | Pass |
| `npm run check:tokens` | Pass: no off-token values in 278 files |
| `npm run check:agents` | Pass |
| `npm run test:coverage` | Pass: 193 files, 2166 tests, 100% thresholds |
| `npm run build` | Pass |
| `npm run test:integration` | Pass: 24 files, 203 tests (Testcontainers) |
| `npm run test:e2e` | Pass: 25 files, 146 tests (includes the 2 new 320/768 px cases) |
| `npm run build-storybook` | Pass |
| `npm run test:storybook:themes` | Pass: 76 files, 368 tests, light and dark, a11y as errors |
| `npm run test:hooks` | Pass: 334/334, 9 known gaps still open (as before) |

## Visual check

- Storybook static build served locally (`python -m http.server`), story `patterns-admin-dashboard--loaded`, light and dark. The browser window was 1264 px wide: the Storybook viewport parameter and the `agent-browser viewport` command did not resize it. So **no visual check was done at 320 px or 768 px** in a browser. Those widths are covered by the e2e measurements (no sideways scroll, link heights).
- At 1264 px, light and dark: the period switch shows its active underline, the demo note is a `demo` alert, the metric cards and definitions are in order, the two-column layout is intact. Looked at as images; no defects seen.
- 1440 px: not captured (same width issue).

## Not done / known gaps

- Real-browser look at 320, 768 and 1440 px in light and dark. Tooling could not resize the window (see above). The owner should check this in the manual step.
- The top products name is not a link (spec wording differs from the code; see step 9).
- "Go to products" link text needs owner wording approval.
- `WhatIsMissing.mdx` rows and `POSTEP.md` are not touched; they close in phase 6, as the spec says.
- The system status error copy still mentions `.env` ("Check the server configuration (.env) and logs."). It is not a command, so it is outside A11. Left as is; the owner may want it reworded.
- Order copy (`order-copy.ts`) still has the seed command. That belongs to phase 5.
- Lint warnings in `.ai/prototypes/ds` are pre-existing.

# Run: retrofit admin, Phase 1 (shell, navigation, error and not-found)

- Date: 2026-10-27
- Branch: `feat/retrofit-admin-phase-1` from `main` (c89adab)
- Spec: `.ai/specs/2026-10-26-retrofit-admin.md`, Phase 1 only (layout, error, not-found, `AdminNavLink`)

## Goal

Dark admin sidebar on the design tokens, `aria-current="page"` on the current section, `ErrorState` for the admin error page, `TextLink` on not-found, labelled skeleton for the session fallback, `md:p-6` main padding. No guard, action, use case, port, entity, migration, env, `globals.css` or `components/ui` change.

## Steps and decisions

1. The current-page mark needs the pathname, and the admin layout is static (cache components). `AdminNavLink` is a client component. Its matching rule (`isCurrentAdminRoute`) is a pure function: the dashboard (`/admin`) matches exactly, the other sections match their page and the pages under them (spec Q1).
2. The first `next build` failed: `usePathname()` in a client component under a static layout blocks prerendering unless it sits in `<Suspense>`. Fix: `AdminNav` (server) wraps `AdminNavCurrent` (client, reads the pathname) in Suspense. The fallback `AdminNavFallback` renders the same links without `aria-current`.
3. A constant exported from a `"use client"` file is a client reference, so the shared classes and items live in `admin-nav-classes.ts` (plain module).
4. The active marker is a 3 px span (`w-0.75`, Tailwind v4 spacing for 3 px). `w-[3px]` would fail `check:tokens`.
5. Error page: `ErrorState` with `title={<h1 className="type-h1">}`, same copy, `Try again` calls `retry`. Not-found: `TextLink variant="standalone"`, text unchanged.
6. Storybook: a pathname parameter only applies with `nextjs.appDirectory: true` (without it the mock returns "/"). Two stories in `stories/patterns/admin/` (dashboard, nested order) and a short MDX page.
7. Lint and typecheck: `children` in the props object is rejected by `react/no-children-prop`, and passing it as a third `createElement` argument fails typecheck unless `children` is optional. `AdminNavLink` takes `children?: ReactNode`.

## Commands run (worktree `wt-retrofit-admin-p1`)

| Command | Result |
|---|---|
| `npm ci` | Needed: the worktree's `node_modules` had packages but no `.bin` links. Done from the lockfile. |
| `bash .ai/scripts/ensure-agent-browser.sh` | OK (agent-browser v0.35.2, Chrome 156 present) |
| `npm run lint` | Pass: 0 errors, 2 warnings, both in `.ai/prototypes/ds` (not touched) |
| `npm run typecheck` | Pass (after the `children` fix) |
| `npm run format:check` | Pass (after Prettier on 3 files) |
| `npm run check:tokens` | Pass: no off-token values in 273 files |
| `npm run check:agents` | Pass (rerun after the lessons edit) |
| `npm run test:hooks` | Pass: 334/334 checks, 9 known gaps still open (as before) |
| `npm run test:coverage` | Pass: 192 files, 2131 tests, 100% thresholds |
| `npm run build` | First run FAILED (`usePathname` outside Suspense, see step 2). Second run: pass |
| `npm run test:integration` | Pass: 22 files, 193 tests (Testcontainers) |
| `npm run test:e2e` | Pass: 25 files, 141 tests (run from this worktree; log `scratchpad/e2e-full2.log`). One earlier full run printed a different worktree path and no results; not used as evidence |
| `npm run build-storybook` | Pass (rerun after the story fix) |
| `npm run test:storybook:themes` | Pass: 70 files, 332 tests, light and dark. First run had 4 failures in the new story (missing `appDirectory`), fixed |

## Outcome and checks not done

- Unit: `admin-nav-link.test.ts`, `admin-nav.test.ts` (nav list, `aria-current` per route, fallback). Error and not-found are covered by the existing `admin-categories.test.ts`.
- E2E: `admin-mobile.e2e.test.ts` gained two tests: `aria-current` on Orders, and the sidebar beside the content at 768 px. The 390 px nav wrap test passes unchanged.
- Browser check at 320 px and 1440 px, light and dark: the e2e screenshots at 390 px (`admin-nav-390.png`) and 768 px (`admin-shell-768.png`) were produced, but I did not open them, and I did not run a separate 320 px or 1440 px pass in light and dark. This is a gap for the owner's manual QA.
- Spec phase 1 items not in this PR: none. Later phases (dashboard, products, stock, orders, states sweep, sign-in) are out of scope.

## Known gaps

- Dark mode and 320 px were not checked by eye (see above).
- The session fallback skeleton uses `bg-muted`, which reads as a light block on the dark sidebar in light theme. Not checked visually.
- `.ai/specs/implemented/*` and `POSTEP.md` are not changed in this phase (phases 3, 5 and 6 own those).

# Lessons Learned

Long-term memory for LLM agents: an index. Add an entry after fixing a bug, or whenever you find something worth remembering. Keep this file short: one line per lesson. A longer write-up goes in `.ai/lessons/YYYY-MM-DD-slug.md` and is linked from its line; a lesson with no link is short enough to read in the line itself.

## Entry format

- **YYYY-MM-DD — Title**: what happened, the lesson / improvement, and (optional) link to `lessons/YYYY-MM-DD-slug.md`.

## Lessons

<!-- Newest first -->

- **2026-10-27 — A demo photo needs both the seed's `imageUrl` (new installs) and a data migration keyed by slug and SKU (existing rows), because the seeder is insert-only** — the Glide XL mousepad got `/photos/product-mouse-pad.jpg` this way; a new `CREDITS.md` row is required by `demo-photos.test.ts`.

- **2026-10-27 — `usePathname` in a client component under a static layout fails `next build` unless it sits in `<Suspense>`; a constant exported from a `"use client"` file is a client reference, not a value; Storybook needs `nextjs.appDirectory: true` for a pathname parameter** — the admin nav keeps the pathname in a client list inside Suspense, with a server fallback (no `aria-current`) and the shared classes in a plain module. Run log `.ai/runs/2026-10-27-retrofit-admin-phase-1.md`.
- **2026-10-27 — A Base UI tab's old panel stays mounted until its close completes, so an e2e read right after an arrow key can see both panels; poll the visible panels (not `hidden`, not `inert`) instead of reading `main` once** — fixed in `packages/app/e2e/product-page.e2e.test.ts`; failed only in CI, not reproduced locally

- **2026-10-27 — A focus effect needs no coverage exclusion if the wrapper only wires it: `useEffect(effectFromTestedModule, [state])` runs the logic in a unit-tested module (the SSR tests never run effects); a worktree's `node_modules` can be a partial copy (no `.bin`, no `.d.ts`), and `npm ci` then fails with ENOTEMPTY, so `npm install` reconciles it; `test:hooks` takes about 2.5 min on Windows** — run log `.ai/runs/2026-10-27-retrofit-checkout-phase-2.md`
- **2026-10-27 — Parallel agents share the session scratchpad: a run log written there was overwritten by another worktree's run; log each run to its own subfolder. A DS `Button` is `whitespace-nowrap` with a fixed height, so a long label overflows at 320 px; the wrap needs a DS change (`cn` does not merge the override), and a hook-free view's change handler is tested by walking the element tree it returns** — run log `.ai/runs/2026-10-27-retrofit-copilot-phase-1.md`

- **2026-10-26 — An e2e count over a shared test id picks up other suites' rows; scope it to the region under test. A shared integration DB needs a schema reset before a re-seed; a SQL `like` must match the code's trim and case rule** — run log `.ai/runs/2026-10-26-followups-demo-sku-copilot-e2e.md`
- **2026-10-26 — A commit message read from a fixed scratch path can be a stale file: use a new file name per commit, and amend before pushing** — a `git commit -F` read an old `msg1.txt` in the scratchpad, so the commit carried another message; `git commit --amend -F` on the unpushed commit fixed it.

- **2026-10-26 — A `.ts` and a `.tsx` with one basename shadow each other on import; the 100% gate needs handler tests without a DOM library** — [details](lessons/2026-10-26-product-gallery-ts-tsx-handlers.md)
- **2026-10-26 — A new port field reaches every fixture; copy a tracked binary from git, not the shell** — [details](lessons/2026-10-26-port-field-fixtures-binary-copy.md)
- **2026-10-26 — Git Bash rewrites `ref:path` in `git show`, and Base UI focus is checked after its guards** — [details](lessons/2026-10-26-git-bash-rewrites-ref-path.md)
- **2026-10-26 — Design-token gate needs a token for every role** — [details](lessons/2026-10-26-design-token-gate-token-per-role.md)
- **2026-10-26 — A text marker is not a discriminator; mark data by an identifier** — [details](lessons/2026-10-26-text-marker-is-not-discriminator.md)
- **2026-10-26 — Drawers, scrollbar gutters and container queries in the prototype** — [details](lessons/2026-10-26-drawers-scrollbar-gutters-container-queries.md)
- **2026-10-26 — Vite picks the nearest tsconfig, and a container query needs its container one element up** — [details](lessons/2026-10-26-vite-nearest-tsconfig-container-query.md)
- **2026-10-26 — Browser walk without the provider: drive an installed Chrome over CDP, and start Chrome from the shell** — [details](lessons/2026-10-26-browser-walk-without-provider-cdp.md)
- **2026-10-25 — Base UI overlays: the page under a modal is hidden, portals miss a div-scoped density, a link trigger gets `role="button"` on the server** — [details](lessons/2026-10-25-base-ui-overlays.md)
- **2026-10-25 — `cn` does not merge the project's token classes** — [details](lessons/2026-10-25-cn-does-not-merge-token-classes.md)
- **2026-10-24 — E07 Phase 2: lint treats e2e helpers named `use*` as React hooks; a migration guard needs a lock; split phases by consumer** — [details](lessons/2026-10-24-e07-phase-2-lint-e2e-helpers.md)
- **2026-10-24 — Design system primitives: Tailwind v4 focus outline, Base UI disabled, Storybook test viewport and docs ids** — [details](lessons/2026-10-24-design-system-primitives-tailwind-focus.md)
- **2026-10-24 — E07 Phase 1 surprises: Next answers 308 before a route allowlist; a form fallback must not drop request-time fields; a returned mock is a Vitest teardown** — [details](lessons/2026-10-24-e07-phase-1-surprises.md)
- **2026-10-24 — Storybook story tests break under a non-ASCII Windows path; stories must not live in a dot-directory; the hook flags some shell text as a .env glob** — [details](lessons/2026-10-24-storybook-non-ascii-windows-path.md)
- **2026-10-23 — Agent guardrails: only exit 2 blocks; deny ≠ denyRead; a `Bash` matcher misses PowerShell** — [details](lessons/2026-10-23-agent-guardrails-exit-2.md)
- **2026-10-23 — `useActionState` posts the previous state back; one `pending` flag for two forms; `next build` may stop once on a security nudge** — [details](lessons/2026-10-23-useactionstate-previous-state.md)
- **2026-10-23 — `next upgrade --agent=security` prints a prompt, it does not upgrade** — [details](lessons/2026-10-23-next-upgrade-agent-security-prompt.md)
- **2026-10-19 — Live evals: assert safety, report outcome; "absent" lists must survive faithful output; show the cause code** — [details](lessons/2026-10-19-live-evals-assert-safety.md)
- **2026-10-19 — agent-browser `fill` types into a date input in the browser locale; Zod 4 object refinements run after field failures** — [details](lessons/2026-10-19-agent-browser-fill-date-input.md)
- **2026-10-19 — Agent edits can turn a `​` escape into the invisible character itself** — [details](lessons/2026-10-19-agent-edits-invisible-escape.md)
- **2026-10-19 — Regex grounding checks are blind to invisible characters** — [details](lessons/2026-10-19-regex-grounding-invisible-characters.md)
- **2026-10-19 — Gemini 3 Flash thinking eats the output-token cap and the timeout on short texts** — [details](lessons/2026-10-19-gemini-3-flash-thinking-output-cap.md)
- **2026-10-19 — "No page scroll" is not "readable on a phone"; check table containers and the storefront too** — [details](lessons/2026-10-19-no-page-scroll-not-readable-on-phone.md)
- **2026-10-18 — A per-evaluation cache key cannot tell a sibling server layer from a hot reload (#59)** — [details](lessons/2026-10-18-per-evaluation-cache-key-sibling-layer.md)
- **2026-10-18 — Compare rules on raw values, not display values; one record shown twice needs shared client state (#63, #67)** — [details](lessons/2026-10-18-compare-rules-raw-values.md)
- **2026-10-18 — Shared e2e owner = shared Copilot question budget; agent-browser ignored an `sr-only` name suffix; heredoc Python on Windows hangs** — [details](lessons/2026-10-18-shared-e2e-owner-copilot-budget.md)
- **2026-10-18 — A shared cleanup assumed every rate-limit window was at most an hour** — [details](lessons/2026-10-18-shared-cleanup-rate-limit-window.md)
- **2026-10-18 — Gemini free tier: 2.5 models are closed to new keys, 3 Flash thinks slowly by default** — [details](lessons/2026-10-18-gemini-free-tier-models.md)
- **2026-10-17 — A production build evaluates a module once per server layer, so a per-evaluation `globalThis` cache key ping-pongs (#57)** — [details](lessons/2026-10-17-production-build-module-per-layer.md)
- **2026-10-17 — A branch stacked on a squash-merged PR: replay only its own commits** — [details](lessons/2026-10-17-stacked-branch-squash-merge-cherry-pick.md)
- **2026-10-17 — An e2e wait satisfied by the page you are leaving** — [details](lessons/2026-10-17-e2e-wait-satisfied-by-leaving-page.md)
- **2026-10-17 — Windows Python cannot open Git Bash's `/tmp`** — [details](lessons/2026-10-17-windows-python-git-bash-tmp.md)
- **2026-10-17 — A server action refreshes the page itself after a no-write conflict**: `runAdminAction` refreshes the page only after a change; when a conflict means the page is out of date (a stale order status), the action calls `refresh()` itself so the page re-renders with the current state.
- **2026-10-17 — The e2e sign-in budget is spent: share the setup's owner session; a generic double-click selector can pay the order** — [details](lessons/2026-10-17-e2e-sign-in-budget.md)
- **2026-10-17 — `Intl` month abbreviations differ between ICU versions; bind instants as ISO strings in raw SQL** — [details](lessons/2026-10-17-intl-month-abbreviations.md)
- **2026-10-16 — MikroORM driver exceptions carry the failed SQL with its parameters** — [details](lessons/2026-10-16-driver-exceptions-carry-sql-parameters.md)
- **2026-10-16 — A generic `form button[type=submit]` selector hits the header search; a race can fail before the row lock** — [details](lessons/2026-10-16-generic-form-submit-selector.md)
- **2026-10-16 — A server action's `refresh()` keeps the URL the page was requested with; the e2e sign-in limit is shared** — [details](lessons/2026-10-16-server-action-refresh-keeps-url.md)
- **2026-10-16 — A Server Component cannot fix a cookie; shell-quoted Python can eat escapes** — [details](lessons/2026-10-16-server-component-cannot-fix-cookie.md)
- **2026-10-16 — Write backslash-heavy test strings with the Write/Edit tool, then check them with `od -c`** — [details](lessons/2026-10-16-backslash-heavy-test-strings.md)
- **2026-10-16 — Raw `em.execute` returns timestamps as strings; native `min` hides server field errors; never pipe a gate step into `tail`** — [details](lessons/2026-10-16-raw-em-execute-timestamps.md)
- **2026-10-16 — Check validation rules against the seed data; a missing form field arrives as `""`** — [details](lessons/2026-10-16-validation-rules-against-seed-data.md)
- **2026-10-15 — MikroORM 7 exposes the PostgreSQL constraint name; e2e must wait for streamed admin content** — [details](lessons/2026-10-15-mikro-orm-7-constraint-name.md)
- **2026-10-15 — Repeated link names break `clickRole` in e2e; the test DB sorts with a byte collation** — [details](lessons/2026-10-15-repeated-link-names-clickrole.md)
- **2026-10-15 — Dev server kept a DI container from before the merge** — [details](lessons/2026-10-15-dev-server-di-container-before-merge.md)
- **2026-10-15 — `instanceof` on core errors fails across Next.js server chunks** — [details](lessons/2026-10-15-instanceof-core-errors-server-chunks.md)
- **2026-10-15 — Negated `toBe` on ORM objects can take seconds (flaky CI timeout)** — [details](lessons/2026-10-15-negated-tobe-orm-objects.md)
- **2026-10-15 — `betterAuth()` starts initialising as soon as it is built**: it kicks off a background database schema check. Unit tests stub `createAuth` (or point the pool at an unused port and end it); only integration tests build a real instance, after migrations.
- **2026-10-15 — Better Auth: `auth.api.*` skips the rate limit and the origin check** — [details](lessons/2026-10-15-betterauth-api-skips-rate-limit.md)
- **2026-10-15 — `try/catch` around `headers()`/`connection()` breaks `next build`** — [details](lessons/2026-10-15-try-catch-connection-breaks-build.md)
- **2026-10-15 — `packages/app` scripts run as CommonJS under tsx** — [details](lessons/2026-10-15-app-scripts-commonjs-tsx.md)
- **2026-10-15 — Better Auth 1.7 surprises (spike for the admin auth spec)** — [details](lessons/2026-10-15-betterauth-1-7-surprises.md)
- **2026-10-15 — `npx skills add` installs where Claude Code does not look** — [details](lessons/2026-10-15-npx-skills-add-location.md)
- **2026-10-15 — Python on Windows writes CRLF**: `open(p, "w")` in text mode turned a spec into CRLF. The index stayed LF, but the working tree showed a phantom change that blocked `git switch`. Pass `newline="\n"` when a script rewrites repo files.
- **2026-10-14 — CRLF checkouts break `format:check` on Windows** — [details](lessons/2026-10-14-crlf-checkouts-break-format-check.md)
- **2026-10-13 — agent-browser daemon keeps stdout open** — [details](lessons/2026-10-13-agent-browser-daemon-stdout.md)
- **2026-10-13 — Vitest alias `"@/"` as an object key**: it did not resolve `@/…` imports inside real modules (only mocked ones), failing with "Cannot find package '@/server/logger'". Use the array form with a regex: `{ find: /^@\//, replacement: … }`.
- **2026-10-13 — Awilix cradle proxies in `expect`** — [details](lessons/2026-10-13-awilix-cradle-proxies-expect.md)
- **2026-10-13 — MikroORM `checkConnection()` on a lazy ORM** — [details](lessons/2026-10-13-mikro-orm-checkconnection-lazy.md)
- **2026-10-13 — ESLint flat config `no-restricted-imports`** — [details](lessons/2026-10-13-eslint-flat-config-no-restricted-imports.md)
- **2026-10-13 — Docker on the dev machine needs Virtual Machine Platform** — [details](lessons/2026-10-13-docker-virtual-machine-platform.md)
- **2026-10-13 — MikroORM 7 specifics** — [details](lessons/2026-10-13-mikro-orm-7-specifics.md)
- **2026-10-13 — Next 16 Cache Components** — [details](lessons/2026-10-13-next-16-cache-components.md)
- **2026-10-13 — shadcn/ui 4 uses the `cn` package** — [details](lessons/2026-10-13-shadcn-ui-4-cn-package.md)
- **2026-10-13 — Monorepo gitignore**: create-next-app patterns are root-anchored (`/.next/`, `/node_modules`). In the monorepo they must be unanchored (`.next/`) or `packages/app/.next` gets tracked.
- **2026-10-13 — Writing many files at once**: one long Bash chain with several heredocs failed to parse as a whole (nothing ran). Use the Write tool per file instead.

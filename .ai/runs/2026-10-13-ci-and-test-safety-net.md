# Run: CI and test safety net

- **Date:** 2026-10-13
- **Spec:** [.ai/specs/implemented/2026-10-13-ci-and-test-safety-net.md](../specs/implemented/2026-10-13-ci-and-test-safety-net.md)
- **Trigger:** user request: CI on every PR (build, lint, unit tests, Testcontainers integration tests with agent-browser), a 100% unit-coverage rule, full coverage of existing code, browser tests for the home page and the admin panel

## Steps

1. Read the agent-browser descriptor and the Vitest 5 typings (`project.provide` / `inject`); checked package versions; confirmed `process.loadEnvFile` does not override real env variables (so the e2e app gets the container URL, not `.env`).
2. Added `@vitest/coverage-v8`, `testcontainers`, `@testcontainers/postgresql` (dev). Vitest config now has `unit`, `integration`, `e2e` projects and a 100% threshold with a commented exclusion list.
3. Baseline unit coverage was 78% lines. Made two production modules testable: `loadSystemHealth` moved out of the admin page into `admin/load-system-health.ts`; the seeder logic became `seedCatalog(em, catalog)` (`DatabaseSeeder` calls it with `DEMO_CATALOG`). Added `disposeRootContainer()` for shutdown/tests.
4. New unit tests: ORM config, entity timestamp hooks, health adapter, seeder, health route, admin loader, container disposal and wiring, logger levels and edge cases, money, grounding. Result: 100% statements/branches/functions/lines (74 tests).
5. Testcontainers: `@commerceos/database/testing` (container helper, unit-test ORM, provided-context types) and the integration global setup; the DB integration test uses `inject("databaseUrl")`. Removed `TEST_DATABASE_URL` and the `commerceos_test` init script.
6. E2E: `.ai/scripts/ensure-agent-browser.sh` (descriptor install, pinned v0.35.2, SHA-256 verified); global setup (container → migrate/seed CLI → `next start` on a free port → health wait); typed `BrowserSession` wrapper; `home.e2e.test.ts` (2 tests), `admin.e2e.test.ts` (4 tests); failure screenshots. Verified a broken assertion fails and saves a screenshot.
7. First e2e run took 66 s: the agent-browser daemon kept the stdout pipe open, `execFile` waited for the 30 s timeout and the wrapper swallowed it. Rewrote the runner on `spawn` + `exit`; the suite now takes ~7 s and timeouts throw.
8. `.github/workflows/ci.yml` (jobs: lint/format/typecheck, unit + coverage, build, integration, e2e), `.gitattributes` (LF for `*.sh`).
9. Docs: AGENTS.md (100% coverage rule, test layers, gate, routing), CODE_REVIEW.md, SDLC.md, README, ENGINEERING_STANDARDS.md, `.ai/agentic.config.json`, `.env.example`, `docker-compose.yml`, lessons.

## Verification (local, Windows + Docker Desktop)

| Command | Result |
|---|---|
| `npm run lint` / `format:check` / `typecheck` | ✅ |
| `npm run test:coverage` | ✅ 74 tests, 100% statements, branches, functions, lines |
| `npm run build` | ✅ |
| `npm run test:integration` | ✅ 7 tests (~5 s, Testcontainers) |
| `npm run test:e2e` | ✅ 6 tests (~7 s after the container and app start) |
| Workflow YAML | ✅ parses; **not yet run on GitHub** (needs a push) |

## Follow-ups

- Push and watch the first CI run; then mark the five jobs as required checks in the branch protection for `main` (a GitHub setting, not in the repo).
- The local `.env` still contains `TEST_DATABASE_URL`; it is unused and can be deleted.
- `npm audit` still reports the pre-existing `braces` advisories (via awilix/shadcn).

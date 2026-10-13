# Spec: CI and test safety net

- **Date:** 2026-10-13
- **Status:** implemented (2026-10-13), run log: [`.ai/runs/2026-10-13-ci-and-test-safety-net.md`](../../runs/2026-10-13-ci-and-test-safety-net.md)
- **Trigger:** user request: GitHub CI on every pull request (build, lint, unit tests, integration tests with a Testcontainers PostgreSQL instance and agent-browser), a 100% unit-coverage rule in AGENTS.md, 100% unit coverage of the existing code, and integration tests for the home page and the admin panel.

## Decisions

| Topic | Decision | Why |
|---|---|---|
| Unit test framework | Keep **Vitest 5** (already in use); add `@vitest/coverage-v8` with a **100%** threshold for lines, branches, functions and statements | Vitest is already the repo's runner; v8 coverage needs no instrumentation build |
| Coverage scope | All of `packages/*/src/**/*.{ts,tsx}` except the explicit, commented list in `vitest.config.mts` | One visible list; anything new is covered by default |
| Coverage exclusions | Generated code (migrations, shadcn `components/ui/**`), barrels (`index.ts`), type-only files, test files and fixtures, test infrastructure (`database/src/testing/**`), Next.js `page.tsx`/`layout.tsx` (covered by the browser tests), DB CLI entry points (`database/src/cli/**`, need a live DB; run by the integration and e2e setups) | These cannot be meaningfully unit-tested without a framework runtime or live DB, and each is exercised by another test layer |
| Logic inside pages | Moved out of `page.tsx` into colocated `.ts` modules (e.g. `admin/load-system-health.ts`) so it is unit-covered | Pages stay presentational |
| PostgreSQL for tests | **Testcontainers** (`testcontainers`, `@testcontainers/postgresql`, image `postgres:17-alpine`). `TEST_DATABASE_URL` and the `commerceos_test` init script are removed | Tests are self-contained and ephemeral; same behaviour locally and in CI |
| Test layers | `unit` (`*.test.ts`), `integration` (`*.int.test.ts`, real PostgreSQL), `e2e` (`packages/app/e2e/**/*.e2e.test.ts`, built app + PostgreSQL + agent-browser) as three Vitest projects | Each layer has its own setup cost; CI shows them as separate checks |
| E2E harness | Vitest global setup: start a PostgreSQL container → run the real migrate/seed CLI → `next start` on a free port against it → wait for `/api/health` 200 → `provide("baseUrl")`. Teardown stops the server and the container | The app is instantiated ephemerally, exactly as deployed (production build) |
| Browser | **agent-browser** v0.35.2, installed by `.ai/scripts/ensure-agent-browser.sh` (pinned, SHA-256 verified, from `.ai/browsers/agent-browser.md`); tests drive it through a small typed wrapper (`packages/app/e2e/support/agent-browser.ts`) using `--json` output | The repo's configured browser provider; no binary in the repo, no npm package |
| CI | `.github/workflows/ci.yml` on `pull_request` and `push` to `main`; jobs: `lint` (lint, format, typecheck), `unit` (coverage gate), `build`, `integration` (Testcontainers), `e2e` (build + Testcontainers + agent-browser, uploads screenshots on failure). `concurrency` cancels superseded runs | Each requested check is its own status on the PR |
| Rule | AGENTS.md, CODE_REVIEW.md, SDLC gate and `ENGINEERING_STANDARDS.md` decisions: every change keeps 100% unit coverage; new pages/flows get an e2e test | Requested by the user |

## Files

- `vitest.config.mts`, root `package.json` scripts (`test:coverage`, `test:integration`, `test:e2e`), `.gitattributes` (LF for `*.sh`).
- `packages/database/src/testing/` (container helper, global setup), `packages/database/package.json` (`./testing` export).
- `packages/app/e2e/` (global setup, agent-browser wrapper, `home.e2e.test.ts`, `admin.e2e.test.ts`).
- New unit tests for every uncovered module (core, database, ai, app).
- `.github/workflows/ci.yml`, `.ai/scripts/ensure-agent-browser.sh`.
- Docs: AGENTS.md, CODE_REVIEW.md, README, `ENGINEERING_STANDARDS.md` (Repository decisions), `.ai/agentic.config.json`, `.env.example`, `docker/postgres/init` removed.

## Verification

- `npm run lint`, `npm run typecheck`, `npm run test:coverage` (100%), `npm run build`, `npm run test:integration`, `npm run test:e2e` pass locally (Windows + Docker Desktop).
- The workflow runs on GitHub after push (needs the user's approval to push).

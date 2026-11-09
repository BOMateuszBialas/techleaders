# Run: Docker image, compose service, smoke test and deployment docs (2026-11-09)

Branch `feat/docker-deploy-draft`, based on `main` at `7034d22`. Lesson 24 (deployment), plan `.ai/analysis/2026-11-09-week5-plan.md` section 6, items (a).

## Changed

- `packages/app/next.config.ts`: `output: "standalone"` and `outputFileTracingRoot` set to the repository root (monorepo tracing; Next docs, self-hosting and output config).
- `Dockerfile` (new): stages `deps`, `build`, `migrate` (one-off `db:migrate`), `runtime` (node 22.17.0 alpine, non-root `node`, `NODE_ENV=production`, standalone server only).
- `.dockerignore` (new): excludes `.env*` (except `.env.example`), `node_modules`, `.git`, `.claude`, `.ai`, `docs`, tests, e2e and stories.
- `docker-compose.app.yml` (new): `app`, `postgres` (17, not published to the host), `migrate` (profile). Values come from the operator; required variables fail fast.
- `scripts/smoke.ts` and `scripts/smoke/check.ts` (+ `check.test.ts`): `npm run smoke -- <base-url>` checks `/api/health`, `/` and the `X-Frame-Options` and `X-Content-Type-Options` headers.
- `package.json`: `smoke` script.
- `docs/deployment.md` (new), `docs/release-workflow-draft.md` (new, not installed in `.github/`).
- `README.md`: the Rollback bullet points to `docs/deployment.md` (it said the rollback was not defined).

## Validation

- `npm run build`: pass (standalone output at `packages/app/.next/standalone/packages/app/server.js`).
- `docker build -t commerceos:local .`: pass (image 401 MB). `docker build --target migrate`: pass.
- Migrate target against the local dev database: `Migration20261109161321_copilot_recommendation_summary` applied (the dev DB was one migration behind `main`).
- Runtime container against the local dev database: `GET /api/health` returned `200 {"status":"ok","components":[{"name":"database","status":"up"}]}`; the container `HEALTHCHECK` reported `healthy`.
- `docker compose -f docker-compose.app.yml`: config valid with the variables, fails without them. Full stack on a separate project name (`commerceos-check`, port 3200): migrate exit 0, app `healthy`, health 200, smoke 4 of 4 pass. Torn down with volumes.
- `npm run smoke`: 4 of 4 pass against the container; exits 1 when the host is down, 2 on usage error.
- `npm run typecheck`, `npx eslint` on changed TS files, `prettier --check` on changed text files, `npm run check:tokens`, `npm run check:agents`, `npm run test:hooks` (334/334), `npm run test:coverage` (221 files, 2406 tests, thresholds met): all pass.
- Not run: `npm run lint` (whole repo, per instructions), integration and e2e tests. The e2e global setup still uses `next start`, which works with `output: standalone` and logs a warning only.

## Decisions

- `output: "standalone"` is the documented Next.js self-hosting path (Docker is a listed deployment option). The tracing root is the repo root because the workspace packages are TypeScript source.
- Migrations are a separate one-off target, not run at container start, so a restart never migrates the database.
- The smoke test lives in `scripts/` with a pure check module and unit tests, following `scripts/agents/`. It is outside the coverage include list, as `scripts/agents/` is covered only for its own module; `scripts/smoke/` has tests but is not in the coverage gate.
- No platform, registry, domain or secret was chosen or created.

## Not done

- No hosting account, public deployment, registry push or release workflow file (`.github/` is maintainer-owned).
- The owner-login smoke check (`/admin/sign-in`) is manual.
- `admin:create` through the `migrate` target was not run (it would create an owner account in the dev database).
- The lessons index is at its 100-line budget, so no lesson was added.

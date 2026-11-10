# Deployment and rollback

This guide describes how the CommerceOS app is packaged, what a host must provide, how to deploy a release, how to roll back, and how to check a deployment.

**Platform: Prisma Compute** (public beta), project `commerceos-app`, region `eu-central-1` (Frankfurt), database Prisma Postgres `commerceos-db` in `eu-central-1`. Free plan. The public address is https://nesc1oj2jmwwrdxstelho08g.fra.prisma.build (the default `*.prisma.build` name; no custom domain).

Status (2026-11-10): deployed and checked on the live host. `/api/health` returns `200` with the database `up`, `npm run smoke` passes 4/4, a rollback drill was run (see below), the owner account exists and the demo catalogue is seeded.

The Docker image and `docker-compose.app.yml` remain the way to run the app locally and on any other host. Compute does not run Docker images: it builds the Next.js app from the standalone output (`output: "standalone"`) with the adapter declared in [`packages/app/service.ts`](../packages/app/service.ts) and [`packages/app/prisma.config.ts`](../packages/app/prisma.config.ts).

## Deploy on Prisma Compute

Prerequisites: Node 22.18+, a Prisma account (`npx prisma auth login`, run by the owner in a terminal), the project linked from `packages/app` (`.prisma/local.json`, not committed).

1. Build from the release commit: `npm ci` (the repo sets `legacy-peer-deps` in `.npmrc`) and then `npm run build -w @commerceos/app`. Compute does not build for you.
2. Set variables for the production scope. Values are write-only; `list` shows names only. Run from `packages/app`:
   ```bash
   npx prisma project env add DATABASE_URL --role production        # value from the console, with sslmode=require
   npx prisma project env add BETTER_AUTH_SECRET --role production  # 32+ characters, generated locally
   npx prisma project env add CUSTOMER_AUTH_SECRET --role production
   npx prisma project env add APP_URL=https://<public-origin> --role production
   npx prisma project env list
   ```
   Changing a value does not redeploy the service. After a change, deploy again (step 3).
3. Deploy: `npx prisma deploy` from `packages/app`. It creates a new immutable version and makes it live. Deploy output ends with the address of `commerceos-app.web`.
4. Run the migrations against the production database before a release that adds them: `DATABASE_URL=<production URL> npm run db:migrate` from the repository root. Migrations are not run by the deploy.
5. Check: `curl -i https://<public-origin>/api/health` returns `200`, then `npm run smoke -- https://<public-origin>`.

Notes that matter on this platform:
- The connection needs TLS. `createOrmConfig` reads `sslmode` from the URL and passes TLS options to the driver (`packages/database/src/config.ts`). Without `sslmode=require`, the connection fails with `ECONNRESET`.
- A service that scales to zero can answer the first request after a pause with an error. Retry once before you treat it as a failure.
- Logs: `npx prisma service logs commerceos-app.web --tail 100`.
- The CLI warns that `sslmode=require` is an alias for `verify-full`. That is the stricter behaviour and is what we want.

## Rollback on Prisma Compute

Prisma Compute keeps only the live version. `prisma service version rollback` has no earlier version to return to in this beta, so the rollback is a **redeploy of the previous source**:

1. Check out the previous release commit (or tag) and `npm ci`.
2. Build and deploy it: `npm run build -w @commerceos/app`, then `npx prisma deploy` from `packages/app`.
3. Check: `/api/health` returns `200`, then `npm run smoke -- https://<public-origin>`.
4. If the migration of the failed release is additive, the previous code runs on the newer schema. Otherwise do not roll back the code alone; ship a forward fix instead (see the migration note below).

Rollback drill (2026-11-10, live host): deployed the previous source, checked health `200`, then deployed the current source again and checked health `200`. The drill proves the redeploy path; it does not prove a rollback across a schema change.


## What the host needs

| Need | Detail |
|---|---|
| Container image | Built from the root [`Dockerfile`](../Dockerfile). Target `runtime` (the default) is what runs. Target `migrate` is a one-off job for database migrations. |
| PostgreSQL 17 | Reachable from the app container through `DATABASE_URL`. Not publicly exposed. |
| HTTPS and a public name | Compute terminates TLS on `*.prisma.build`. `APP_URL` must be the exact public origin, for example `https://nesc1oj2jmwwrdxstelho08g.fra.prisma.build`. |
| Port | The container listens on `3000` (`PORT`, `HOSTNAME=0.0.0.0` are set in the image). |
| Health check | `GET /api/health`: `200` with `{"status":"ok",...}` when the database is up, `503` otherwise. The image also has a `HEALTHCHECK` that calls it. |
| User | The container runs as the non-root user `node` (uid 1000). |
| Reverse proxy | Put a proxy in front (see the README). Set `AUTH_TRUSTED_IP_HEADER` only when the proxy overwrites that header. |

### Environment variables

Names come from [`.env.example`](../.env.example) and are validated in [`packages/app/src/server/env.ts`](../packages/app/src/server/env.ts). Values are set in the platform's secret store, never in the repository, the image or a prompt.

| Variable | Needed at run time | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgresql://…` connection string to PostgreSQL 17. Use a URL-safe password or percent-encode it. |
| `APP_URL` | yes in production | Public origin, `https://…`. Sign-in trusts only this origin. |
| `BETTER_AUTH_SECRET` | yes | 32+ characters. `openssl rand -base64 32`. |
| `CUSTOMER_AUTH_SECRET` | yes in production | 32+ characters and different from `BETTER_AUTH_SECRET`. The app refuses to run without it (README, "Known limitations"). |
| `AUTH_TRUSTED_IP_HEADER` | recommended for public hosts | Set to the header your proxy overwrites with the client IP, e.g. `x-real-ip`. Unset, sign-in and lookups share one global rate limit. Never set it when clients can reach the app without that proxy. |
| `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` | no | Optional Gemini for Commerce Copilot. Unset: rule-based insights only. |
| `DATABASE_DEBUG` | no | `false` by default. Leave it off in production. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | only for `admin:create` | Read by the owner-creation CLI, never by the app. Pass them to the one-off run, then remove them. |
| `NODE_ENV` | set by the image | `production`. |

The image contains no `.env` file and no secret (see [`.dockerignore`](../.dockerignore)). Do not add one.

### PostgreSQL

Use PostgreSQL 17, as in the dev compose file. The schema is managed only by the migrations (`migrate` target). Seed data (`npm run db:seed`) is **demo data** with fictional orders and traffic; do not run it against a store that must hold only real data. Whether the public demo is seeded is an owner decision.

## Build and check locally

```bash
docker build -t commerceos:local .                  # runtime image
docker build --target migrate -t commerceos:local-migrate .   # migration job
```

Run the image against the local dev database (`npm run db:up`), with dummy, non-secret values passed on the command line:

```bash
docker run --rm -p 3100:3000 \
  --env DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/commerceos \
  --env APP_URL=http://localhost:3100 \
  --env BETTER_AUTH_SECRET=local-dummy-admin-secret-0123456789abcdef \
  --env CUSTOMER_AUTH_SECRET=local-dummy-customer-secret-0123456789abcdef \
  commerceos:local
curl -i http://localhost:3100/api/health
npm run smoke -- http://localhost:3100
```

Or run the whole stack with [`docker-compose.app.yml`](../docker-compose.app.yml). It needs `APP_URL`, `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET` and `CUSTOMER_AUTH_SECRET` in the shell or in a `.env` file next to it (never committed). The app is published on `127.0.0.1:${APP_PORT:-3000}` only:

```bash
docker compose -f docker-compose.app.yml --profile migrate run --rm migrate
docker compose -f docker-compose.app.yml up -d --build
```

## Deploy a release

1. **Choose the release.** Take the version and its `CHANGELOG.md` entry from the release workflow (see [`release-workflow-draft.md`](release-workflow-draft.md)). The version source of truth is an open owner decision: `package.json` currently says `0.1.0` and the changelog says `1.0.0`. Decision for 1.0.0: the release tag and the `CHANGELOG.md` entry; the version in `package.json` is aligned with the tag when the release is cut.
2. **Check out the release tag** and build it (`npm ci`, `npm run build -w @commerceos/app`). On Prisma Compute there is no image registry: the deployed source is the tag. Docker builds stay for other hosts (`docker build -t commerceos:<version> .`).
3. **Run the migrations** with the new image, before the new app starts:
   ```bash
   docker run --rm --env DATABASE_URL=… commerceos:1.0.0-migrate   # built with --target migrate
   ```
   The migrations are not reversed automatically (see Rollback).
4. **Deploy:** `npx prisma deploy` from `packages/app` (see Deploy on Prisma Compute).
5. **Wait for the health check** to return `200` (the platform's check, or `curl -i https://<public-url>/api/health`).
6. **Run the smoke test** (next section).

Record the release tag, the deployed address and the time in the release notes of the project (`CHANGELOG.md`, or the release entry for the version).

## Smoke test after a deploy

`scripts/smoke.ts` (`npm run smoke`) checks the public base URL:

- `GET /api/health` returns `200` with `status: "ok"` (the database is reachable);
- `GET /` returns `200` with an HTML content type;
- the home page sends `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff`.

Run it from a checkout of the same release tag (`npm ci` once):

```bash
npm run smoke -- https://<public-url>
```

It exits `0` when every check passes, `1` when one fails, and `2` on a usage error. Each failing check prints its reason. The script does not sign in: a manual check of the owner sign-in (`/admin/sign-in`) and of one storefront order is still required after the first deploy and after any auth change.

## Rollback

Rollback means starting the previous image tag again. Keep the previous tag in the deployment log, and check the rollback target before you switch.

1. **Find the previous image tag** in the deployment log (for example `commerceos:1.0.0` when `1.0.1` is failing).
2. **Check that the previous version can run on the current schema.** The migrations are applied forward only in practice. The previous app must work with the newer schema, which holds when the release's migrations are additive. Check the release notes (`UPGRADE_NOTES.md`, once it exists). If a migration removed or changed something the old app reads, do not roll back the image alone: ship a forward fix instead.
3. **Known blocker:** the migration `orders_customer` cannot be rolled back once account orders exist (`BACKWARD_COMPATIBILITY.md`). Its `down` refuses to run in that case, by design.
4. **Redeploy the previous source** as described in Rollback on Prisma Compute.
5. **Check it:** health `200`, then `npm run smoke -- https://<public-url>` from the checkout of the previous tag.
6. **Record** the rollback in the deployment log, with the failing and the restored tag.

Do not edit the database by hand during a rollback. Do not delete a release tag to "undo" a release: publish a new patch version instead.

### Rollback drill

The redeploy path was practised once on the live host on 2026-11-10 (see Rollback on Prisma Compute). A separate non-public copy does not exist yet; it is optional for this portfolio app.

## Platform facts (Prisma Compute, free plan)

- Account owner: the project owner. Cost: free plan; check the console for limits before a traffic test.
- Project `commerceos-app` (eu-central-1) and database `commerceos-db` (eu-central-1, Prisma Postgres 17). The older project `commerceos` still holds an empty database created by hand; it is not used and can be deleted in the console.
- Secrets: set with `prisma project env add` in the owner's terminal. The agent never receives secret values.
- Domain: the default `*.prisma.build` name. Custom domains are production only and need DNS work; not done.
- `AUTH_TRUSTED_IP_HEADER`: not set. Compute does not add a proxy header we can rely on, so sign-in and lookups share one global rate limit.
- Deploy trigger: manual (`npx prisma deploy`). Git connection is not configured.
- Health check: `/api/health`, expected `200`.
- Logs: `prisma service logs`. The app has no error-tracking service yet.
- Staging and per-pull-request environments: not created.
- Backups: provided by the platform for Prisma Postgres; a restore test has not been run.

## Known gaps

- The public address is on the default platform name; no custom domain.
- No release workflow is in `.github/workflows/` (maintainer-owned; see `release-workflow-draft.md`).
- The migration job is manual; no automatic migration on deploy.
- The smoke test does not sign in or place an order.
- The image has no image signing and no vulnerability scan in CI.

## Known limitation: no production error tracking

The app has no error-tracking service (no Sentry, PostHog or Datadog). Errors reach the application logs only. This is accepted for the demo, which runs on fictional data. Before a real store runs on this image, choose an error tool and wire it in; the lesson 25 maintenance loop depends on it.

# Deployment and rollback

This guide describes how the CommerceOS app is packaged, what a host must provide, how to deploy a release, how to roll back, and how to check a deployment. It names no hosting platform: the parts that depend on the platform are marked **TO FILL IN when the platform is chosen**.

Status: the image, the compose file and the smoke script are built and checked locally. No platform account, domain, secret or public deployment exists yet.

## What the host needs

| Need | Detail |
|---|---|
| Container image | Built from the root [`Dockerfile`](../Dockerfile). Target `runtime` (the default) is what runs. Target `migrate` is a one-off job for database migrations. |
| PostgreSQL 17 | Reachable from the app container through `DATABASE_URL`. Not publicly exposed. |
| HTTPS and a public name | **TO FILL IN when the platform is chosen** (TLS termination, domain, DNS). `APP_URL` must be the exact public origin, for example `https://shop.example.com`. |
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

1. **Choose the release.** Take the version and its `CHANGELOG.md` entry from the release workflow (see [`release-workflow-draft.md`](release-workflow-draft.md)). The version source of truth is an open owner decision: `package.json` currently says `0.1.0` and the changelog says `1.0.0`. **TO FILL IN** once decided.
2. **Build the image from the release tag**, and tag it with the version, for example `commerceos:1.0.0`. Never deploy `latest` or an untagged local build. **Registry and image push: TO FILL IN when the platform is chosen.**
3. **Run the migrations** with the new image, before the new app starts:
   ```bash
   docker run --rm --env DATABASE_URL=… commerceos:1.0.0-migrate   # built with --target migrate
   ```
   The migrations are not reversed automatically (see Rollback).
4. **Deploy the new app image.** **TO FILL IN: the platform's deploy action** (its UI, CLI or Git integration).
5. **Wait for the health check** to return `200` (the platform's check, or `curl -i https://<public-url>/api/health`).
6. **Run the smoke test** (next section).

Record the release, the image tag and the time in the deployment log of the project (**TO FILL IN**: where that log lives).

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
4. **Redeploy the previous image tag** with the platform's deploy action. **TO FILL IN.**
5. **Check it:** health `200`, then `npm run smoke -- https://<public-url>` from the checkout of the previous tag.
6. **Record** the rollback in the deployment log, with the failing and the restored tag.

Do not edit the database by hand during a rollback. Do not delete a release tag to "undo" a release: publish a new patch version instead.

### Rollback drill

Before the first public release, practise the procedure once on a non-public copy: deploy the previous tag, then the new one, then the previous one again, and run the smoke test after each step. **TO FILL IN** when a non-public environment exists. Until then, this procedure is untested on a real host.

## Platform-specific parts (TO FILL IN when the platform is chosen)

- Hosting provider, account owner and cost.
- Project and PostgreSQL 17 instance (created on the platform, with backups).
- Secrets: where they are stored and who can read them. The agent never receives secret values.
- Domain, DNS record and TLS certificate.
- Proxy header for `AUTH_TRUSTED_IP_HEADER`.
- Image registry and the deploy trigger (manual or on a tag).
- Health-check configuration (path `/api/health`, expected `200`).
- Logs and alerts. The app has no error-tracking service yet.
- Staging environment and per-pull-request preview environments (out of scope until a platform exists).
- Backups and restore test for PostgreSQL.

## Known gaps

- No platform, domain or account exists; the deployment is not run anywhere public.
- No release workflow is in `.github/workflows/` (maintainer-owned; see `release-workflow-draft.md`).
- The migration job is manual; no automatic migration on deploy.
- The smoke test does not sign in or place an order.
- The image has no image signing and no vulnerability scan in CI.

## Known limitation: no production error tracking

The app has no error-tracking service (no Sentry, PostHog or Datadog). Errors reach the application logs only. This is accepted for the demo, which runs on fictional data. Before a real store runs on this image, choose an error tool and wire it in; the lesson 25 maintenance loop depends on it.

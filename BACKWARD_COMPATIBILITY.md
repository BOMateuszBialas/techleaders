# Backward Compatibility

The contract surfaces this project protects, and how changes to them must be handled. Review skills check changes against this file, and implementation skills warn when a change breaks it.

> **Current state (2026-10-15):** foundation, admin sign-in, storefront browsing and the shop-front home page. There are a few API routes (listed below), public storefront URLs, internal workspace packages (not published) and the catalog and admin auth schema. There are no external consumers yet. Update this file whenever a new surface appears.

## Protected surfaces

### 1. Public URLs (App Router routes)

- **Where:** `packages/app/src/app/**/page.tsx`. Current storefront URLs (added 2026-10-15, storefront catalog spec Phase 1):
  - `/` (home), with the optional query parameter `category` (added 2026-10-15, Phase 1b: a category slug selecting the featured-products tab; same slug rules as on `/products`; unknown or malformed values silently show all featured products);
  - `/products`, with the optional query parameter `category` (a category slug; unknown or malformed values show "This category does not exist");
  - `/products/<slug>` (`<slug>` is the product slug; drafts and unknown slugs show "Product not found").
- **Breaking:** removing or renaming a public route, or changing the meaning of its query parameters.
- **Required path:** add a redirect in `next.config.ts` (`redirects()`) and note the change in the PR description.

### 2. HTTP API (Route Handlers)

- **Where:** `packages/app/src/app/**/route.ts`. Current endpoints:
  - `GET /api/health` (response: `{ status: "ok" | "degraded", components: [{ name, status, latencyMs }] }`, 200/503).
  - `GET /api/admin/me` (`ApiResult<{ id, email, role }>`, 200/401).
  - `/api/auth/*`: Better Auth's own endpoints (`POST /sign-in/email`, `POST /sign-out`, `GET /get-session`). Their shapes belong to the library pinned at `~1.7.10`; upgrades are reviewed against the admin e2e suite.
- **Breaking:** removing an endpoint or method; removing or renaming a response field; changing a field's type; adding a new required request field; changing status codes or the error format.
- **Required path:** make additive changes only, or ship a new versioned endpoint. Mark the old one deprecated and keep it for at least one release, and write a migration note in the PR.

### 3. Monorepo packages (`packages/*`)

- **Where:** what each package exports from its entry point (`package.json` `exports` / `main`).
- **Breaking:** removing or renaming an export, or changing a function signature or type in an incompatible way.
- **Required path:** deprecate first (`@deprecated` JSDoc), update every consumer in the monorepo in the same PR, and bump the major version if the package is published.

### 4. Configuration and environment variables

- **Where:** `packages/app/next.config.ts`, env variables validated in `packages/app/src/server/env.ts` (documented in `.env.example`), `.ai/agentic.config.json`.
- **Added 2026-10-15:**
  - `BETTER_AUTH_SECRET` (required);
  - `AUTH_TRUSTED_IP_HEADER` (optional);
  - `ADMIN_EMAIL` / `ADMIN_PASSWORD` (read only by `npm run admin:create`);
  - `APP_URL` became required when `NODE_ENV=production`.
- **Breaking:** renaming or removing an environment variable, or changing a config key's format.
- **Required path:** support the old name as a fallback for one release and document the change in the PR and README.

### 5. Data schema (PostgreSQL via MikroORM migrations)

- **Where:** `packages/database/src/migrations/`, `packages/database/src/entities/`.
- **Breaking:** dropping or renaming a column or table, narrowing a type, adding a NOT NULL column without a default, or editing an already-applied migration.
- **Required path:** migrations only move forward and committed migrations are never edited. Destructive changes are rolled out in steps (add the new column → backfill → switch code → drop the old one in a later migration).

## General rules

- Prefer additive changes over modifying or removing existing ones.
- Any intentional break needs the `risk-high` label, a migration note in the PR description, and the user's approval.

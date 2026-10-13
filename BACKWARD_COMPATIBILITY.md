# Backward Compatibility

The contract surfaces this project protects, and how changes to them must be handled. Review skills check changes against this file, and implementation skills warn when a change breaks it.

> **Current state (2026-10-13):** foundation only. There is one API route (`/api/health`), internal workspace packages (not published) and an initial catalog schema. There are no external consumers yet. The surfaces below are the ones the project will have. Update this file whenever a new surface appears.

## Protected surfaces

### 1. Public URLs (App Router routes)

- **Where:** `packages/app/src/app/**/page.tsx`.
- **Breaking:** removing or renaming a public route, or changing the meaning of its query parameters.
- **Required path:** add a redirect in `next.config.ts` (`redirects()`) and note the change in the PR description.

### 2. HTTP API (Route Handlers)

- **Where:** `packages/app/src/app/**/route.ts`. Current endpoints: `GET /api/health` (response: `{ status: "ok" | "degraded", components: [{ name, status, latencyMs }] }`, 200/503).
- **Breaking:** removing an endpoint or method; removing or renaming a response field; changing a field's type; adding a new required request field; changing status codes or the error format.
- **Required path:** make additive changes only, or ship a new versioned endpoint. Mark the old one deprecated and keep it for at least one release, and write a migration note in the PR.

### 3. Monorepo packages (`packages/*`)

- **Where:** what each package exports from its entry point (`package.json` `exports` / `main`).
- **Breaking:** removing or renaming an export, or changing a function signature or type in an incompatible way.
- **Required path:** deprecate first (`@deprecated` JSDoc), update every consumer in the monorepo in the same PR, and bump the major version if the package is published.

### 4. Configuration and environment variables

- **Where:** `packages/app/next.config.ts`, env variables validated in `packages/app/src/server/env.ts` (documented in `.env.example`), `.ai/agentic.config.json`.
- **Breaking:** renaming or removing an environment variable, or changing a config key's format.
- **Required path:** support the old name as a fallback for one release and document the change in the PR and README.

### 5. Data schema (PostgreSQL via MikroORM migrations)

- **Where:** `packages/database/src/migrations/`, `packages/database/src/entities/`.
- **Breaking:** dropping or renaming a column or table, narrowing a type, adding a NOT NULL column without a default, or editing an already-applied migration.
- **Required path:** migrations only move forward and committed migrations are never edited. Destructive changes are rolled out in steps (add the new column → backfill → switch code → drop the old one in a later migration).

## General rules

- Prefer additive changes over modifying or removing existing ones.
- Any intentional break needs the `risk-high` label, a migration note in the PR description, and the user's approval.

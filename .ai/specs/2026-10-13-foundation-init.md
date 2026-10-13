# Foundation initialization (Week 1, part 1)

- **Status:** in progress
- **Parent spec:** [2026-10-13-commerceos-mvp.md](2026-10-13-commerceos-mvp.md) (sections 4, 5, 11 "Week 1")
- **Goal:** a stable, minimal, locally runnable foundation for CommerceOS. Not product features.

## Starting state

- A single `create-next-app` scaffold (Next.js 16.4, React 19.3, TS 5.9, Tailwind v4, ESLint 9) at the repo root, using npm.
- No database, DI, tests, env validation, CI or domain code.

## Decisions

| Topic | Decision | Why |
|---|---|---|
| Package manager | **npm workspaces** (`packages/*`) | npm is already in use (`package-lock.json`); no need to add pnpm or turbo |
| Internal packages | Consumed as **TypeScript source** (`exports` → `src/index.ts`), no build step | Turbopack transpiles workspace packages automatically (Next docs: `transpilePackages`); keeps setup minimal |
| Package scope | `@commerceos/*` | Matches the product name |
| ORM | MikroORM 7 + `@mikro-orm/postgresql`, migrations, seeder | Required by the spec; MikroORM is on Next's default `serverExternalPackages` list |
| Entities | `defineEntity` (no decorators) | Avoids decorator and metadata transpilation problems with Turbopack/SWC and Vitest |
| DI | Awilix 13; container in `packages/app/src/server/container.ts` | One documented composition root. Request scope gets a forked `EntityManager` |
| Env validation | Zod schema in `packages/app/src/server/env.ts` | No extra dependency (no t3-env); Zod is already part of the stack |
| Tests | Vitest 5 at the root, with per-package tests in `packages/*/src/**/*.test.ts` | One runner for the whole workspace. DB integration tests are opt-in (`npm run test:integration`) and need Postgres |
| Local DB | `docker-compose.yml` with `postgres:17` | Reproducible; no local Postgres install |
| UI | Tailwind v4 (existing) + shadcn/ui (initialised in `packages/app`) | Required by the spec; shadcn only for the admin shell for now |
| Formatting | Prettier at the root | Requested by the initialization brief |
| TS / ESLint versions | Keep TS 5.9 and ESLint 9 from the scaffold | TS 7 and ESLint 10 are newer, but compatibility with Next 16.4 and `eslint-config-next` is unverified, so we stay on the versions known to work together |

## Package layout

```text
packages/
  app/        Next.js app: storefront, admin shell, API routes, DI composition root, env
  core/       Domain (money, product rules) + application use cases + ports (interfaces)
  database/   MikroORM config, entities, migrations, seeders, repository adapters
  ai/         Copilot: LLM provider port + adapters, recommendation Zod schema
  config/     Shared tsconfig base
```

Dependency direction: `app` → `core`, `database`, `ai`; `database` → `core`; `ai` → `core`. `core` depends on no other package (no Next.js and no ORM).

## Scope (this step)

1. Monorepo and workspace config; move the app to `packages/app`.
2. `core`: `Money` helpers (integer minor units), a `ProductStatus` domain type, a `HealthCheck` port and a `GetSystemHealth` use case.
3. `database`: MikroORM config, `Category` and `Product` entities, an initial migration, a repeatable dev seeder, and a `MikroOrmHealthCheck` adapter.
4. `ai`: an `LlmProvider` port, the `CopilotRecommendation` Zod schema, and an `UnconfiguredLlmProvider` fallback. No real provider yet.
5. `app`: env validation, the Awilix container with request scope, `GET /api/health`, a basic storefront shell (`/`) and admin shell (`/admin`), shadcn/ui.
6. Tooling: root scripts for `dev`, `build`, `lint`, `typecheck`, `test`, `test:integration`, `format`, `db:*`.
7. Docs: README, AGENTS.md, `.env.example`, validation commands in `.ai/agentic.config.json`.

## Out of scope (next steps)

- Admin authentication (library choice pending). **Until then, `/admin` is an unprotected shell with no data or mutations.**
- Product CRUD, storefront catalog, cart, checkout, payments, the real LLM provider, CI workflow, Playwright.

## Acceptance criteria

- [x] `npm install` at the root installs all workspaces.
- [ ] `docker compose up -d`, `npm run db:migrate` and `npm run db:seed` work. **Blocked:** Docker engine cannot start on the dev machine (Windows "Virtual Machine Platform" is disabled).
- [~] `npm run dev` serves `/`, `/admin` and `/api/health`. Verified: 200 / 200 / 503 with the DB down. The 200 with the DB up is still unverified (blocked as above).
- [x] `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` pass.
- [ ] `npm run test:integration` passes with Postgres running. Written (migrations, schema drift, repeatable seed, DB constraints, health) but not yet run (blocked as above).
- [x] README and AGENTS.md describe only commands that actually exist.

**Status (2026-10-13):** implemented; DB verification pending. Move this spec to `implemented/` once the three unchecked items pass.

## Implementation notes

- The initial migration (`Migration20261013000000_initial_catalog`) was written from `orm.schema.getCreateSchemaSQL()`, which needs no connection, because no database was available. The integration test's schema-drift check confirms it matches the entities.
- shadcn/ui 4 (`base-nova`) uses the `cn` package (by shadcn) instead of `clsx` + `tailwind-merge`, plus `@base-ui/react`.
- `next dev` writes `packages/app/AGENTS.md` (Next.js managed agent rules); it is committed as Next.js recommends.

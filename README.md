# CommerceOS

CommerceOS is a lightweight, single-store e-commerce platform: a customer storefront plus a merchant admin dashboard. **Commerce Copilot** is its AI merchant advisor. It analyses the store's own data (sales, orders, products, inventory) and suggests a few prioritised, evidence-backed actions. The Copilot is **advisory only**: it never changes prices, products or orders by itself.

This is a 5-week AI Engineering portfolio MVP. The full specification is in [`.ai/specs/2026-10-13-commerceos-mvp.md`](.ai/specs/2026-10-13-commerceos-mvp.md), the agent rules are in [`AGENTS.md`](AGENTS.md), and the day-to-day coding conventions are in [`ENGINEERING_STANDARDS.md`](ENGINEERING_STANDARDS.md).

> **Current state: foundation only.** The monorepo, database layer, DI container, env validation, health check, tests and basic UI shells exist. Catalog, cart, checkout, admin auth and the Copilot workflow are **not implemented yet** (see [Roadmap](#roadmap)).

## Monorepo structure

```text
packages/
  app/        Next.js app: storefront, admin, API routes, DI composition root, env validation
  core/       Domain rules, use cases, Zod input schemas, ports, typed errors (no framework)
  database/   MikroORM config, entities, migrations, seeders, infrastructure adapters
  ai/         Commerce Copilot: LLM provider port and adapters, output schemas, grounding checks
  config/     Shared tsconfig
docker-compose.yml   Local PostgreSQL
.ai/                 Specs, run logs and lessons for agent-assisted development
```

Dependency direction: `app → core, ai` (and `app → database` only in the DI composition root `packages/app/src/server/container.ts`); `database → core`; `ai → core`. `core` depends only on Zod. ESLint (`no-restricted-imports` in `eslint.config.mjs`) fails the lint step if a package crosses these boundaries. Internal packages are consumed as TypeScript source (no build step).

## Technology stack

Next.js 16.4 (App Router, Turbopack, Cache Components) · React 19.3 · TypeScript 5.9 (strict) · PostgreSQL 17 · MikroORM 7 · Awilix 13 · Tailwind CSS 4 · shadcn/ui · Zod 4 · Vitest 5 · ESLint 9 · Prettier 3 · npm workspaces.

### Key architectural decisions

- **Modular monolith.** One deployable Next.js app; domain and use cases live in framework-free packages.
- **One DI composition root** (`packages/app/src/server/container.ts`). The ORM and LLM provider are singletons. Every request gets its own scope with a forked MikroORM `EntityManager`. Awilix strict mode prevents scoped objects from leaking into singletons.
- **Migrations are the source of truth** for the schema. There is no automatic schema sync, and an integration test fails if entities and migrations drift apart.
- **Money in integer minor units** (grosze/cents), with DB `check` constraints for invariants.
- **Provider-neutral LLM port.** Without credentials the app uses an explicit "unconfigured" provider that fails clearly and never fabricates answers.

## Prerequisites

- Node.js **≥ 22.17** (developed on 24) and npm 11
- Docker Desktop (for local PostgreSQL). On Windows it requires the **Virtual Machine Platform** / WSL 2 feature. Alternatively, use any PostgreSQL 17 instance and point `DATABASE_URL` at it.

## Getting started

```bash
npm install                 # installs all workspaces
cp .env.example .env        # one .env for the whole repo, at the root
npm run db:up               # starts PostgreSQL (creates commerceos and commerceos_test)
npm run db:migrate          # applies migrations
npm run db:seed             # loads demo data (repeatable; marked [DEMO])
npm run dev                 # http://localhost:3000
```

Verify the setup:

- http://localhost:3000: storefront shell
- http://localhost:3000/admin: admin shell with live system status
- http://localhost:3000/api/health: returns `200 {"status":"ok",...}` when the database is reachable, `503 {"status":"degraded",...}` otherwise

## Environment variables

Defined and validated in `packages/app/src/server/env.ts`; invalid configuration fails with a message listing the problems.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string for the app and CLI |
| `TEST_DATABASE_URL` | for integration tests | Separate test database (`commerceos_test`) |
| `DATABASE_DEBUG` | no (`false`) | Log SQL queries |
| `APP_URL` | no (`http://localhost:3000`) | Public base URL |
| `NODE_ENV` | no | Standard Node environment |

AI provider and payment variables will be added when those integrations are implemented.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint across the monorepo |
| `npm run typecheck` | `tsc --noEmit` in every package (the app also generates route types first) |
| `npm test` | Unit tests (no DB needed) |
| `npm run test:integration` | Integration tests against PostgreSQL (`TEST_DATABASE_URL`) |
| `npm run format` / `npm run format:check` | Prettier write / check |
| `npm run db:up` / `npm run db:down` | Start / stop local PostgreSQL |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:migration:create` | Generate a migration from entity changes (review it before committing) |
| `npm run db:seed` | Load or refresh demo seed data |

## AI provider (Commerce Copilot)

Not configured yet. The LLM provider port and the response schema (`packages/ai`) exist. Until a concrete provider adapter is implemented and selected through environment variables, the app runs with `UnconfiguredLlmProvider`, which returns an explicit "provider unavailable" error so the UI can show a fallback instead of a fabricated answer. Setup instructions will be added together with the adapter.

## Payments

Not implemented yet. The plan is Stripe Checkout in **test mode** if feasible within the timeline; otherwise a clearly labelled demo-payment flow. Card details will never be collected or stored by CommerceOS.

## MVP scope

- **Storefront:** catalog, search/filter, cart, server-validated checkout, order confirmation.
- **Admin:** authentication, real database-backed metrics, product/category CRUD, inventory, orders and status workflow.
- **Commerce Copilot:** a performance summary plus up to 3 prioritised recommendations with evidence, grounded in tool results from application services; save, dismiss and complete actions; a safe fallback.
- **Out of scope:** multi-tenancy, marketplaces, real shipping and refunds, discounts, multi-currency checkout, a CMS page builder, autonomous AI actions, microservices.

## Known limitations

- **Admin authentication is not implemented.** `/admin` is an unprotected shell that shows only system status, with no store data and no mutations. Do not deploy publicly in this state.
- No LLM provider, payments, catalog UI, cart, checkout or CI pipeline yet.
- `npm audit` reports advisories in development tooling dependencies (e.g. `braces` via linting and test tooling); they do not affect runtime code and are tracked for a later update.

## Roadmap

1. **Week 1:** foundation (done: this commit), then admin authentication, then product/category model and admin CRUD.
2. **Week 2:** storefront listing and detail, search/filter, cart, server-side price and stock validation.
3. **Week 3:** checkout and transactional order creation, payment test mode or demo payment, orders admin, dashboard metrics.
4. **Week 4:** Commerce Copilot: analytics tools, LLM adapter, structured output, grounding, fallback, recommendation actions, eval set.
5. **Week 5:** hardening, E2E tests, deployment, demo script and architecture diagram.

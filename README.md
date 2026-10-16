# CommerceOS

CommerceOS is a lightweight, single-store e-commerce platform: a customer storefront plus a merchant admin dashboard. **Commerce Copilot** is its AI merchant advisor. It analyses the store's own data (sales, orders, products, inventory) and suggests a few prioritised, evidence-backed actions. The Copilot is **advisory only**: it never changes prices, products or orders by itself.

This is a 5-week AI Engineering portfolio MVP. The full specification is in [`.ai/specs/2026-10-13-commerceos-mvp.md`](.ai/specs/2026-10-13-commerceos-mvp.md), the agent rules are in [`AGENTS.md`](AGENTS.md), and the day-to-day coding conventions are in [`ENGINEERING_STANDARDS.md`](ENGINEERING_STANDARDS.md).

> **Current state: foundation, admin sign-in, admin catalog management and storefront browsing.** The monorepo, database layer, DI container, env validation, health check, tests, owner authentication for `/admin`, admin product and category management and the storefront (a shop-front home page with featured products, browse by category, product pages) exist. The demo store sells fictional gaming accessories. Stock adjustment, search, cart, checkout and the Copilot workflow are **not implemented yet** (see [Roadmap](#roadmap)).

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
- Docker Desktop: local PostgreSQL, and the Testcontainers PostgreSQL used by integration and e2e tests. On Windows it requires the **Virtual Machine Platform** / WSL 2 feature. To only run the app, any PostgreSQL 17 instance works via `DATABASE_URL`.
- For e2e tests: agent-browser and Chrome for Testing, installed with `bash .ai/scripts/ensure-agent-browser.sh` (pinned and checksum-verified; use Git Bash on Windows).

## Getting started

```bash
npm install                 # installs all workspaces
cp .env.example .env        # one .env for the whole repo, at the root
                            # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
npm run db:up               # starts PostgreSQL for local development
npm run db:migrate          # applies migrations
npm run db:seed             # loads demo data (repeatable; marked [DEMO])
                            # (a gaming-accessories store; see "Demo data" below)
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='at-least-12-chars' npm run admin:create
                            # creates the single store owner (or put both in .env)
npm run dev                 # http://localhost:3000
```

Verify the setup:

- http://localhost:3000: storefront home with a hero, featured products (tabs: `/?category=<slug>`), a header menu and a footer
- http://localhost:3000/products: published products, filterable with `?category=<slug>`; http://localhost:3000/products/vortex-wireless-mouse: a product page
- http://localhost:3000/admin: redirects to `/admin/sign-in`; after signing in as the owner, the dashboard with live system status
- http://localhost:3000/admin/products and http://localhost:3000/admin/categories (signed in): catalog management. Create and edit products and categories, publish or unpublish a product (the page says what shoppers will see), and tick "Featured on home page" to put a published product in the home page slider
- http://localhost:3000/api/health: returns `200 {"status":"ok",...}` when the database is reachable, `503 {"status":"degraded",...}` otherwise

Always open the app at `http://localhost:3000`, not at the "Network" address `next dev` prints:
- From another origin, the dev server blocks hot-reload, and the page keeps reloading ("Compiling" never stops).
- Sign-in trusts only `APP_URL`.

## Environment variables

Defined and validated in `packages/app/src/server/env.ts`; invalid configuration fails with a message listing the problems.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string for the app and CLI |
| `DATABASE_DEBUG` | no (`false`) | Log SQL queries |
| `APP_URL` | no (`http://localhost:3000`); **yes in production** | Public base URL and the only origin trusted for sign-in |
| `BETTER_AUTH_SECRET` | yes (32+ chars) | Signs Better Auth cookies and tokens |
| `AUTH_TRUSTED_IP_HEADER` | no | Client-IP header set by a trusted proxy (e.g. `x-real-ip`). Unset: sign-in is rate-limited globally (20/min); set: 5/min per IP |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | CLI only | Read by `npm run admin:create` (password: 12+ chars), never by the app |
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
| `npm run test:coverage` | Unit tests with the 100% coverage gate (HTML report in `coverage/`) |
| `npm run test:integration` | Integration tests against a throwaway PostgreSQL container (Testcontainers, needs Docker) |
| `npm run test:e2e` | Browser tests: starts PostgreSQL and the built app, drives it with agent-browser (run `npm run build` first) |
| `npm run format` / `npm run format:check` | Prettier write / check |
| `npm run db:up` / `npm run db:down` | Start / stop local PostgreSQL |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:migration:create` | Generate a migration from entity changes (review it before committing) |
| `npm run db:seed` | Load or refresh demo seed data |

## Tests and CI

| Layer | Files | Runs against |
|---|---|---|
| Unit | `packages/*/src/**/*.test.ts` | Nothing external; **100% coverage required** (`npm run test:coverage`) |
| Integration | `packages/*/src/**/*.int.test.ts` | A throwaway PostgreSQL 17 container (Testcontainers) |
| E2E | `packages/app/e2e/**/*.e2e.test.ts` | The production build started against its own PostgreSQL container, driven by agent-browser |

`.github/workflows/ci.yml` runs on every pull request and on `main`, with one check per job: lint/format/typecheck, unit tests with coverage, build, integration tests, and e2e tests (screenshots of failing e2e tests are uploaded as an artifact). Docker is the only service the tests need; there is no shared test database.

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

- **Admin access:**
  - There is one owner account and no public sign-up.
  - A lost password is reset with `npm run admin:create -- --rotate-password`, which also signs the owner out everywhere. There is no reset email.
  - There is no account lockout (it would let anyone lock the only owner out).
  - Without `AUTH_TRUSTED_IP_HEADER`, the sign-in rate limit is shared by all clients, so anyone flooding the form can block sign-in for everyone. **Set it in any public deployment**, behind a proxy that overwrites that header.
  - Protected admin pages answer HTTP 200 with a static shell (sidebar, headings, no store data), and the redirect to `/admin/sign-in` streams in. This follows from Next 16 cache components, where session reads sit inside `<Suspense>`. Never put sensitive data in an admin page's static shell.
  - Sessions end after 8 h of inactivity.
- **Storefront catalog:**
  - A listing shows at most 48 products (sorted by name) and says "Showing 48 of N" when more match. Larger catalogues need pagination, which is out of scope for the demo.
  - A draft or unknown product URL shows "Product not found" with HTTP 200 and a `noindex` robots tag, because the not-found UI streams after the page shell (Next 16 cache components).
  - Every catalog view reads the database at request time (no caching).
  - The home page's featured slider shows up to 12 published products flagged `featured` (the "Featured on home page" checkbox in the admin product form). Plain shadcn/Tailwind styling for now: the visual design follows the design-system lesson.
- **Admin catalog:**
  - Products are never deleted (spec A4); unpublishing is how a product leaves the store.
  - Stock is set when a product is created. Changing it afterwards needs stock adjustment (admin catalog spec, Phase 2), which is not built yet, so the product form shows stock read-only.
  - Image URLs must be `https://` addresses (or the seeded `/demo/…` images); there is no upload. The admin shows a small preview and says when the image could not be loaded.
  - Lists have no pagination, search or filters (fine for the demo catalog).
  - **`npm run db:seed` overwrites owner edits to the demo products**, including stock and the "Featured" flag (#24): demo products are upserted by slug. Seeding is a dev tool, not a store operation.
- **Demo data:** the seed is a fictional gaming-accessories store (decision D10): 5 categories, 15 products, 6 featured, one out of stock. Seeding upserts by slug and never deletes, so a database seeded before 2026-10-15 still holds the old coffee products. To start clean, drop the local database and seed again: `docker compose down -v`, then `npm run db:up`, `npm run db:migrate`, `npm run db:seed` and `npm run admin:create` (this also deletes the owner account and sessions).
- No LLM provider, payments, search, cart or checkout yet.
- `npm audit` reports advisories in development tooling dependencies (e.g. `braces` via linting and test tooling); they do not affect runtime code and are tracked for a later update.

## Roadmap

1. **Week 1:** foundation (done), admin authentication (done), product/category model and admin catalog management (done), then stock adjustment.
2. **Week 2:** storefront listing and detail, search/filter, cart, server-side price and stock validation.
3. **Week 3:** checkout and transactional order creation, payment test mode or demo payment, orders admin, dashboard metrics.
4. **Week 4:** Commerce Copilot: analytics tools, LLM adapter, structured output, grounding, fallback, recommendation actions, eval set.
5. **Week 5:** hardening, E2E tests, deployment, demo script and architecture diagram.

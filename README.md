# CommerceOS

CommerceOS is a lightweight, single-store e-commerce platform: a customer storefront plus a merchant admin dashboard. **Commerce Copilot** is its AI merchant advisor. It analyses the store's own data (sales, orders, products, inventory) and suggests a few prioritised, evidence-backed actions. The Copilot is **advisory only**: it never changes prices, products or orders by itself.

This is a 5-week AI Engineering portfolio MVP. The full specification is in [`.ai/specs/2026-10-13-commerceos-mvp.md`](.ai/specs/2026-10-13-commerceos-mvp.md), the agent rules are in [`AGENTS.md`](AGENTS.md), and the day-to-day coding conventions are in [`ENGINEERING_STANDARDS.md`](ENGINEERING_STANDARDS.md).

> **Current state: foundation, admin sign-in, admin catalog management and storefront browsing.** The monorepo, database layer, DI container, env validation, health check, tests, owner authentication for `/admin`, admin product and category management, manual stock adjustment with a recorded history, and the storefront (a shop-front home page with featured products, browse by category, search, product pages) exist. The demo store sells fictional gaming accessories. Cart, checkout and the Copilot workflow are **not implemented yet** (see [Roadmap](#roadmap)).

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
- http://localhost:3000/products: published products, filterable with `?category=<slug>` and searchable with `?q=<term>` (the header search box and the listing's search form); http://localhost:3000/products/vortex-wireless-mouse: a product page
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
| `AUTH_TRUSTED_IP_HEADER` | no | Client-IP header set by a trusted proxy (e.g. `x-real-ip`). Unset: sign-in is rate-limited globally (20/min) and order lookups to 120/min shared; set: 5/min per IP for sign-in, 30/min per IP for order lookups |
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

**Demo payment only** (decision D03). After "Place order" the shopper sees `/checkout/pay/<reference>` with the banner "Demo store — this is a demo payment. No real money is charged and no card details are collected." and one button, "Confirm demo payment (no charge)". It goes through the `PaymentGateway` port to `DemoPaymentGateway` (`packages/app/src/server/payments/`), which contacts no provider, charges nothing and returns `DEMO-PAY-<order id>`. No card field exists anywhere and no card data is stored. Stripe (test mode) is a P1 option behind the same port; it is not integrated.

Purchase flow: cart → `/checkout` (guest: name, email, address in Poland; prices and stock re-checked on the server) → `/checkout/pay/<reference>` → `/orders/<reference>?paid=1`. `/orders/lookup` finds an order again by its reference.

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
  - Search is a case-insensitive substring match of the whole term (1 to 100 characters after trimming) against product names and descriptions, combined with the category filter. There is no ranking, stemming or typo tolerance, and Polish diacritics are not folded ("zolty" does not find "żółty"). `%`, `_` and `\` match literally. Each search scans the published products, which is fine at demo scale.
  - The home page's featured slider shows up to 12 published products flagged `featured` (the "Featured on home page" checkbox in the admin product form). Plain shadcn/Tailwind styling for now: the visual design follows the design-system lesson.
- **Admin catalog:**
  - Products are never deleted (spec A4); unpublishing is how a product leaves the store.
  - Stock is set when a product is created; afterwards it changes only in the **Stock** panel on the product page (`/admin/products/<id>`). The owner sets an absolute quantity (0 to 1,000,000). The panel sends the quantity it showed, and the change applies only if the stored stock still equals it; otherwise it says "Stock changed to N since this page loaded. Check it and try again." and resets the form to N, so a concurrent change (another tab, later a checkout) is never overwritten. Setting the stored value again changes nothing and is not recorded.
  - Every change is recorded in `stock_adjustments` (time, previous and new quantity) in the same transaction as the update, and the panel lists the last 20, newest first, with times in the browser's language and the store's time zone (Europe/Warsaw). The initial stock of a new product is not recorded ("Initial stock: not recorded."). There is no reason or "changed by" field (one owner).
  - Image URLs must be `https://` addresses (or the seeded `/demo/…` images); there is no upload. The admin shows a small preview and says when the image could not be loaded.
  - Lists have no pagination, search or filters (fine for the demo catalog).
  - **`npm run db:seed` overwrites owner edits to the demo products**, including stock and the "Featured" flag (#24): demo products are upserted by slug. A re-seed sets their stock back to the seed values **without** a stock history row, and keeps the history already recorded, so the last "new" value in a demo product's history can differ from its current stock. Products created in the admin are not touched. Seeding is a dev tool, not a store operation.
- **Demo data:** the seed is a fictional gaming-accessories store (decision D10): 5 categories, 15 products, 6 featured, one out of stock. Seeding upserts by slug and never deletes, so a database seeded before 2026-10-15 still holds the old coffee products. To start clean, drop the local database and seed again: `docker compose down -v`, then `npm run db:up`, `npm run db:migrate`, `npm run db:seed` and `npm run admin:create` (this also deletes the owner account and sessions).
- **Cart:**
  - The cart lives in an `httpOnly` cookie (`commerceos_cart`) holding only product ids and quantities, never prices; every page and action re-reads prices, availability and stock from the catalog. A tampered or unreadable cookie is treated as an empty cart. It needs cookies enabled and does not follow the shopper to another browser.
  - Adding to the cart **does not reserve stock**: the quantity is checked against the current stock for feedback only, and the order placement (checkout, next PR) will be the authoritative check.
  - Up to 20 different products and 99 of each; one currency per cart.
  - A product that is unpublished or sold out while in a cart disappears from it, and a quantity above the stock is lowered to it, each with a message on the cart page. The cookie itself is corrected by the next cart change (a page render cannot set cookies), so until then the message shows again and the header count may include the removed item.
  - Checkout is not available yet: the cart page says "Checkout is coming soon."
- **Checkout and orders:**
  - **Stock is decremented when the order is placed**, before payment, and an unpaid order keeps it (spec A5). There is no expiry and no cancel yet (the admin order workflow, E04, adds cancel with restock). Anyone can therefore hold stock with unpaid orders; checkout is not rate-limited. Fine for a local demo; add an expiry or a checkout limit before any public hosting.
  - The order reference (`CO-XXXXX-XXXXX-XXXXX-XXXXX`, 100 random bits) is a **bearer secret**: whoever has it sees the order's status, items and totals (never the name, email or address). It is part of the URL, so a hosting provider's access log could record it; the app's own logger never does. Order pages are `noindex` and send no referrer.
  - **Order lookups are rate-limited** (the order and payment pages and the payment button): 30 per minute per client IP when `AUTH_TRUSTED_IP_HEADER` is set, otherwise 120 per minute shared by everyone (a flood can briefly block lookups for all; set the header in any public deployment). Over the limit the page says "Too many lookups. Try again in a minute."
  - No email is sent: the confirmation tells the shopper to save the reference. Shipping is free, there is no tax, and only Poland is accepted (postal code `NN-NNN`).
  - A checkout decrement is not listed in the admin stock history (manual changes only).
- No LLM provider yet.
- `npm audit` reports advisories in development tooling dependencies (e.g. `braces` via linting and test tooling); they do not affect runtime code and are tracked for a later update.

## Roadmap

1. **Week 1:** foundation (done), admin authentication (done), product/category model and admin catalog management (done), stock adjustment (done).
2. **Week 2:** storefront listing and detail, search/filter, cart, server-side price and stock validation.
3. **Week 3:** checkout and transactional order creation, payment test mode or demo payment, orders admin, dashboard metrics.
4. **Week 4:** Commerce Copilot: analytics tools, LLM adapter, structured output, grounding, fallback, recommendation actions, eval set.
5. **Week 5:** hardening, E2E tests, deployment, demo script and architecture diagram.

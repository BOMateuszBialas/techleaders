# CommerceOS

CommerceOS is a lightweight, single-store e-commerce platform: a customer storefront plus a merchant admin dashboard. **Commerce Copilot** is its AI merchant advisor. It analyses the store's own data (sales, orders, products, inventory) and suggests a few prioritised, evidence-backed actions. The Copilot is **advisory only**: it never changes prices, products or orders by itself.

This is a 5-week AI Engineering portfolio MVP. The full specification is in [`.ai/specs/2026-10-13-commerceos-mvp.md`](.ai/specs/2026-10-13-commerceos-mvp.md), the agent rules are in [`AGENTS.md`](AGENTS.md), and the day-to-day coding conventions are in [`ENGINEERING_STANDARDS.md`](ENGINEERING_STANDARDS.md).

> **Current state: foundation, admin sign-in, admin catalog management and storefront browsing.** The monorepo, database layer, DI container, env validation, health check, tests, owner authentication for `/admin`, admin product and category management, manual stock adjustment with a recorded history, and the storefront (a shop-front home page with featured products, browse by category, search, product pages) exist. The demo store sells fictional gaming accessories. The cart, demo checkout, admin orders, the metrics dashboard and a rule-based Commerce Copilot exist too; the Copilot's AI provider and its recommendation actions are **not implemented yet** (see [Commerce Copilot](#commerce-copilot) and [Roadmap](#roadmap)).

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
npm run db:seed             # loads the demo store (repeatable; marked [DEMO] / DEMO-)
                            # (a gaming-accessories store; see "Demo data" below)
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='at-least-12-chars' npm run admin:create
                            # creates the single store owner (or put both in .env)
npm run dev                 # http://localhost:3000
```

Verify the setup:

- http://localhost:3000: storefront home with a hero, featured products (tabs: `/?category=<slug>`), a header menu and a footer
- http://localhost:3000/products: published products, filterable with `?category=<slug>` and searchable with `?q=<term>` (the header search box and the listing's search form); http://localhost:3000/products/vortex-wireless-mouse: a product page
- http://localhost:3000/admin: redirects to `/admin/sign-in`; after signing in as the owner, the dashboard: store metrics for the last 7 days (`?period=30d` for 30 days), each with its definition, and the live system status
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
| `npm run db:seed` | Load the demo catalog (insert-only) and regenerate the demo orders and traffic |

## Tests and CI

| Layer | Files | Runs against |
|---|---|---|
| Unit | `packages/*/src/**/*.test.ts` | Nothing external; **100% coverage required** (`npm run test:coverage`) |
| Integration | `packages/*/src/**/*.int.test.ts` | A throwaway PostgreSQL 17 container (Testcontainers) |
| E2E | `packages/app/e2e/**/*.e2e.test.ts` | The production build started against its own PostgreSQL container, driven by agent-browser |

`.github/workflows/ci.yml` runs on every pull request and on `main`, with one check per job: lint/format/typecheck, unit tests with coverage, build, integration tests, and e2e tests (screenshots of failing e2e tests are uploaded as an artifact). Docker is the only service the tests need; there is no shared test database.

## Commerce Copilot

`/admin/copilot` (signed-in owner) answers one question at a time: seven suggested questions (decision D09) or a typed question in English (1–500 characters). **Phase 1 is rule-based and needs no AI provider or API key.** No provider is configured yet, so every answer is labelled "Rule-based insights · AI is not configured"; the provider adapter arrives in Phase 2 of the Copilot spec, and the app never fabricates an AI answer.

- **Routing is deterministic:** keyword patterns map a typed question to one of the seven intents. Questions about margin or profit, ad spend, customer demographics or segments, competitors, forecasts or conversion by traffic source are declined with the data they would need ("Copilot can't answer this. It needs product cost data, which this store does not record."). Anything else gets the list of questions Copilot answers. Neither runs a tool.
- **Approved tools only:** `getSalesSummary`, `getOrderSummary`, `getTopProducts`, `getLowStockProducts` (`packages/ai/src/tools/`), each a validated wrapper around the dashboard's metric use case, unchanged, plus `getTrafficSummary`, which reads the seeded, **fictional demo traffic** (decision D08) through `GetTrafficSummaryUseCase` and takes every order figure from the same metric use cases. Every number shown comes from them, so the Copilot and `/admin` cannot disagree.
- **Rule-based insights:** a summary plus at most 3 recommendations: a best seller of the period at or below 5 in stock ("Restock …", high), no paid orders in the period (high), and, for "What could explain the recent change in sales?", the change against the previous period of the same length (medium, with "it cannot show what caused the change"). Each recommendation shows its evidence (metric, value, period, source), why it matters, a suggested next step that stays the owner's decision, and limitations.
- **Traffic questions** (Copilot spec Phase 3): "Where does my traffic come from?" (demo sessions by source with their shares), "Where in the funnel do visitors drop off?" (the funnel and the step with the largest drop-off, medium) and "Which products get views but few sales?" (the most viewed products; an out-of-stock product with views gets "Restock or hide …", high; a product with at least 50 views converting at under half the store's view-to-purchase rate gets "Review the product page and price of …", medium). The primary question reads the same data. Every demo figure carries a "Fictional demo data" tag, every answer that read it says the figures are fictional demo data, and conversion is never computed per traffic source (that question is declined). A product without demo view rows has no rate, never 0 views. Storefront visits write nothing: the traffic tables change only with `npm run db:seed`.
- **Evidence for the summary too:** the numbers in an answer's summary are listed under "Figures in this summary" with their metric, period and source.
- **Limits and logs:** 10 questions per owner per 10 minutes (429 after that). One `copilot.answer` log line per question with the intent, tools and outcome, never the question text or store figures.
- Copilot reads store data and changes nothing; recommendations are not stored yet (save, dismiss and complete arrive in Phase 4).

## Payments

**Demo payment only** (decision D03). After "Place order" the shopper sees `/checkout/pay/<reference>` with the banner "Demo store — this is a demo payment. No real money is charged and no card details are collected." and one button, "Confirm demo payment (no charge)". It goes through the `PaymentGateway` port to `DemoPaymentGateway` (`packages/app/src/server/payments/`), which contacts no provider, charges nothing and returns `DEMO-PAY-<order id>`. No card field exists anywhere and no card data is stored. Stripe (test mode) is a P1 option behind the same port; it is not integrated.

Purchase flow: cart → `/checkout` (guest: name, email, address in Poland; prices and stock re-checked on the server) → `/checkout/pay/<reference>` → `/orders/<reference>?paid=1`. `/orders/lookup` finds an order again by its reference.

## Store metrics (admin dashboard)

`/admin` shows the store's metrics for **"Last 7 days"** (default) or **"Last 30 days"** (`/admin?period=7d|30d`; any other value means 7 days): whole calendar days in the store time zone **Europe/Warsaw**, today included. Each card prints its definition next to the number. The definitions below are a product rule (R05, orders spec A8, confirmed by the product owner); they live once in `packages/core/src/domain/metrics/metric-definitions.ts`, the SQL in `packages/database/src/adapters/database-store-metrics.ts` implements them, and the Commerce Copilot tools (E05) will call the same use cases (`GetSalesSummaryUseCase`, `GetOrderSummaryUseCase`, `GetTopProductsUseCase`, `GetLowStockProductsUseCase`). Change them only together.

| Metric | Definition |
| --- | --- |
| Orders placed | Orders created in the period, in any status and any currency, split by their current status. |
| Paid orders | Orders in PLN with a payment date inside the period and a status of paid, processing or shipped. |
| Revenue from paid orders | Sum of the totals of paid orders (shipping included, it is always 0; no tax exists). Cancelled and refunded orders are excluded, also when they were once paid, so marking an order refunded lowers the revenue of the period it was paid in. |
| Average order value | Revenue ÷ paid orders, rounded half up to a whole grosz; "Not enough data" when there are no paid orders. |
| Top products | Line items of paid orders in the period, ranked by units, then revenue, then name; top 5. |
| Low stock | Published products with 5 or fewer in stock now, out-of-stock included. |

Fictional demo traffic (decision D08) has its own definitions in the same file (`DEMO_TRAFFIC_METRIC_IDS`). The dashboard does not show them; only the Copilot's `getTrafficSummary` reports them, always labelled as demo data:

| Metric | Definition |
| --- | --- |
| Sessions (demo) | Fictional seeded visits per day and traffic source; not measured from real visitors. |
| Funnel (demo) | Demo sessions → product views → add-to-cart → checkout started, then paid orders from the orders table. A step's drop-off is the share of the step before it that did not reach it. |
| Store conversion rate (demo) | Paid orders divided by demo sessions over the same days; "Not enough data" when there are no sessions. It is not computed per source, because orders carry no traffic source. |
| Product view-to-purchase rate (demo) | Units of the product in paid orders divided by its demo views over the same days; no rate for a product without demo view data. The store's rate divides all units in paid orders by all demo product views. |

- Metrics cover the store currency (PLN) only; paid orders in another currency are left out and counted in a note ("N orders in other currencies are not included."). "Orders placed" counts every currency.
- An order placed before the period but paid inside it counts in revenue (by payment date) and not in "Orders placed" (by creation date).
- Seeded demo orders (`DEMO-` references) count like real ones; the dashboard says "Includes N seeded demo orders (fictional)." whenever the period has any (placed or paid in it).
- A deleted product keeps its sales in "Top products" under the name on its order lines (one row per name it was sold under), marked "(deleted product)".
- Every figure comes from SQL aggregates at request time (AOV is divided from them); nothing is cached or precomputed.

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
  - A published product must cost more than 0.00 PLN; a draft may be 0.00 (#41). Saving or publishing a free product as published is refused with a message.
  - Stock is set when a product is created; afterwards it changes only in the **Stock** panel on the product page (`/admin/products/<id>`). The owner sets an absolute quantity (0 to 1,000,000). The panel sends the quantity it showed, and the change applies only if the stored stock still equals it; otherwise it says "Stock changed to N since this page loaded. Check it and try again." and resets the form to N, so a concurrent change (another tab, later a checkout) is never overwritten. Setting the stored value again changes nothing and is not recorded.
  - Every change is recorded in `stock_adjustments` (time, previous and new quantity) in the same transaction as the update, and the panel lists the last 20, newest first, with times in the browser's language and the store's time zone (Europe/Warsaw). The initial stock of a new product is not recorded ("Initial stock: not recorded."). There is no reason or "changed by" field (one owner).
  - Image URLs must be `https://` addresses (or the seeded `/demo/…` images); there is no upload. The admin shows a small preview and says when the image could not be loaded.
  - Lists have no pagination, search or filters (fine for the demo catalog).
  - `npm run db:seed` never changes an existing product or category (#24, orders spec A18): owner edits to demo products (stock, "Featured", price, status) survive a re-seed, and the stock history stays consistent. Seeding is a dev tool, not a store operation.
- **Demo data:** the seed is a fictional gaming-accessories store (decision D10): 5 categories, 15 products, 6 featured, one out of stock, plus a **fictional order history and fictional traffic** over the 35 days ending on the day you run it (orders spec Phase 2, D08):
  - About 150 orders, `DEMO-0001` onwards, with `[DEMO]` customers and `example.com` emails. They show a "Demo" badge in the admin, and the order page says "Seeded demo order: the customer is fictional and no real purchase happened." Older orders are shipped, the last week's are paid or processing, two are cancelled and one is refunded; none awaits payment. They count in the store's metrics like any order (they are its demo history) and never changed stock: the seeded stock is the stock after them.
  - Patterns for the Copilot to find (on a freshly seeded database): Pulse Ultralight Mouse is the best seller of the last 7 days and low in stock; Titan MMO Mouse sold only in the first two weeks and is out of stock; Drift Wireless Headset has many views and few sales; Vortex Wireless Mouse and Glide XL Mousepad sell steadily; Arena Fight Stick sells rarely.
  - `traffic_daily_stats` (sessions, product views, add-to-carts and checkouts per day and source) and `product_view_daily_stats` (views per product and day) are **seeded, fictional data**, never measured: there is no analytics integration. They are derived from the seeded orders, so each day's funnel covers that day's orders. Orders placed later through the storefront have no traffic behind them.
  - **Re-seeding** creates missing categories and products (by slug) and never updates existing ones, so seed changes to an existing demo product reach only a fresh database. It deletes and regenerates every `DEMO-` order and all traffic rows, re-anchored to the new date: status changes you made to demo orders are lost, and real (`CO-`) orders are never touched. A demo product that cannot be created (for example, its SKU now belongs to another product) is skipped with a warning.
  - Catalog rows are never deleted, so a database seeded before 2026-10-15 still holds the old coffee products. To start clean, drop the local database and seed again: `docker compose down -v`, then `npm run db:up`, `npm run db:migrate`, `npm run db:seed` and `npm run admin:create` (this also deletes the owner account and sessions).
- **Cart:**
  - The cart lives in an `httpOnly` cookie (`commerceos_cart`) holding only product ids and quantities, never prices; every page and action re-reads prices, availability and stock from the catalog. A tampered or unreadable cookie is treated as an empty cart. It needs cookies enabled and does not follow the shopper to another browser.
  - Adding to the cart **does not reserve stock**: the quantity is checked against the current stock for feedback only, and the order placement (checkout, next PR) will be the authoritative check.
  - Up to 20 different products and 99 of each; one currency per cart.
  - A product that is unpublished or sold out while in a cart disappears from it, and a quantity above the stock is lowered to it, each with a message on the cart page. The cookie itself is corrected by the next cart change (a page render cannot set cookies), so until then the message shows again and the header count may include the removed item.
  - Checkout is not available yet: the cart page says "Checkout is coming soon."
- **Checkout and orders:**
  - **Stock is decremented when the order is placed**, before payment, and an unpaid order keeps it (spec A5). There is no expiry: the owner cancels an unpaid order in the admin, which returns its stock. Anyone can still hold stock with unpaid orders until then; checkout is not rate-limited. Fine for a local demo; add an expiry or a checkout limit before any public hosting.
  - The order reference (`CO-XXXXX-XXXXX-XXXXX-XXXXX`, 100 random bits) is a **bearer secret**: whoever has it sees the order's status, items and totals (never the name, email or address). It is part of the URL, so a hosting provider's access log could record it; the app's own logger never does. Order pages are `noindex` and send no referrer.
  - **Order lookups are rate-limited** (the order and payment pages and the payment button): 30 per minute per client IP when `AUTH_TRUSTED_IP_HEADER` is set, otherwise 120 per minute shared by everyone (a flood can briefly block lookups for all; set the header in any public deployment). Over the limit the page says "Too many lookups. Try again in a minute."
  - No email is sent: the confirmation tells the shopper to save the reference. Shipping is free, there is no tax, and only Poland is accepted (postal code `NN-NNN`).
  - A checkout decrement is not listed in the admin stock history (manual changes only).
- **Admin orders** (`/admin/orders`, E04-S01):
  - The list shows 25 orders per page, newest first (reference, date, status, total, items), with "Newer" / "Older" links. There is no search or filter.
  - The detail page (`/admin/orders/<id>`, the order's uuid, never its reference) shows the item snapshots (name, SKU and price saved at checkout; a deleted product shows "(deleted product)"), totals, the customer's name, email and address, and the payment.
  - Status workflow: `paid → processing → shipped`; an unpaid order (`pending_payment`) can only be **cancelled**, which returns its stock in the same transaction; `paid`, `processing` and `shipped` orders can be **marked as refunded**, which is a **record only**: no money moves and no stock returns (there is no real payment). Cancelled and refunded are final. Only the allowed buttons are shown, and the server refuses anything else.
  - **There is no manual "mark as paid"**: an order becomes paid only through the payment flow (the demo payment), so the admin can never create a payment that did not happen (decision A3).
  - Each change applies only while the order still has the status the page showed; if it changed meanwhile (another tab, or the shopper paid while the owner cancelled), the page says "This order changed to … in the meantime" and shows the current status. Cancel and refund need a confirmation tick.
  - The restock of a cancelled order is not listed in the stock history (manual changes only), and there is no status history: the page shows when the order was placed, paid and last updated.
- **Dashboard:**
  - Two fixed periods only (last 7 or 30 days); no custom range or comparison (P1). The low-stock threshold is 5 on the dashboard (the use case takes 1–1000 for the Copilot). The low-stock card lists 10 products and says "Showing 10 of N" when there are more.
  - No demo traffic is shown (the fictional traffic data is for the Copilot, D08).
- No LLM provider yet.
- `npm audit` reports advisories in development tooling dependencies (e.g. `braces` via linting and test tooling); they do not affect runtime code and are tracked for a later update.

## Roadmap

1. **Week 1:** foundation (done), admin authentication (done), product/category model and admin catalog management (done), stock adjustment (done).
2. **Week 2:** storefront listing and detail, search/filter, cart, server-side price and stock validation.
3. **Week 3:** checkout and transactional order creation, payment test mode or demo payment, orders admin, dashboard metrics.
4. **Week 4:** Commerce Copilot: analytics tools, LLM adapter, structured output, grounding, fallback, recommendation actions, eval set.
5. **Week 5:** hardening, E2E tests, deployment, demo script and architecture diagram.

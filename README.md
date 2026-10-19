# CommerceOS

CommerceOS is a lightweight, single-store e-commerce platform: a customer storefront plus a merchant admin. Its **Commerce Copilot** is an AI merchant advisor. It reads the store's own data (sales, orders, products, stock and fictional demo traffic) and answers with a short summary and up to 3 prioritised recommendations, each backed by evidence. The Copilot is **advisory only**: it never changes prices, products or orders.

It is a 5-week AI Engineering portfolio MVP. The P0 scope of the [MVP spec](.ai/specs/2026-10-13-commerceos-mvp.md) is complete: storefront, cart, demo checkout, admin catalog, stock, orders, metrics dashboard and the Copilot. The demo store sells fictional gaming accessories.

**What to look at as a reviewer:**

- **Grounded AI, not a chat box.** Questions are routed deterministically to approved, read-only tools. The model sees aggregates only, its JSON is schema-validated and checked number by number against the tool results, and a bounded retry falls back to rule-based insights. Without an API key everything still works, rule-based and labelled as such.
- **Commerce rules on the server.** Prices, totals and stock are re-checked when an order is placed. Stock is decremented atomically in one transaction (no overselling), and order status changes follow a transition table with conditional updates.
- **Engineering gate.** A modular monorepo with enforced package boundaries, one DI composition root, and migrations as the source of truth. Unit tests run at 100% coverage, integration tests against a real PostgreSQL (Testcontainers), and browser e2e tests against the production build, all in CI on every pull request.

Contents: [Quick start](#quick-start) · [5-minute demo](#5-minute-demo-walkthrough) · [Limitations](#what-is-real-and-what-is-not) · [Architecture](#architecture) · [Specs and process](#specs-and-process-documents) · [Reference](#reference)

## Quick start

You need Node.js **≥ 22.17** (developed on 24) with npm, and Docker for the local PostgreSQL. Any PostgreSQL 17 reachable through `DATABASE_URL` works instead of Docker.

```bash
npm install                 # installs all workspaces
cp .env.example .env        # one .env for the whole repo, at the root
# edit .env: set BETTER_AUTH_SECRET to 32+ random characters (openssl rand -base64 32)
#            and add ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) for the owner account
npm run db:up               # starts PostgreSQL 17 (docker compose)
npm run db:migrate          # applies the migrations
npm run db:seed             # loads the demo store: catalog, ~150 DEMO- orders, fictional traffic
npm run admin:create        # creates the single store owner from ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev                 # http://localhost:3000
```

- Open the app at `http://localhost:3000`, not at the "Network" address `next dev` prints: sign-in trusts only `APP_URL`, and the dev server blocks hot reload from another origin.
- `npm run admin:create` reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the environment or from `.env`, and the app itself never reads them. You can remove them from `.env` afterwards.
- No AI key is needed. The Copilot then gives rule-based answers; see [demo step 6](#5-minute-demo-walkthrough) to turn on Gemini.
- `curl http://localhost:3000/api/health` returns `200 {"status":"ok",...}` when the database is reachable.

## 5-minute demo walkthrough

The demo follows the [primary demo story](.ai/specs/2026-10-13-commerceos-mvp.md#primary-demo-story) on a freshly seeded database. The seed's demo orders and traffic are anchored to the day you run `npm run db:seed`.

1. **Storefront.** Open http://localhost:3000. The home page shows featured products with category tabs. Use the header search (try "mouse"), or click **Shop all products** and filter by category. Open **Vortex Wireless Mouse** (`/products/vortex-wireless-mouse`).
2. **Cart.** Click **Add to cart**, open the cart from the header, change the quantity, then click **Checkout**. The cart cookie holds only product ids and quantities: every page re-reads prices and stock on the server.
3. **Demo checkout.** Fill in a name, an email and an address in Poland (postal code `NN-NNN`, e.g. `80-827`), then click **Place order**. The server re-checks prices and stock and decrements stock in one transaction. The payment page says it is a demo payment: click **Confirm demo payment (no charge)**. The confirmation page shows the order reference (`CO-…`). Save it: it is the only way back to the order (`/orders/lookup`).
4. **Admin orders.** Open http://localhost:3000/admin and sign in as the owner. In **Orders**, your order is at the top with the status **Paid**, above the seeded `DEMO-` orders. Open it, then click **Mark as processing** and **Mark as shipped**. Only allowed transitions are offered, and there is no "mark as paid": only the payment flow sets it.
5. **Dashboard metrics.** Back on the dashboard (**Last 7 days**, or **Last 30 days**), every card prints its definition next to the number: orders placed, paid orders, revenue, average order value, top products and low stock. Your order is included, and so are the seeded demo orders (the page says how many).
6. **Commerce Copilot, rule-based.** Open **Copilot** and click **What should I focus on to improve sales this week?**. Without an API key the answer is labelled "Rule-based insights · AI is not configured". It shows a summary and recommendations such as restocking the best seller that is running low, each with evidence (metric, value, period, source) and limitations. Try **Where does my traffic come from?**: every figure carries a "Fictional demo data" tag. Type a question it cannot answer into **Or ask about your store**, e.g. "What is my profit margin per product?", and click **Ask**: it declines and names the data it would need.
7. **Commerce Copilot, with Gemini (optional).** Add to `.env`:

   ```bash
   LLM_PROVIDER=gemini
   LLM_API_KEY=<your Google AI Studio key>
   LLM_MODEL=gemini-3-flash-preview
   ```

   Restart `npm run dev` and ask the same question. The answer is now labelled "AI-generated · gemini-3-flash-preview". It is shown only if every number and product in it matches the tool results. An answer that fails these checks gets one retry; on any failure the Copilot falls back to the rule-based answer and says why ("The AI answer failed our checks", "The AI provider is busy", "Daily AI limit reached").
8. **Recommendation actions.** On a recommendation, click **Save**. It appears under **Your recommendations** below the answer. Click **Mark completed** there. Dismissed and completed are final, every change is recorded with its time, and none of them changes store data.
9. **AI product descriptions (optional, with the key).** Open **Products**, then **Vortex Wireless Mouse**, and click **Draft with AI** under Description. The draft appears in its own panel and uses only the name, category, price and description in the form; click **Replace description with this draft**, edit it if you like, and click **Save changes**. Without a key the button is disabled and says why.

To start the demo again from a clean store, see [Demo data](#known-limitations) (re-seeding regenerates the demo orders and traffic; `docker compose down -v` resets everything).

## What is real and what is not

| Area | What the demo does | What it does not do |
|---|---|---|
| Payment | A clearly labelled **demo payment** (`DemoPaymentGateway` behind a `PaymentGateway` port). No card field exists and nothing is charged. | No Stripe or any real provider (Stripe test mode is a P1 option behind the same port). |
| Shipping, refunds, tax | Orders move through `paid → processing → shipped`; "refunded" is a recorded status. | No carrier, no money movement on refund, no tax, Poland only, shipping always free. |
| Traffic and conversion | Sessions, funnel and product views are **seeded, fictional data** (decisions D07 and D08), labelled as such wherever they appear. | No analytics integration; storefront visits are not tracked. |
| Demo orders | About 150 seeded `DEMO-` orders with `[DEMO]` customers give the metrics and the Copilot a history. | Not real purchases; they never changed stock. |
| AI answers | Optional Google Gemini **free tier** through `@google/genai`. `gemini-3-flash-preview` is a preview model id and can be retired (update `LLM_MODEL`). Free-tier quotas change often, and Google may use free-tier prompts to improve its products. The Copilot sends only aggregates of a fictional store. | No automated test calls a real provider; the eval set runs against a scripted model. |
| AI descriptions | Optional drafts from the same Gemini free tier, sent only the product's name, category, price and description; shown only when every number, feature, platform, brand and claim also appears in those fields. | Never saved or published by the AI: the owner copies a draft into the form and saves it. The check is lexical, so paraphrases and adjectives are left to the owner's review. |
| Accounts | One owner account, email and password, revocable DB sessions. | No sign-up, no password-reset email, no customer accounts (guest checkout). |

The full list, area by area, is in [Known limitations](#known-limitations). This is a portfolio MVP, not a production-ready store.

## Architecture

```text
packages/
  app/        Next.js app: storefront, admin, route handlers and server actions,
              DI composition root (src/server/container.ts), env validation
  core/       Domain rules, use cases, Zod input schemas, ports, typed errors (no framework)
  database/   MikroORM config, entities, migrations, seeders, adapters implementing core ports
  ai/         Commerce Copilot: LLM provider port and Gemini adapter, approved tools, prompt,
              output schemas, grounding checks, eval set
  config/     Shared tsconfig
docker-compose.yml   Local PostgreSQL
.ai/                 Specs, run logs and lessons for agent-assisted development
```

- **Modular monolith.** One deployable Next.js 16 app. Domain rules and use cases live in framework-free packages consumed as TypeScript source (no build step). Dependency direction: `app → core, ai`, and `app → database` only in the composition root; `database → core`; `ai → core`; `core` depends only on Zod. ESLint (`no-restricted-imports`) fails the lint step when a package crosses a boundary.
- **Thin presentation.** Route handlers and server actions validate input with Zod, resolve a use case from a per-request scope and map typed `AppError`s to HTTP statuses or form states. Every admin entry point goes through one guard (`packages/app/src/server/auth/require-admin.ts`), and a test fails when a page, route or action skips it.
- **Dependency injection (Awilix, strict mode).** `packages/app/src/server/container.ts` is the only place that builds infrastructure. The ORM, the Better Auth instance and the LLM provider are singletons. Each request gets a scope with its own forked MikroORM `EntityManager`, and strict mode stops a singleton from capturing a scoped object.
- **Data.** PostgreSQL 17 with MikroORM 7. Migrations are the source of truth, and an integration test fails on drift between entities and migrations. Money is stored as integer minor units with DB `check` constraints. Stock has exactly three writers: a manual change with history, the checkout decrement and the cancel restock.
- **Commerce Copilot pipeline.** Owner check and rate limit, then deterministic intent routing (seven questions; others are declined with the data they would need). Approved, read-only tools call the same metric use cases as the dashboard. Rule-based insights are always computed. When an LLM is configured, it receives a versioned prompt with the fact table under aliases, its JSON is validated with Zod and grounded against the facts, it gets at most 2 attempts within 40 s, and it falls back to the rule-based answer.
- **Tests and the gate.** `npm run lint`, `format:check`, `typecheck`, `test:coverage` (unit tests at 100% lines, branches, functions and statements), `build`, `test:integration` (Testcontainers PostgreSQL) and `test:e2e` (the production build driven by agent-browser). [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs them on every pull request. See [Tests and CI](#tests-and-ci).

Stack: Next.js 16.4 (App Router, Turbopack, Cache Components) · React 19.3 · TypeScript 5.9 (strict) · PostgreSQL 17 · MikroORM 7 · Awilix 13 · Better Auth 1.7 · Tailwind CSS 4 · shadcn/ui · Zod 4 · Google Gemini API (`@google/genai`, optional) · Vitest 5 · Testcontainers · agent-browser · ESLint 9 · Prettier 3 · npm workspaces.

## Specs and process documents

- [MVP spec](.ai/specs/2026-10-13-commerceos-mvp.md): the source of truth for scope, architecture and the Copilot design.
- Implemented feature specs in [`.ai/specs/implemented/`](.ai/specs/implemented/):
  - [Foundation](.ai/specs/implemented/2026-10-13-foundation-init.md)
  - [Engineering standards](.ai/specs/implemented/2026-10-13-engineering-standards.md)
  - [CI and test safety net](.ai/specs/implemented/2026-10-13-ci-and-test-safety-net.md)
  - [Admin authentication](.ai/specs/implemented/2026-10-15-admin-authentication.md)
  - [Admin catalog](.ai/specs/implemented/2026-10-15-admin-catalog-management.md)
  - [Storefront catalog](.ai/specs/implemented/2026-10-15-storefront-catalog.md)
  - [Cart and demo checkout](.ai/specs/implemented/2026-10-15-cart-and-demo-checkout.md)
  - [Orders, dashboard and demo store](.ai/specs/implemented/2026-10-16-orders-dashboard-demo-store.md)
  - [Commerce Copilot](.ai/specs/implemented/2026-10-17-commerce-copilot.md)
- [Product brief](.ai/specs/product-brief.md) with its decisions (D01–D10) in [`.ai/specs/research/decisions/`](.ai/specs/research/decisions/), and the [backlog](.ai/specs/backlog.md).
- [`AGENTS.md`](AGENTS.md) (agent rules), [`ENGINEERING_STANDARDS.md`](ENGINEERING_STANDARDS.md) (coding conventions), [`SDLC.md`](SDLC.md) (ticket flow and labels), [`CODE_REVIEW.md`](CODE_REVIEW.md), [`BACKWARD_COMPATIBILITY.md`](BACKWARD_COMPATIBILITY.md).
- [`.ai/runs/`](.ai/runs/) logs every autonomous agent run, and [`.ai/lessons.md`](.ai/lessons.md) records what went wrong and the rule that came out of it.

## Reference

### Prerequisites in detail

- Node.js **≥ 22.17** (developed on 24) and npm 11.
- Docker Desktop: the local PostgreSQL, and the Testcontainers PostgreSQL used by integration and e2e tests. On Windows it requires the **Virtual Machine Platform** / WSL 2 feature. To only run the app, any PostgreSQL 17 instance works via `DATABASE_URL`.
- For e2e tests: agent-browser and Chrome for Testing, installed with `bash .ai/scripts/ensure-agent-browser.sh` (pinned and checksum-verified; use Git Bash on Windows).

More pages to check after the quick start:

- http://localhost:3000/products: published products, filterable with `?category=<slug>` and searchable with `?q=<term>`.
- http://localhost:3000/admin/products and http://localhost:3000/admin/categories (signed in): catalog management. Create and edit products and categories, publish or unpublish a product, tick "Featured on home page", and set stock in the **Stock** panel of a product page.
- http://localhost:3000/api/health: `200 {"status":"ok",...}` when the database is reachable, `503 {"status":"degraded",...}` otherwise.

### Environment variables

Defined and validated in `packages/app/src/server/env.ts`; invalid configuration fails with a message listing the problems.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string for the app and CLI |
| `DATABASE_DEBUG` | no (`false`) | Log SQL queries |
| `APP_URL` | no (`http://localhost:3000`); **yes in production** | Public base URL and the only origin trusted for sign-in |
| `BETTER_AUTH_SECRET` | yes (32+ chars) | Signs Better Auth cookies and tokens |
| `AUTH_TRUSTED_IP_HEADER` | no | Client-IP header set by a trusted proxy (e.g. `x-real-ip`). Unset: sign-in is rate-limited globally (20/min) and order lookups to 120/min shared; set: 5/min per IP for sign-in, 30/min per IP for order lookups |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | CLI only | Read by `npm run admin:create` (password: 12+ chars), never by the app |
| `LLM_PROVIDER` | no | `gemini` turns on AI answers in Commerce Copilot. Unset or empty: rule-based insights only, no network call |
| `LLM_API_KEY` | when `LLM_PROVIDER` is set | Gemini API key from Google AI Studio. Server-only, never logged |
| `LLM_MODEL` | when `LLM_PROVIDER` is set | Gemini model id, e.g. `gemini-3-flash-preview` (no default in code) |
| `NODE_ENV` | no | Standard Node environment |

There are no payment variables: the demo payment needs none. The e2e suite blanks the three `LLM_*` variables, so a developer key never reaches it.

### Commands

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
| `npm run admin:create` | Create the store owner from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (`-- --rotate-password` sets a new password and signs the owner out everywhere) |

### Tests and CI

| Layer | Files | Runs against |
|---|---|---|
| Unit | `packages/*/src/**/*.test.ts` | Nothing external; **100% coverage required** (`npm run test:coverage`) |
| Integration | `packages/*/src/**/*.int.test.ts` | A throwaway PostgreSQL 17 container (Testcontainers) |
| E2E | `packages/app/e2e/**/*.e2e.test.ts` | The production build started against its own PostgreSQL container, driven by agent-browser |

`.github/workflows/ci.yml` runs on every pull request and on `main`, with one check per job: lint/format/typecheck, unit tests with coverage, build, integration tests, and e2e tests (screenshots of failing e2e tests are uploaded as an artifact). Docker is the only service the tests need; there is no shared test database.

### Commerce Copilot

`/admin/copilot` (signed-in owner) answers one question at a time: seven suggested questions (decision D09) or a typed question in English (1–500 characters). It works without any AI provider: then every answer is rule-based and labelled "Rule-based insights · AI is not configured". With `LLM_PROVIDER=gemini`, `LLM_API_KEY` and `LLM_MODEL` set, an answered question is written by the model (see [AI answers](#ai-answers-gemini)); the app never fabricates an AI answer.

- **Routing is deterministic:** keyword patterns map a typed question to one of the seven intents. Questions about margin or profit, ad spend, customer demographics or segments, competitors, forecasts or conversion by traffic source are declined with the data they would need ("Copilot can't answer this. It needs product cost data, which this store does not record."). Anything else gets the list of questions Copilot answers. Neither runs a tool.
- **Approved tools only:** `getSalesSummary`, `getOrderSummary`, `getTopProducts`, `getLowStockProducts` (`packages/ai/src/tools/`), each a validated wrapper around the dashboard's metric use case, unchanged, plus `getTrafficSummary`, which reads the seeded, **fictional demo traffic** (decision D08) through `GetTrafficSummaryUseCase` and takes every order figure from the same metric use cases. Every number shown comes from them, so the Copilot and `/admin` cannot disagree.
- **Rule-based insights:** a summary plus at most 3 recommendations: a best seller of the period at or below 5 in stock ("Restock …", high), no paid orders in the period (high), and, for "What could explain the recent change in sales?", the change against the previous period of the same length (medium, with "it cannot show what caused the change"). Each recommendation shows its evidence (metric, value, period, source), why it matters, a suggested next step that stays the owner's decision, and limitations.
- **Traffic questions** (Copilot spec Phase 3): "Where does my traffic come from?" (demo sessions by source with their shares), "Where in the funnel do visitors drop off?" (the funnel and the step with the largest drop-off, medium) and "Which products get views but few sales?" (the most viewed products; an out-of-stock product with views gets "Restock or hide …", high; a product with at least 50 views converting at under half the store's view-to-purchase rate gets "Review the product page and price of …", medium). The primary question reads the same data. Every demo figure carries a "Fictional demo data" tag, every answer that read it says the figures are fictional demo data, and conversion is never computed per traffic source (that question is declined). A product without demo view rows has no rate, never 0 views. Storefront visits write nothing: the traffic tables change only with `npm run db:seed`.
- **Evidence for the summary too:** the numbers in an answer's summary are listed under "Figures in this summary" with their metric, period and source.
- **Limits and logs:** 10 questions per owner per 10 minutes (429 after that). One `copilot.answer` log line per question with the intent, tools and outcome, never the question text or store figures.
- **Recommendation actions** (Copilot spec Phase 4, #26): every answered question's recommendations are stored as `new` in `copilot_recommendations` (with the answer's origin, fallback reason, model and evidence, including the demo flags; never the question text). Each card offers **Save**, **Dismiss** and **Mark completed**; a saved one can still be completed or dismissed, and dismissed and completed are final. Every change records the time and applies only if the recommendation is still in the status the page showed (a second tab gets "This recommendation is already …"). **Your recommendations** below the answer lists saved and completed ones, newest first, 20 per page (`/admin/copilot?page=2`). A product deleted since shows as "(deleted product)".
- Copilot reads store data and changes nothing in it: the only rows it writes are its own recommendations and the rate-limit counters. An existing database needs `npm run db:migrate` for its table (migration `Migration20261018180016_copilot_recommendations`).

#### AI answers (Gemini)

- **Provider:** Google Gemini API, **free tier**, through the official `@google/genai` SDK (`GeminiLlmProvider` behind `LlmProviderPort`, `packages/ai/src/adapters/`). Create a key in Google AI Studio and pick a Flash model the free tier offers; `gemini-3-flash-preview` was used in the smoke test (Gemini 2.5 models are not open to new keys). **Cost: $0** on the free tier; free-tier quotas change often, and a provider 429 falls back to rule-based insights ("The AI provider is busy").
- **One structured call per attempt:** the model gets a versioned system prompt and returns JSON that follows a response schema. At most **2 attempts** within one **40 s** deadline (20 s per attempt, low thinking level, 4 000 output tokens); a second attempt runs only when the first failed the checks and at least 10 s remain. Timeouts and provider errors are not retried.
- **Grounding:** the answer is shown only when every number in a recommendation is the value of a fact that recommendation cites (or the period length), every product it names or whose fact it cites is listed, every cited fact and product exists, the summary and observations claim no cause, and there are at most 3 recommendations. Otherwise the problems (codes and ids only) go back to the model once; after that the rule-based answer is shown with "The AI answer failed our checks". The answer says "AI-generated · <model>" or "Rule-based insights · <reason>".
- **Data sent (aggregates only):** the canonical text of the routed question (never the owner's own text), the period, and the fact table: metric values with period and source, product names and SKUs under short aliases (`p1`, `p2`). Never product ids, descriptions, customer data, order references or secrets. Product names are sent as JSON data and the prompt treats them as data, not instructions. **Free-tier note:** Google may use free-tier prompts and responses to improve its products; that is acceptable here only because the payload is aggregates of a fictional demo store.
- **Limits:** 10 questions per owner per 10 minutes, plus **100 LLM attempts per day** for the whole store (each attempt counts); above it the rule-based answer says "Daily AI limit reached". The log line adds the provider, model, prompt version, attempts, issue codes, token usage and latency, never the prompt or the answer.
- **Evals:** `packages/ai/src/evals/` holds the version-controlled eval set: a grounded answer, a fabricated number, a real number on the wrong product, unknown ids, a causal claim, a prompt injection in a product name (obeyed and ignored), invalid JSON, timeout, provider 429, an empty store, and every declined category. `run-evals.test.ts` runs them in the unit suite against a scripted model and asserts properties (origin, fallback reason, number of calls, absent fabrications, no product id in the prompt), never wording. No automated test calls a real provider; a live eval script is P1.

#### AI drafts (product descriptions)

P1, spec `.ai/specs/implemented/2026-10-18-ai-product-descriptions.md`. `POST /api/admin/products/description-drafts` (signed-in owner) drafts a product description from the values currently in the product form. In the admin, **Draft with AI** sits under the Description field on `/admin/products/new` and `/admin/products/<id>`: the draft appears in a separate "AI draft, not saved" panel (plain text, with the fields it used and "Check every claim before you use it."), and **Replace description with this draft** copies it into the Description field, with **Undo** to get the previous text back. **The draft is never saved**: the owner edits it and clicks **Save changes** on the normal form. Without an AI key the button is disabled and says "AI drafting is not set up on this store (no AI key)".

- **Data sent (A1):** only the product's own copy: name, category name, price as `249.00 PLN` and the description text in the form (as "owner notes"), as one JSON object. Never the SKU, stock, status, image, ids, other products, the owner or order data. Same provider and free tier as the Copilot, so Google may use the payload to improve its products.
- **Checks before anything is shown:** every number (money is compared with the price in minor units), feature, platform, brand and quality claim in the draft must also appear in those fields, with the same polarity ("no Bluetooth" in the notes does not allow "Bluetooth"); stock, shipping, delivery and promotion talk, markup, links and prompt echoes are never allowed. The vocabulary lives in `packages/ai/src/descriptions/description-glossary.ts`. A failing draft is retried once with the problem codes and terms, then nothing is shown. What the checks do not catch (paraphrased features, adjectives outside the glossary, a true fact bound to the wrong part) is left to the owner's review.
- **No call when:** no AI key (`not_configured`), or too little input: a name plus a category or 20+ characters of notes is needed (`insufficient_input`). A demo product (notes starting with `[DEMO]`) gets a draft starting with `[DEMO] `.
- **Limits:** 5 drafts per owner per 10 minutes (429), and drafts share the store's **100 LLM attempts per day** with the Copilot (`copilot:llm:day`), so a busy drafting session can push Copilot answers onto rule-based insights for the rest of the day. At most 2 attempts within 30 s (15 s each, 1 500 output tokens, minimal model thinking). An AI failure is a 200 with `kind: "unavailable"` and a reason, never an HTTP error.
- **Logs and evals:** one `description.draft` log line with the outcome, reason, attempts, issue codes, model, prompt version, token usage, latency and character counts, never the fields, the prompt or the draft. The eval set (`packages/ai/src/evals/descriptions/`, run by `run-description-evals.test.ts`) covers grounded drafts per category, invented numbers, features, platforms, brands and promises, commerce talk, markup, invalid JSON, prompt injection in the notes and the name, provider failures, too little input and a demo product, against scripted models.
- **Manual check with a real key** (no automated test calls the provider): with the three `LLM_*` variables set, open a seeded product such as Vortex Wireless Mouse, click **Draft with AI**, check the draft uses only facts from the form and starts with `[DEMO] `, click **Replace description with this draft**, then **Undo** (the old text returns), replace again, click **Save changes** and check the storefront page. A product whose notes ask the AI to "write FREE SHIPPING" must show no draft or a clean one.

### Payments

**Demo payment only** (decision D03). After "Place order" the shopper sees `/checkout/pay/<reference>` with the banner "Demo store — this is a demo payment. No real money is charged and no card details are collected." and one button, "Confirm demo payment (no charge)". It goes through the `PaymentGateway` port to `DemoPaymentGateway` (`packages/app/src/server/payments/`), which contacts no provider, charges nothing and returns `DEMO-PAY-<order id>`. No card field exists anywhere and no card data is stored. Stripe (test mode) is a P1 option behind the same port; it is not integrated.

Purchase flow: cart → `/checkout` (guest: name, email, address in Poland; prices and stock re-checked on the server) → `/checkout/pay/<reference>` → `/orders/<reference>?paid=1`. `/orders/lookup` finds an order again by its reference.

### Store metrics (admin dashboard)

`/admin` shows the store's metrics for **"Last 7 days"** (default) or **"Last 30 days"** (`/admin?period=7d|30d`; any other value means 7 days): whole calendar days in the store time zone **Europe/Warsaw**, today included. Each card prints its definition next to the number. The definitions below are a product rule (R05, orders spec A8, confirmed by the product owner); they live once in `packages/core/src/domain/metrics/metric-definitions.ts`, the SQL in `packages/database/src/adapters/database-store-metrics.ts` implements them, and the Commerce Copilot tools call the same use cases (`GetSalesSummaryUseCase`, `GetOrderSummaryUseCase`, `GetTopProductsUseCase`, `GetLowStockProductsUseCase`). Change them only together.

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

**Custom range and comparison** (P1, `.ai/specs/implemented/2026-10-19-dashboard-date-range-comparison.md`). Besides the two presets, the owner can pick any range of whole days with the **From** / **To** fields (`/admin?from=2026-10-01&to=2026-10-14`, both days included, store time zone). The range must end no later than today, start on or after 1 Jan 2000 and cover at most 366 days. An invalid range shows the preset period and an alert saying what was wrong; it never shows an error page. Every period, preset or custom, is compared with the previous one. The dashboard prints this comparison definition (`PERIOD_COMPARISON_DEFINITION` in the same file):

> Each figure is compared with the previous period of the same number of days, which ends the day before this one starts. The change is this period minus the previous one; the percentage is the change divided by the previous value, rounded to a whole percent, and is not shown when the previous value is 0 or when the store has no order before the previous period starts. A period that ends today includes only part of today. Top products and low stock are not compared. A change between two periods does not show what caused it.

- Orders placed, paid orders, revenue and AOV each get a line such as "Up 2 (+17%) from 12". AOV says "Not enough data to compare" when either period has no paid orders.
- The comparison runs the same metric use cases a second time, for the previous period. The percentage follows the Copilot's rule for "What could explain the recent change in sales?" (whole percent).
- Notes appear when they apply: today is not over yet; no order exists before the previous period, so it may include days before the store started selling (the seeded history covers 35 days, so "Last 30 days" shows this note on a fresh demo database); and the previous period's seeded demo orders and orders in other currencies.
- The Copilot does not take a custom range yet. It still answers for the last 7 or 30 days.

### MVP scope

- **Storefront:** catalog, search/filter, cart, server-validated checkout, order confirmation.
- **Admin:** authentication, real database-backed metrics, product/category CRUD, inventory, orders and status workflow.
- **Commerce Copilot:** a performance summary plus up to 3 prioritised recommendations with evidence, grounded in tool results from application services; save, dismiss and complete actions; a safe fallback.
- **Out of scope:** multi-tenancy, marketplaces, real shipping and refunds, discounts, multi-currency checkout, a CMS page builder, autonomous AI actions, microservices.

### Known limitations

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
  - Adding to the cart **does not reserve stock**: the quantity is checked against the current stock for feedback only, and placing the order is the authoritative check.
  - Up to 20 different products and 99 of each; one currency per cart.
  - A product that is unpublished or sold out while in a cart disappears from it, and a quantity above the stock is lowered to it, each with a message on the cart page. The cookie itself is corrected by the next cart change (a page render cannot set cookies), so until then the message shows again and the header count may include the removed item.
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
- Commerce Copilot AI answers: the free tier's quotas and data terms are Google's; preview model ids can be retired, so `LLM_MODEL` may need updating. Grounding checks numbers, products and causal phrases, not spelled-out numbers or qualitative claims.
- `npm audit` reports advisories in development tooling dependencies (e.g. `braces` via linting and test tooling); they do not affect runtime code and are tracked for a later update.

### Roadmap

1. **Weeks 1–4 (done):** foundation, admin authentication, catalog and stock, storefront, cart, demo checkout, admin orders, dashboard metrics, demo store data, Commerce Copilot (tools, rule-based insights, Gemini adapter with grounding and fallback, recommendation actions, eval set).
2. **Week 5 (in progress):** hardening and polish for the demo: dev-server fixes, this README and demo guide, a mobile layout pass.
3. **P1, only after P0 is stable:** AI-drafted product descriptions, date-range comparison, a live eval script, Stripe test mode and webhooks, CSV import, image upload.

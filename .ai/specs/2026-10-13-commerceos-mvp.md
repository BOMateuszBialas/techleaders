# CommerceOS — Project Specification & Agent Guide

> **Project type:** AI Engineering capstone / portfolio MVP  
> **Timeline:** 5 weeks  
> **Primary goal:** Build a working, extensible e-commerce application with an AI-powered merchant advisor.  
> **Working product name:** CommerceOS  
> **AI feature name:** Commerce Copilot  
> **Status:** MVP specification  
>
> This document is the source of truth for project scope, architecture, engineering conventions, and agent-assisted development. If an implementation decision conflicts with this document, follow this document unless the user explicitly approves a change.

---

## 1. Product vision

CommerceOS is a lightweight e-commerce platform for a single store. It provides the essential storefront and merchant administration workflows, with Commerce Copilot as an AI advisor that helps a store owner understand store performance and identify practical opportunities to improve it.

CommerceOS is **not intended to be a Shopify replacement** in five weeks. The goal is a polished, working, demonstrable MVP with a clear architecture and one meaningful AI workflow that can be expanded later.

### Product principles

1. **Working end-to-end flows beat feature count.**
2. **Real, traceable data beats impressive but unsupported AI claims.**
3. **AI advises; the merchant decides.** The MVP must not let the model autonomously change prices, publish products, issue refunds, or modify orders.
4. **Simple now, extensible later.** Avoid premature microservices, generic plugin systems, and unnecessary abstractions.
5. **Engineering quality is part of the product.** Include validation, tests, error handling, observability, security, and setup documentation.
6. **Explicit limitations are preferable to fake functionality.** Do not present mocked payment or shipping integrations as live integrations.

## 2. Target user and core value

### Primary user

A store owner or small e-commerce merchant who wants to manage products and orders and understand what actions might improve store performance.

### Core value proposition

“Manage a small online store and get evidence-based, actionable advice from an AI copilot using the store's own data.”

### Primary demo story

1. A customer visits the storefront, browses products, adds an in-stock item to the cart, and completes a test checkout.
2. An order is created and its status is visible in the admin dashboard.
3. The merchant opens Commerce Copilot and asks: “What should I focus on to improve sales this week?”
4. The system retrieves relevant store metrics, asks the LLM to interpret those metrics, and returns a small number of prioritized recommendations.
5. Each recommendation includes the observed evidence, reasoning, a practical next step, and a confidence/limitations note where relevant.
6. The merchant can mark a recommendation as saved, dismissed, or completed. These actions are recorded.

The demo must work using seeded data, without depending on a large volume of real customer traffic.

## 3. Five-week scope

### P0 — Required for the MVP

#### Storefront
- Responsive home/catalog experience.
- Product listing and product detail pages.
- Product variants only if they can be implemented without delaying the core flow; otherwise use a simple product model with optional SKU.
- Basic category filtering and product search (simple database-backed search is sufficient).
- Cart with quantity changes and removal.
- Server-side price and stock validation during checkout.
- Customer checkout with name, email, and shipping address.
- Test-mode payment integration, preferably Stripe Checkout, **only if credentials and setup time are available**. Otherwise provide an explicitly labelled demo payment flow. Never collect or store raw card details.
- Order confirmation page and order history/lookup for the current demo account or by a secure order reference.
- Clear loading, empty, validation, and error states.

#### Admin / CMS
- Admin authentication and protected admin routes.
- Dashboard with a small set of actual metrics: orders, revenue from paid orders, average order value, top-selling products, and low-stock products.
- CRUD for products and categories.
- Product fields: name, slug, description, price in minor currency units, currency, SKU (optional), stock quantity, status/draft or published, image URL, category.
- Order list and order detail page.
- Minimal order status workflow: pending payment, paid, processing, shipped, cancelled, refunded (only where supported by the implementation).
- Manual stock adjustment or inventory update.
- Seed data suitable for the complete demo.

#### Commerce Copilot
- A dedicated admin page with a simple chat-like interface.
- One primary workflow: summarize current store performance and suggest 3 prioritized actions to improve it.
- Support a small set of merchant questions, for example:
  - “What should I focus on this week?”
  - “Which products are selling best?”
  - “Which products are low on stock?”
  - “What could explain the recent change in sales?”
  - “Where does my traffic come from?”, “Where in the funnel do visitors drop off?”, “Which products get views but few sales?” (from the demo traffic data below)
- The full list of answered and declined questions is in decision D09 (`.ai/specs/research/decisions/D09-copilot-demo-questions.md`). For a declined question Copilot says it cannot answer and names the missing data.
- **Demo traffic and conversion data (D08):** seeded, fictional daily sessions by source, store funnel counts (sessions → product views → add-to-cart → checkout started) and per-product views and add-to-cart counts, read through one approved tool (§6). It is always labelled as fictional demo data, and storefront visits do not write to it (no event tracking).
- Use actual metrics queried from PostgreSQL through application services. Do not ask the LLM to invent or calculate authoritative financial figures from raw, unbounded database access.
- Use structured output validated by a schema.
- Each recommendation should include:
  - title;
  - priority;
  - observation/evidence from available data;
  - explanation;
  - concrete next step;
  - relevant product or metric references where applicable;
  - limitations or confidence note when the data is insufficient.
- Store conversation history only if time permits; otherwise keep the current session in memory/UI and persist recommendation records.
- Allow a merchant to save, dismiss, and mark recommendations as completed.
- Include a graceful fallback when the LLM provider is unavailable, with a clear error message or deterministic rule-based insights. Never silently fabricate an AI response.
- Keep an audit record of the recommendation and merchant action where practical.

### P1 — Only after P0 is stable

- Product description drafting in the admin, with merchant review before saving.
- Basic sales trend comparison across two date ranges.
- Recommendation evaluation dataset and a small repeatable evaluation script.
- Stripe webhook integration and stronger payment-state reconciliation if not already completed.
- CSV product import.
- Basic product/category image upload using a managed storage provider.

### Explicitly out of scope for the five-week MVP

- Multi-tenant SaaS, store creation flows, or complex tenant isolation.
- Multi-vendor marketplace.
- Real shipping carrier integrations, label generation, live delivery quotes, or tracking.
- Real refund execution and complex returns management.
- Subscriptions, discount engine, loyalty, gift cards, tax automation, or multi-currency checkout.
- Advanced inventory across multiple warehouses.
- Full CMS page builder, drag-and-drop layouts, or theme marketplace.
- Autonomous AI actions that alter live store data.
- Open-ended agent loops, multi-agent orchestration, fine-tuning, or complex RAG unless a concrete need emerges.
- A custom analytics warehouse or event-streaming platform.
- Microservices or Kubernetes.
- Production readiness claims without the corresponding security, operational, and compliance work.

If time becomes tight, remove P1 features and simplify optional variants or payment integration before compromising the core order flow, AI evidence quality, security, or tests.

## 4. Recommended technology stack

Use the following stack unless a concrete blocker is found:

- **Language:** TypeScript with strict mode.
- **Application:** Next.js using the App Router and React.
- **Database:** PostgreSQL.
- **ORM:** MikroORM, including schema migrations.
- **Dependency injection:** Awilix.
- **Styling:** Tailwind CSS.
- **Admin UI:** shadcn/ui.
- **Validation:** Zod for request payloads and AI output schemas.
- **Authentication:** use a maintained authentication solution compatible with the selected Next.js version; do not implement password hashing or session security from scratch.
- **LLM:** provider-neutral adapter around one chosen model provider; select a provider with structured output/tool-calling support and use environment variables for credentials.
- **Payments:** Stripe Checkout in test mode if feasible.
- **Testing:** Vitest or the project's established test runner; integration tests against PostgreSQL; Playwright for the most important end-to-end flow if time permits.
- **Package manager:** use the package manager already present in the repository; otherwise choose one and commit its lockfile.
- **Deployment:** deploy the Next.js app and managed PostgreSQL if deployment is within the course requirements and time budget.

Do not introduce additional libraries without a reason. Verify API and package compatibility against the installed versions rather than assuming examples from a different version still apply.

## 5. Architecture

Use a modular monolith. The app may be deployed as one Next.js application, but domain logic must not be coupled to React components or route handlers.

### Suggested module structure

Adapt to the repository's existing conventions; do not reorganize working code merely to match this example.

```text
src/
  app/
    (storefront)/
    admin/
    api/
  modules/
    catalog/
      domain/
      application/
      infrastructure/
    cart/
    orders/
    payments/
    inventory/
    analytics/
    copilot/
      domain/
      application/
      infrastructure/
  shared/
    database/
    di/
    auth/
    validation/
    errors/
    observability/
  components/
  lib/
migrations/
tests/
```

Each module may contain only the layers that add real value. Avoid empty folders and unnecessary interfaces.

### Layer responsibilities

- **Domain:** business rules and domain types; no Next.js, HTTP, or ORM dependencies.
- **Application:** use cases, orchestration, authorization checks, and transaction boundaries.
- **Infrastructure:** MikroORM repositories, payment provider adapter, LLM adapter, and external integrations.
- **Presentation:** Next.js pages, server actions/route handlers, and UI components.

### Dependency injection with Awilix

- Register infrastructure adapters, repositories, services, and use cases in one documented composition root.
- Application services should depend on interfaces/contracts where this enables testing or replacing infrastructure.
- Do not instantiate repositories or LLM clients ad hoc throughout the app.
- Ensure request-specific state is not stored in shared singletons.
- Choose Awilix lifetimes deliberately. Avoid singleton services that capture a request-scoped EntityManager or user context.
- Resolve dependencies at request boundaries and use the correct MikroORM request context for each request/job.

### Database and MikroORM

- Use migrations as the source of truth for schema changes. Do not rely on automatic schema updates in deployed environments.
- Use PostgreSQL transactions for order creation and inventory-affecting operations.
- Use integer minor currency units (e.g. grosze/cents) for monetary values, not floating-point arithmetic.
- Store timestamps consistently and display them in the user's/store's configured timezone.
- Add appropriate unique constraints and indexes for slugs, SKUs when present, order references, and frequently queried foreign keys.
- Never trust client-submitted prices, discounts, order totals, payment status, or stock availability.
- Define a clear inventory policy for checkout. At minimum, validate and decrement stock atomically to prevent overselling; if stock reservation is not implemented, document the limitation.
- Seed scripts must be repeatable or clearly designed for local development.
- Do not expose ORM entities directly as public API response shapes when it would leak internal fields or create serialization problems.

### API and request handling

- Validate all untrusted input at the boundary with Zod or an equivalent schema.
- Use consistent response/error patterns and appropriate HTTP status codes.
- Protect admin endpoints server-side; hiding admin links in the UI is not authorization.
- Apply rate limiting to login and AI endpoints if the deployment environment supports it.
- Do not expose stack traces, secrets, raw provider errors, or internal database details to users.
- Keep route handlers thin; delegate business logic to application use cases.

## 6. Commerce Copilot design

### Core flow

```text
Merchant question
      |
      v
Authenticate and authorize admin
      |
      v
Validate input and apply limits
      |
      v
Intent selection / constrained tool calling
      |
      v
Application services query approved store metrics
      |
      v
Build compact, factual context with date range and currency
      |
      v
LLM returns schema-constrained recommendations
      |
      v
Validate output and verify references/claims
      |
      v
Persist recommendation records (where applicable)
      |
      v
Display evidence, suggested actions, and limitations
```

### Initial tools / capabilities

Implement only the tools required for the primary workflow:

- `getSalesSummary(dateRange)`
- `getTopProducts(dateRange, limit)`
- `getLowStockProducts(threshold, limit)`
- `getOrderSummary(dateRange)`
- `getTrafficSummary(dateRange, productLimit)`: reads the fictional demo traffic data (D08). Returns sessions in total and by source, the funnel counts, store conversion rate, and up to `productLimit` products ranked by views with their add-to-cart and purchase counts. Every result carries the source label "fictional demo traffic data".
- `getProductPerformance(productId, dateRange)` (optional if time allows)

Tools must call application services, not expose arbitrary SQL or unrestricted ORM access to the model. Validate tool arguments, constrain result sizes, and enforce authorization. Prefer deterministic intent routing or a bounded tool-calling loop over an open-ended autonomous agent.

### Analytics definitions

Document metric definitions in code and UI. Example definitions:

- **Gross sales/revenue:** explicitly define whether cancelled/refunded orders are excluded and whether tax/shipping are included. Use a consistent definition everywhere.
- **Paid orders:** orders whose verified payment state is paid.
- **Average order value (AOV):** revenue under the documented revenue definition divided by the number of included orders; show “not enough data” when the denominator is zero.
- **Top products:** rank using paid order line items over a stated date range.
- **Low stock:** published products whose stock quantity is at or below a configurable threshold.
- **Sessions (demo):** fictional seeded visits per day and traffic source; not measured from real visitors.
- **Store conversion rate (demo):** paid orders divided by demo sessions over the same date range; show “not enough data” when sessions are zero. It is not computed per source, because orders carry no traffic source.
- **Funnel (demo):** demo sessions → product views → add-to-cart → checkout started, then paid orders from the orders table.
- **Product view-to-purchase rate (demo):** units of the product in paid orders divided by its demo views over the date range.

Do not label order totals as revenue without defining which order/payment states are included. Do not infer causal explanations from simple correlations.

### Recommendation output contract

Use a schema similar to the following (adapt names and enums to the implementation):

```ts
type CopilotRecommendation = {
  title: string;
  priority: "high" | "medium" | "low";
  observation: string;
  evidence: Array<{
    metric: string;
    value: string;
    period?: string;
    source: string;
  }>;
  reasoning: string;
  suggestedAction: string;
  relatedProductIds?: string[];
  limitations?: string[];
};
```

Validate model output at runtime. Reject or repair invalid output with a bounded retry, then fall back safely. Verify that referenced product IDs exist in the supplied context and that displayed metric values are grounded in tool results. The model must not invent values, product identifiers, orders, or facts.

### AI safety and data handling

- Treat user prompts, product descriptions, reviews, and imported documents as untrusted data.
- Do not allow prompt text to override system rules, permissions, or tool restrictions.
- Do not provide the model with credentials, session tokens, payment details, or unnecessary personal data.
- Send only the minimum data needed for the requested analysis.
- Keep the AI provider behind an adapter so it can be mocked in tests and replaced later.
- Set timeouts, token/output limits, and bounded retries. Handle provider errors, rate limits, and malformed output.
- Log request IDs, latency, selected tools, validation failures, and provider/model metadata where safe. Avoid logging full prompts or customer personal data by default.
- The model may recommend an action but must not execute destructive or financially consequential actions.
- Make clear in the UI that recommendations are advisory and may be incomplete.
- Do not claim recommendations increase sales unless the effect has been measured.

### AI evaluation

Create a small, version-controlled evaluation set of realistic questions and seeded store scenarios. At minimum evaluate:

1. Correct use of available metrics and date ranges.
2. No fabricated values or nonexistent product references.
3. Appropriate response when there is insufficient data.
4. Appropriate low-stock and top-product recommendations.
5. Resilience to prompt injection embedded in product content.
6. Graceful behavior when the provider fails or returns invalid output.
7. Declining questions that need data the demo does not hold (D09), naming the missing data.
8. Labelling traffic and conversion figures as fictional demo data.

Keep evaluation repeatable. If model outputs are nondeterministic, evaluate required properties and factual grounding rather than exact wording. Record known limitations in the README.

## 7. Data model — initial proposal

Finalize the schema based on the chosen authentication and payment implementation. Keep the first version small.

### Core entities

- **AdminUser / User:** ID, email, password/auth-provider fields as required, role, createdAt.
- **Category:** ID, name, slug, optional description.
- **Product:** ID, categoryId, name, slug, description, priceMinor, currency, SKU (optional), stockQuantity, imageUrl (optional), status, createdAt, updatedAt.
- **Order:** ID, publicReference, customer name/email, shipping address fields, status, payment status/provider reference, subtotalMinor, shippingMinor, totalMinor, currency, createdAt, updatedAt.
- **OrderItem:** ID, orderId, productId (nullable if historical item retention requires it), product name/SKU snapshot, unitPriceMinor, quantity, lineTotalMinor.
- **CopilotRecommendation:** ID, createdAt, title, priority, observation, reasoning, suggestedAction, evidence JSON, limitations JSON, status (`new`, `saved`, `dismissed`, `completed`), related product references where appropriate.
- **TrafficDailyStat (demo, D08):** date, source (`direct`, `organic`, `social`, `email`, `paid`), sessions, productViews, addToCarts, checkoutsStarted; unique (date, source). Seeded only.
- **ProductViewDailyStat (demo, D08):** date, productId (FK, on delete cascade), views, addToCarts; unique (date, productId). Seeded only. A product with no rows has "no demo view data", not zero views.
- **Demo traffic seed invariants (D08):** the traffic rows and the seeded orders cover the same rolling window ending on the seed date. Per day: sessions ≥ product views ≥ add-to-cart ≥ checkouts started ≥ seeded paid orders. Per product and day: views ≥ add-to-cart and views ≥ seeded units sold. A seed test enforces them.
- **CopilotInteraction / AuditEvent:** optional, if needed for a minimal audit trail. Store only safe, necessary data.

Store snapshots of product name and price on order items so later catalog changes do not rewrite order history. Use database constraints for valid status values where practical. Avoid storing customer data in AI conversation history unless it is genuinely necessary.

## 8. Security and reliability baseline

- Keep secrets in environment variables; commit only `.env.example` with placeholder values.
- Add `.env` files and credentials to `.gitignore`.
- Enforce authorization on the server for all admin and Copilot actions.
- Use a maintained authentication library and secure cookie/session defaults.
- Validate and normalize user input.
- Use safe output rendering; never render model output as trusted HTML.
- Verify payment webhook signatures and make webhook handling idempotent if webhooks are implemented.
- Do not store card data.
- Use database transactions for order creation and stock changes.
- Ensure duplicate checkout submissions or webhook retries do not create duplicate orders or stock decrements.
- Add useful logs with request/correlation IDs and redact secrets and personal data.
- Provide a clear user-facing error state without exposing internal exceptions.
- Include basic abuse controls for AI calls, including input length and output limits.

## 9. UI and experience requirements

- Responsive layouts for desktop and mobile.
- Use Tailwind CSS for layout and styling and shadcn/ui for suitable admin controls.
- Prioritize a clean, professional merchant dashboard over decorative complexity.
- Consistent loading, empty, success, validation, and error states.
- Accessible labels, keyboard navigation, focus states, and adequate contrast.
- Currency and dates must be formatted consistently.
- Copilot responses must distinguish observations from recommendations and show the evidence/date range behind each recommendation.
- Never use fake charts or hard-coded dashboard numbers outside clearly labelled seed/demo content.
- Include seeded content so the first run looks populated and the main demo can be completed quickly.

## 10. Testing and definition of done

A feature is not complete merely because the UI renders.

### Minimum automated coverage

- Unit tests for business rules and metric calculations.
- Unit tests for Copilot output validation and reference verification.
- Integration tests for product persistence, order creation, and inventory updates against PostgreSQL.
- Authorization tests for protected admin/Copilot operations.
- Tests for invalid checkout input, insufficient stock, and duplicate submissions where applicable.
- Tests for malformed AI output and provider failure.
- One end-to-end happy path if time permits: browse product → checkout → order appears in admin → Copilot returns grounded advice.

### Definition of done for a feature

- TypeScript checks pass.
- Linting passes.
- Relevant tests pass.
- Input validation and error states exist.
- Authorization and data-access boundaries are enforced.
- No secrets or unnecessary personal data are logged.
- Documentation is updated if setup, behavior, or API contracts change.
- Manual verification steps are documented for any flow not covered by automated tests.

## 11. Five-week delivery plan

### Week 1 — Foundation and architecture
- Confirm requirements and freeze P0 scope.
- Create Next.js/TypeScript app and install the agreed stack.
- Configure PostgreSQL, MikroORM, migrations, seed data, and Awilix composition root.
- Set up linting, formatting, environment validation, and tests.
- Implement authentication and the basic product/category data model.
- Deliverable: app starts locally, migrations and seeds run, protected admin shell works.

### Week 2 — Storefront and catalog
- Product/category admin CRUD.
- Storefront listing and product details.
- Search/filter and cart.
- Validate prices and stock on the server.
- Deliverable: seeded products can be browsed and managed end-to-end.

### Week 3 — Orders and dashboard
- Checkout and order creation with transactional inventory updates.
- Payment test mode if feasible; otherwise an explicit demo-payment adapter/flow.
- Order list/detail and status display.
- Dashboard metrics derived from database queries.
- Deliverable: complete demonstrable purchase flow and accurate basic metrics.

### Week 4 — Commerce Copilot
- Define analytics service contracts and metric semantics.
- Implement the LLM provider adapter and structured output schema.
- Implement bounded tools, evidence grounding, and fallback behavior.
- Seed the fictional demo traffic data and implement `getTrafficSummary` (D08). If time runs short, drop the per-product views first, then the funnel, keeping sessions by source.
- Build the Copilot UI and recommendation status actions.
- Add the initial AI evaluation set.
- Deliverable: merchant asks a question and receives traceable, data-grounded advice.

### Week 5 — Quality, demo, and presentation
- Fix critical defects and polish loading/empty/error states.
- Add integration and end-to-end coverage for the core journey.
- Test authorization, payment handling, stock consistency, and AI failure cases.
- Deploy if feasible and verify the deployed configuration.
- Complete README, architecture diagram, limitations, demo script, and screenshots.
- Deliverable: stable portfolio-quality MVP with a reproducible demo.

### Scope adjustment rule

At the end of each week, reassess remaining time. If behind schedule, drop P1 items, then simplify optional product variants, advanced charts, and payment integration. Do not remove server-side validation, authorization, core order consistency, AI grounding, or setup instructions.

## 12. Repository and agent working rules

Agents must follow these rules while modifying the repository:

1. **Inspect before editing.** Read the current project structure, package scripts, versions, and existing conventions first.
2. **Plan bounded changes.** Before a multi-file feature, identify the files/modules involved and state the intended approach.
3. **Keep changes focused.** Do not rewrite unrelated code, replace the stack, or perform broad refactors without approval.
4. **Respect this specification.** If a requested feature expands scope or conflicts with a decision here, explain the trade-off and ask before proceeding when the decision materially affects scope or architecture.
5. **Do not invent integrations.** If credentials or external services are unavailable, implement an adapter/mock explicitly labelled for development and document the limitation.
6. **Never fake business data.** Seed/demo data must be clearly identifiable. Production-facing metrics must come from the database.
7. **Never bypass types or validation for convenience.** Avoid `any`, unsafe casts, disabled lint rules, and swallowed errors unless there is a documented, justified reason.
8. **Keep secrets out of source control and logs.**
9. **Use migrations for schema changes.** Update seed data and relevant tests alongside schema changes.
10. **Add tests with behavior changes.** Prefer testing domain/application behavior over implementation details.
11. **Run relevant checks.** Run available lint, typecheck, tests, and build commands before declaring a task complete. If a command cannot run, state why.
12. **Summarize completion.** Report what changed, key decisions, commands/tests run, any known gaps, and the next recommended task.
13. **Avoid unnecessary dependencies.** Explain why a new package is needed before adding it.
14. **Do not over-engineer.** Prefer a simple implementation that satisfies the MVP and has a clear extension point.
15. **Do not claim production readiness** without a review of security, privacy, operational, and payment requirements.

## 13. Local development and environment

Create and maintain `.env.example` with the actual variable names required by the app, for example:

```dotenv
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/commerceos
AUTH_SECRET=replace-me
APP_URL=http://localhost:3000
LLM_PROVIDER=replace-with-selected-provider
LLM_API_KEY=
LLM_MODEL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

Only include variables actually used by the implementation. Validate required variables at startup and fail with a helpful message. Never commit real credentials.

The README should document:
- prerequisites;
- package installation;
- environment setup;
- database startup;
- migration and seed commands;
- development server;
- tests, lint, typecheck, and build;
- demo admin setup without committing a real password;
- how to use payment test mode;
- how to run Copilot with a real provider and how to test its fallback;
- deployment notes and known limitations.

## 14. Final acceptance criteria

The MVP is ready to present when all of the following are true:

- [ ] A new developer can follow the README and run the app locally.
- [ ] Database migrations and seed data run successfully.
- [ ] Admin routes and mutation endpoints require authorization.
- [ ] An admin can create, edit, publish, and unpublish a product.
- [ ] A customer can browse products, add an in-stock product to the cart, and complete the configured checkout/demo-payment flow.
- [ ] The order appears in the admin panel with consistent totals and status.
- [ ] Inventory cannot be oversold through the normal checkout flow.
- [ ] Dashboard metrics are calculated from database data using documented definitions.
- [ ] Copilot can answer the primary merchant question using approved tools over database data: the store's own records (orders, catalog, stock) and the seeded fictional traffic data, which is labelled as demo data wherever it appears.
- [ ] Copilot declines questions that need data the demo does not hold and names the missing data (D09).
- [ ] Copilot recommendations include evidence and actionable next steps.
- [ ] Invalid or unsupported AI claims are rejected or handled safely; provider failures do not crash the app.
- [ ] Recommendation save/dismiss/complete actions work.
- [ ] Core business rules and critical flows have automated tests.
- [ ] Lint, typecheck, tests, and production build pass, or remaining failures are clearly documented.
- [ ] A short demo script and architecture overview are available.

## 15. Guiding decision

When choosing between another feature and improving reliability, choose reliability. When choosing between a complex agent and a bounded, testable workflow, choose the bounded workflow. When choosing between a polished happy path and honest handling of failure, implement both—but prioritize correctness and transparency.

**The goal is not to build the biggest e-commerce platform in five weeks. The goal is to demonstrate that you can engineer a coherent full-stack product and integrate AI in a useful, controlled, testable way.**

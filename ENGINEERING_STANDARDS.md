# CommerceOS — Engineering Standards

**Status:** Active  
**Product:** CommerceOS + Commerce Copilot  
**Planning horizon:** Five-week MVP  
**Purpose:** Define practical, enforceable engineering conventions for the codebase and coding agents.

These standards adapt the course's engineering-standard document to CommerceOS. Product-specific examples, entities, routes, and workflows refer to the e-commerce MVP. The root `AGENTS.md` remains the source of truth for product scope and delivery priorities; this document defines day-to-day implementation standards.

When principles conflict, prefer the smallest explicit solution that protects correctness, security, and the five-week delivery goal. Do not add abstractions merely because they might be useful someday.

> **How this repository applies the standards** (layout, naming exceptions, what is enforced by lint) is recorded in [Repository decisions](#repository-decisions) at the end of this document.

---

## 1. Naming conventions

| Element | Convention | Example |
|---|---|---|
| Package | `packages/<name>`, scoped package name `@commerceos/<name>` | `@commerceos/core` |
| Domain concept folder | lowercase plural where natural; consistent across layers | `products`, `orders`, `inventory` |
| Entity | PascalCase singular; file `<name>.entity.ts` | `Product` → `product.entity.ts` |
| DB table | snake_case, plural | `order_items` |
| DB column | snake_case in database, camelCase in TypeScript | `created_at` ↔ `createdAt` |
| Application service / use case | PascalCase class with `Service` or `UseCase` suffix; file `<name>.service.ts` / `<name>.use-case.ts` | `OrderService` |
| External integration contract | PascalCase + `Port` or `Gateway` suffix | `PaymentGateway` |
| Adapter | descriptive implementation name; located under `adapters/` | `StripePaymentGateway` |
| Awilix registration key | camelCase, explicit and typed | `orderService` |
| Zod schema | camelCase variable + `Schema`; file `<name>.schema.ts` | `productCreateSchema` |
| Domain event | `concept.entity.action`, past tense | `orders.order.created` |
| API route | Next.js App Router `route.ts` under a resource path | `app/api/products/route.ts` |
| Page | `<segment>/page.tsx`, default export `<Segment>Page` | `admin/products/page.tsx` |
| UI component | PascalCase; filename matches component | `ProductTable.tsx` |
| Domain error | PascalCase + `Error`, extends `AppError` | `NotFoundError` |
| Environment variable | uppercase snake_case | `DATABASE_URL` |

Use the same concept names across database entities, core services, validation schemas, and API routes. Do not force every name into plural form if the established domain term is naturally singular (for example, `auth`).

## 2. Monorepo architecture and dependency direction

Use the agreed monorepo as a **modular monolith**, not a microservices system.

Expected packages:

- `packages/app` — Next.js application, App Router pages, API route handlers, storefront, admin dashboard, and UI components.
- `packages/core` — domain rules, application services/use cases, shared Zod schemas, typed application errors, ports, and domain/application events where needed.
- `packages/database` — MikroORM configuration, entities, migrations, repositories, seed scripts, and database-specific code.
- `packages/ai` — Commerce Copilot provider adapter, prompt/context assembly, bounded tool definitions, structured-output validation, and AI evaluation utilities.
- `packages/config` — shared configuration only when multiple packages genuinely need it.

The exact package layout may follow existing repository conventions, but do not create extra packages without a clear use case.

### Allowed dependency direction

- `app → core`
- `app → ai`
- `app → database` only for composition/bootstrap wiring where required; ordinary route/page code must not issue ORM queries directly.
- `core → database` is **not allowed**. Core uses repository contracts/ports where persistence needs to be abstracted.
- `core` must not import `next` or `react`.
- `ai` may depend on core contracts/types but must not bypass application services to access arbitrary database records.
- `database` must not depend on `app`.
- `config` must remain dependency-light and must not import application features.

If the implementation uses a slightly different dependency direction for practical reasons, document it in the README and enforce one consistent direction with TypeScript project references, package exports, or ESLint restrictions where feasible.

### Concept folders

Create a concept folder only when its first real file is needed; do not pre-create empty directories. Examples:

- `packages/database/src/entities/products/product.entity.ts`
- `packages/core/src/services/products/product.service.ts`
- `packages/core/src/validators/products/product-create.schema.ts`
- `packages/app/src/app/api/products/route.ts`

Do not create a generic module runtime, auto-discovery mechanism, or per-concept setup/ACL file for this MVP.

## 3. Separation of responsibilities

- **Domain:** business concepts and rules, without HTTP, React, Next.js, or ORM dependencies.
- **Application:** use cases, coordination of services, authorization decisions, and transaction boundaries.
- **Infrastructure:** MikroORM repositories, payment provider, LLM provider, and external services.
- **Presentation:** Next.js pages, route handlers, forms, tables, and UI state.
- **Commerce Copilot:** gathers only the approved context needed for a request, calls constrained tools, validates output, and returns grounded recommendations. It does not own or duplicate order/product business rules.

A product page must not execute a raw MikroORM query. An order service must not construct a `NextResponse`. An AI prompt must not be used as a substitute for deterministic business validation.

## 4. Reusable API, validation, and UI patterns

The purpose of shared patterns is to avoid each feature inventing a different way to validate inputs, handle errors, fetch data, or render empty states. Add a shared abstraction only after a real repeated pattern exists; do not build a generic framework ahead of the MVP.

### Server-side HTTP

Create or reuse a small shared HTTP layer in `packages/core` or `packages/app` according to the chosen dependency direction:

- **Typed application errors:** `AppError` base and a small set of errors such as `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`, and `ConflictError`.
- **Route wrapper:** a shared `apiHandler` can translate known application errors into consistent HTTP status codes and JSON responses, log unexpected errors safely, and prevent stack traces from reaching clients.
- **CRUD helper:** add a `makeCrudRoute`-style helper only if multiple routes genuinely share the same simple CRUD shape. Workflow endpoints such as checkout, payment confirmation, order cancellation, and stock adjustment should remain explicit use cases rather than being forced into generic CRUD.
- **Authentication/authorization helpers:** centralize session requirements and resource-access checks where a real auth system is implemented.

Use one consistent response envelope if the application needs one, for example:

```ts
type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };
```

Do not create duplicate shared packages just to share this type between two consumers. If the type is duplicated across a boundary, keep the shape consistent and document the reason.

### Client-side API calls

- Centralize client calls to `/api/*` in one typed helper if client components need to call the API.
- Parse responses defensively; do not assume every response body is valid JSON.
- Components should not each invent their own error parsing conventions.
- Server Components may call application use cases directly when appropriate; do not force a client-side HTTP round trip for server-rendered data.
- Never expose server-only secrets or provider SDKs to client bundles.

### Forms and lists

- Use the same Zod input schema for client feedback and server validation where technically appropriate.
- Use shadcn/ui primitives for standard admin controls; add primitives through the shadcn CLI rather than hand-writing replacements.
- Extract a reusable form, table, or feedback component only after the pattern appears more than once or is clearly needed by multiple screens.
- All forms need loading, disabled, validation, success, and failure behavior appropriate to their workflow.
- All lists need loading, empty, error, and (where needed) pagination states.
- A custom UI is acceptable when the interaction is genuinely specialized, such as checkout or an AI recommendation panel.

### Component placement

1. Raw shadcn primitive → `packages/app/src/components/ui/`.
2. Generic component reused across admin screens → `packages/app/src/components/admin/` or another established shared UI folder.
3. Component tied to a domain concept → `packages/app/src/components/<concept>/`.
4. Component used by one page only → colocate with that page until a second consumer appears.

Do not create a standalone `ui` package unless the repo establishes a concrete reuse requirement beyond the Next.js application.

## 5. PostgreSQL and MikroORM

- `packages/database` is the only package that should import `@mikro-orm/*` directly, apart from necessary bootstrap wiring explicitly documented in the repository.
- Use migrations as the source of truth for schema changes. Do not rely on automatic schema updates in deployed environments.
- Use repositories or focused persistence functions; do not scatter ORM queries across pages, React components, and unrelated services.
- Use PostgreSQL transactions for order creation and inventory-affecting operations.
- Protect check-then-write operations against race conditions; use transactions, appropriate locking, conditional updates, and/or unique constraints as required.
- Do not trust client-submitted prices, totals, stock availability, order status, or payment state.
- Store money as integer minor currency units (grosze/cents), not JavaScript floating-point amounts.
- Snapshot product name, SKU, and unit price on order items so later product edits do not rewrite order history.
- Add indexes and uniqueness constraints for slugs, public order references, provider event IDs, and commonly queried foreign keys where appropriate.
- Use UUIDs for externally addressable records unless a documented reason favors another strategy.
- Keep EntityManager/request context scoped correctly. Never capture a request-scoped EntityManager or user context in a singleton service.
- Seed data should be repeatable or clearly intended for local development.
- The app should be able to build without a live database connection; database-dependent code must not run at build time unless explicitly required and documented.

## 6. Awilix dependency injection

- Use one documented composition root and register dependencies explicitly.
- Do not use filesystem globbing or implicit service auto-discovery.
- Add each service/adapter registration deliberately and keep registration keys typed and searchable.
- Choose Awilix lifetimes intentionally. Do not store request-specific state in a singleton.
- Resolve request-specific dependencies at the request boundary, using the correct MikroORM request context.
- Depend on ports/interfaces for external integrations when that allows the implementation to be mocked or replaced without changing business logic.
- Do not create an interface for every class by default. Add an abstraction when it separates a meaningful boundary, enables testing, or supports a realistic alternative implementation.

## 7. Commerce Copilot and AI-specific standards

### Data access and tools

- AI tools must call approved application services, not unrestricted ORM access or arbitrary SQL.
- Validate tool arguments with Zod and impose limits on date ranges, result counts, and input size.
- Enforce authentication and authorization before calling any tool.
- Fetch authoritative metrics from the database through deterministic code. The LLM may explain or prioritize results; it must not be the source of truth for prices, revenue, order states, or inventory.
- Use explicit metric definitions consistently in the UI, services, prompts, and tests.
- Prefer a bounded tool-calling flow or deterministic intent routing over an open-ended autonomous agent loop.

### Grounding and output

- Use structured output and validate it at runtime.
- Verify product references and factual claims against the context supplied to the model.
- Recommendations should separate observed evidence from reasoning and suggested action.
- When data is insufficient, return a clear limitation or ask a clarifying question; do not fabricate a confident answer.
- Never claim that a recommendation will increase sales unless the effect has been measured.
- The Copilot is advisory in the MVP. It must not autonomously publish products, alter prices, modify orders, or issue refunds.
- A future feature that performs a consequential action must have server-side authorization, explicit confirmation, auditability, and idempotent execution.

### Security and reliability

- Treat prompts, product descriptions, imported files, and customer-provided content as untrusted input.
- Prompt instructions cannot override authorization or tool restrictions.
- Do not send secrets, payment details, session tokens, or unnecessary customer data to the LLM provider.
- Keep the provider behind an adapter so tests can use a fake implementation and providers can be changed later.
- Set request timeouts, token/output limits, and bounded retries.
- Handle provider failures, rate limits, timeouts, and malformed output gracefully.
- Avoid logging full prompts or personal data by default. Log safe metadata such as request ID, selected tools, latency, provider/model, and validation failures.
- Provide a deterministic fallback only when it can produce honest, clearly labelled insights from real data; never silently present fabricated output as model-generated advice.

### AI evaluation

Maintain a small repeatable evaluation set covering:

- correct use of metrics and date ranges;
- no fabricated metric values or product IDs;
- appropriate response when data is missing;
- useful low-stock/top-product recommendations;
- prompt injection embedded in untrusted product content;
- malformed model output and provider failure.

Prefer checking factual grounding and required properties over exact generated wording. Document known limitations.

## 8. Security and validation — minimum requirements

- Validate environment variables at startup using a schema; fail with a helpful message if a required value is missing.
- Keep secrets in environment variables. Commit `.env.example` with placeholders only and ensure real `.env` files are ignored by Git.
- Use a maintained authentication solution where practical. Do not invent password, session, cookie, or token security from scratch without an explicit reason.
- If credentials/passwords are stored, use a maintained password-hashing algorithm and parameters consistent with current security guidance; never store plaintext passwords.
- If cookie-based authentication is used, preserve `httpOnly`, `secure` in production, and an appropriate `sameSite` policy. Add CSRF protection to state-changing requests as required by the chosen auth design.
- Protect every non-public server route and mutation. Hiding a button in the UI is not authorization.
- Check record ownership or appropriate role permissions on each protected operation; being authenticated alone is insufficient.
- Fail closed: if a security/ownership check errors or has an ambiguous result, deny the operation.
- Parse request bodies through explicit Zod schemas. Never spread an unvalidated request body into an ORM create/update operation.
- Avoid raw SQL string concatenation. Use MikroORM query APIs or parameterized SQL when raw SQL is genuinely required.
- Recompute monetary values server-side and verify stock before accepting an order.
- If payment webhooks are implemented, verify provider signatures and make event handling idempotent.
- Do not log passwords, tokens, full JWTs, secrets, raw payment data, or unnecessary personal data. Redact sensitive fields in the shared logger.
- Return generic login errors that do not reveal whether an email address exists.
- Add rate limiting or equivalent abuse controls for authentication and expensive AI endpoints where the deployment supports it. If the MVP implementation is only in-memory, document that it is not sufficient for horizontally scaled production traffic.
- Run dependency audit tooling available in the repository and review significant new dependencies.

## 9. Engineering principles

Use these principles to guide actual implementation decisions, not as a reason to add layers for their own sake.

- **SRP:** a file should have one clear reason to change. Entities describe persistence shape; services enforce business rules; route handlers handle HTTP wiring.
- **DRY:** reuse real repeated logic such as validation, response parsing, or error mapping. Do not create abstractions for two unrelated lines merely because they look similar.
- **Separation of concerns:** persistence, business logic, HTTP, presentation, and AI provider integration stay within their intended boundaries.
- **Dependency inversion:** core workflows depend on contracts for replaceable external systems, not directly on vendor SDKs.
- **Explicit over implicit:** register dependencies and important workflows visibly; avoid magic discovery.
- **YAGNI:** do not implement multi-tenancy, RBAC, queues, multi-warehouse stock, a theme builder, or a generic plugin system during this MVP.
- **Composition over inheritance:** prefer small services and functions composed together over deep base-class hierarchies.
- **Fail closed:** errors in authorization must deny access, not accidentally allow it.
- **Idempotency:** payment confirmations, webhooks, and retryable order operations must not create duplicate orders, double-decrement stock, or apply a state transition twice.
- **Correctness over feature count:** when time is limited, reduce scope before removing validation, authorization, transactions, tests, or AI grounding.

## 10. Code quality rules

- Use strict TypeScript. Avoid `any`; narrow `unknown` at runtime instead of disabling type checks.
- Prefer clear, self-documenting names. Comments should explain non-obvious reasons, not restate the code.
- Three similar lines can be clearer than a premature abstraction; repeated branching logic should be extracted when it forms a real shared pattern.
- Every function should operate at one level of abstraction and do one job.
- Prefer early returns to deeply nested conditionals.
- Handle error, empty, and null cases where they occur.
- No empty `catch` blocks. Handle the error, log safe contextual details, or rethrow.
- Avoid magic numbers and strings. Name constants when the meaning or reason is not obvious.
- Prefer positive boolean names such as `isPaid` and `isPublished`.
- Avoid positional boolean arguments; use named options or a clearer function when the call becomes ambiguous.
- Remove dead code, commented-out code, and debug `console.log` calls before completion.
- Do not add lint suppressions, unsafe casts, or disabled compiler checks just to make a task pass without documenting a justified exception.
- Keep each change focused on its stated purpose; avoid unrelated renames, formatting passes, and speculative features.
- Do not claim a feature is implemented if it is only mocked. Label demo adapters and seed data clearly.

## 11. Testing standards

At minimum, test important business behavior rather than implementation details.

- **Unit tests:** domain rules, calculations, validation, and Copilot output/reference verification.
- **Integration tests:** database persistence, transactional order creation, inventory updates, authorization, and idempotent state transitions where implemented.
- **AI tests:** malformed output, missing data, provider failure, and factual grounding.
- **End-to-end tests:** where feasible, cover browse product → checkout → order appears in admin → Copilot returns grounded advice.

For race-sensitive flows, test the concurrent or duplicate-request case, not only the happy path.

A behavior change should include a test for the new behavior. A bug fix should include a regression test that would fail before the fix.

## 12. Definition of done

A feature is not done merely because the UI renders.

Before marking a task complete:

- [ ] TypeScript type-check passes.
- [ ] Lint passes.
- [ ] Relevant tests pass.
- [ ] Input validation and meaningful error states exist.
- [ ] Server-side authorization is enforced where required.
- [ ] Database changes have migrations and appropriate constraints.
- [ ] Money, stock, and order-state invariants are protected.
- [ ] Secrets and unnecessary personal data are not logged or exposed.
- [ ] AI outputs are validated and grounded where applicable.
- [ ] Documentation is updated when setup, behavior, architecture, or limitations change.
- [ ] Manual verification steps are listed for any critical flow not covered by automated tests.
- [ ] Any check that could not run is explicitly reported with the reason.

## 13. Code review checklist

### Architecture and conventions

- [ ] Package dependency direction is respected.
- [ ] Core business logic does not import Next.js or React.
- [ ] Pages and components do not issue raw ORM queries.
- [ ] External integrations are accessed through the intended port/adapter boundary.
- [ ] New concept folders follow existing naming conventions and are not pre-scaffolded empty.
- [ ] Existing shared API/form/table/feedback patterns are reused where appropriate.
- [ ] New abstractions solve a real repeated problem and do not over-engineer the MVP.

### Security and correctness

- [ ] Every non-public route is protected server-side.
- [ ] Record ownership or role permissions are checked on mutations.
- [ ] Request bodies are parsed by explicit schemas; raw bodies are never mass-assigned.
- [ ] Prices and totals are recomputed server-side.
- [ ] Stock updates and order creation are transactionally safe.
- [ ] Retryable payment/order operations are idempotent where applicable.
- [ ] No secret, token, password, or unnecessary personal data appears in logs or responses.
- [ ] Errors in authorization fail closed.
- [ ] Security-relevant fixes include regression tests.

### AI-specific review

- [ ] Tools are bounded and call approved application services only.
- [ ] Output is schema-validated and checked against retrieved evidence.
- [ ] Insufficient data and provider failure are handled explicitly.
- [ ] Prompt injection cannot bypass authorization or tool restrictions.
- [ ] AI does not perform consequential actions without a separate, explicitly approved workflow.

### Verification

- [ ] Lint, type-check, relevant tests, and build pass.
- [ ] Any failed or skipped command is documented.
- [ ] README/AGENTS/engineering standards are updated if the change alters documented behavior.

## 14. How an agent should implement a new concept

When asked to add a feature such as inventory management:

1. Inspect the current repository, package scripts, package versions, and established patterns before editing.
2. Identify the minimum domain model and use cases required for the feature.
3. Add or update the entity and migration in `packages/database`.
4. Add validation schemas in the established core validation location.
5. Implement the business rules in `packages/core`; use a repository contract/port if required by the dependency boundary.
6. Register dependencies explicitly in the Awilix composition root and update the typed cradle/registration contract if present.
7. Add the API route in `packages/app`, with input validation, authorization, and consistent error handling.
8. Add the page/components using existing shadcn and shared UI patterns.
9. Add tests for business rules, persistence, authorization, and failure cases.
10. Run relevant checks and update documentation.
11. Report changed files, key decisions, commands run, results, and known gaps.

Do not create an empty concept folder or speculative abstraction. Do not refactor unrelated modules during a feature task. If the request conflicts with the five-week MVP scope or requires a meaningful architecture change, explain the trade-off and ask for approval before proceeding.

---

## 15. Guiding rule

**Build a coherent, correct, testable product before adding breadth.** Prefer a bounded and measurable AI workflow over a complex autonomous agent. Prefer real evidence over confident speculation. Prefer a simple architecture with clear boundaries over enterprise-style scaffolding. The result should be a portfolio-quality MVP that can be extended after the five-week course project.

---

## Repository decisions

How this repository applies the standards above (adopted 2026-10-13, spec: [`.ai/specs/implemented/2026-10-13-engineering-standards.md`](.ai/specs/implemented/2026-10-13-engineering-standards.md)).

### Folder layout

Layer folder first, then concept folder. Concept folders are created with their first real file.

```text
packages/core/src/
  domain/<concept>/        business rules and value types (money.ts is cross-cutting, at domain/ root)
  services/<concept>/      use cases and services (<name>.use-case.ts / <name>.service.ts)
  validators/<concept>/    shared Zod input schemas (<name>.schema.ts)
  ports/                   contracts for infrastructure (<name>.port.ts)
  errors/                  AppError and the typed application errors
packages/database/src/
  entities/<concept>/      <name>.entity.ts, registered in entities/index.ts
  adapters/                implementations of core ports
  migrations/ seeders/ cli/
packages/ai/src/
  ports/ adapters/ schemas/ grounding/
packages/app/src/
  app/                     App Router pages and route handlers
  components/ui/           shadcn primitives (CLI-generated)
  server/                  composition root, env, logger, http/ (ApiResult, apiHandler)
```

### Dependency direction (enforced by ESLint `no-restricted-imports`)

| Package | May import | Must not import |
|---|---|---|
| `core` | `zod` | `next`, `react`, `@mikro-orm/*`, `awilix`, any `@commerceos/*` |
| `database` | `core`, `@mikro-orm/*` | `next`, `react`, `@commerceos/app`, `@commerceos/ai` |
| `ai` | `core`, `zod` | `next`, `react`, `@mikro-orm/*`, `@commerceos/database`, `@commerceos/app` |
| `app` | `core`, `ai`; `database` and `@mikro-orm/*` **only** in `src/server/container.ts` | – |

Deviation from the original AGENTS.md: `core` now depends on **Zod**, because shared input schemas (used by both forms and route handlers) live there (§2).

### Errors and HTTP

- `AppError` (`code`, `message`) and `ValidationError` (`fieldErrors`), `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError` live in `packages/core/src/errors/`. Every domain or application error extends `AppError`.
- `packages/app/src/server/http/` maps them to HTTP: 400 / 401 / 403 / 404 / 409; any other error (including other `AppError` subclasses, which signal broken invariants) becomes a generic 500. Responses use the `ApiResult<T>` envelope and never include stack traces or internal messages for 500s.
- Admin route handlers use `adminApiHandler` (`server/auth/require-admin.ts`), which adds `connection()` and the session check around `apiHandler`.
- Route handlers wrap their body with `apiHandler`. **Exception:** `GET /api/health` keeps its own response shape, which is a protected contract (`BACKWARD_COMPATIBILITY.md`).
- Server code logs through `packages/app/src/server/logger.ts`, which redacts sensitive keys. Do not call `console.*` directly in app server code.

### Naming exceptions

- shadcn primitives in `packages/app/src/components/ui/` keep the file names the shadcn CLI generates (`button.tsx`).
- The MikroORM seeder class file keeps MikroORM's conventional name (`DatabaseSeeder.ts`).
- `defineEntity` schemas are exported as `<Name>Schema` (MikroORM idiom); the inferred entity type is `<Name>`.

### Testing (adopted 2026-10-13, spec: [`.ai/specs/implemented/2026-10-13-ci-and-test-safety-net.md`](.ai/specs/implemented/2026-10-13-ci-and-test-safety-net.md))

- **Unit coverage is 100%** (lines, branches, functions, statements), enforced by `npm run test:coverage` and CI. The only exclusions are listed with reasons in `vitest.config.mts`: tests and fixtures, test infrastructure, generated code (migrations, shadcn primitives), barrels and type-only `*.port.ts` files, Next.js `page.tsx` / `layout.tsx` (covered by e2e tests) and the DB CLI entry points (run by the integration and e2e setups).
- Integration tests use **Testcontainers** PostgreSQL; there is no shared test database.
- E2E tests run the production build against its own PostgreSQL container and drive it with **agent-browser** (`packages/app/e2e/`). Every new page or user flow gets one.
- CI: `.github/workflows/ci.yml`, one job per gate step.

### Deferred until a real consumer exists

Client-side `/api` helper, `makeCrudRoute`, domain events, shared form/table/feedback components. (Auth helpers and sign-in rate limiting now exist: `packages/app/src/server/auth/`.)

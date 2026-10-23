<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project overview: CommerceOS

**CommerceOS** is a lightweight single-store e-commerce platform (storefront plus merchant admin). It includes **Commerce Copilot**, an AI advisor that gives the merchant evidence-based, actionable recommendations drawn from the store's own data. It is an AI Engineering capstone / portfolio MVP with a 5-week timeline.

> **Source of truth:** [`.ai/specs/2026-10-13-commerceos-mvp.md`](.ai/specs/2026-10-13-commerceos-mvp.md). Read it before any feature work. Day-to-day implementation conventions (naming, layout, boundaries, errors, review checklist) are in [`ENGINEERING_STANDARDS.md`](ENGINEERING_STANDARDS.md). If a decision conflicts with the spec, follow the spec unless the user explicitly approves a change. Scope expansions need the user's approval.

### Product principles

1. Working end-to-end flows beat feature count.
2. Real, traceable data beats unsupported AI claims.
3. **AI advises; the merchant decides.** The model never changes prices, publishes products, issues refunds or modifies orders.
4. Simple now, extensible later: no microservices, plugin systems or premature abstractions.
5. Engineering quality is part of the product: validation, tests, error handling, observability, security and docs.
6. Explicit limitations beat fake functionality. Never present a mock payment or shipping integration as live.

### Scope

- **P0 (MVP):** storefront (catalog, search/filter, cart, checkout with server-side price and stock validation, Stripe test mode or a clearly labelled demo payment, order confirmation); admin (auth, dashboard with real metrics, product/category CRUD, orders with a status workflow, stock adjustment, seed data); Commerce Copilot (one workflow: a performance summary plus 3 prioritized recommendations with evidence; save, dismiss and complete actions; a safe fallback when the LLM is unavailable).
- **P1 (only after P0 is stable):** AI-drafted product descriptions, date-range comparison, an eval script, Stripe webhooks, CSV import, image upload.
- **Out of scope:** multi-tenancy, marketplaces, real shipping and refunds, discounts and subscriptions, multi-currency, a CMS page builder, autonomous AI actions, open-ended agent loops and multi-agent setups, microservices and Kubernetes.

### Stack (installed versions)

| Area | Choice |
|---|---|
| Runtime / package manager | Node.js ≥ 22.17 (developed on 24), **npm workspaces** |
| App | Next.js 16.4 (App Router, Turbopack, `cacheComponents` on), React 19.3, TypeScript 5.9 (strict) |
| Database | PostgreSQL 17 (docker compose), **MikroORM 7** (`@mikro-orm/postgresql`, migrations, seeder) |
| DI | **Awilix 13** (strict mode, PROXY injection) |
| UI | Tailwind CSS v4, **shadcn/ui** (style `base-nova`, Base UI primitives, `lucide-react`) |
| Validation | **Zod 4** (env, request input, AI output) |
| Tests / quality | Vitest 5 (`unit`, `integration`, `e2e` projects) with v8 coverage, Testcontainers (PostgreSQL), agent-browser (e2e), ESLint 9 (`eslint-config-next`), Prettier 3, GitHub Actions CI |
| Admin auth | **Better Auth `~1.7.10`**: email + password, DB-backed revocable sessions, one `owner` role (spec `.ai/specs/implemented/2026-10-15-admin-authentication.md`) |
| LLM provider | **Google Gemini API, free tier** (`@google/genai`, model from `LLM_MODEL`), optional: only `GeminiLlmProvider` in `packages/ai/src/adapters/` imports the SDK (Copilot spec A1–A4) |
| Not chosen yet | Stripe. A separate decision; do not add it silently |

Do not add libraries without a stated reason. TS 7 and ESLint 10 were deliberately not adopted (compatibility with Next 16.4 is unverified).

### Packages and boundaries (modular monolith)

| Package | Responsibility | May depend on |
|---|---|---|
| `packages/app` (`@commerceos/app`) | Next.js: storefront, admin, route handlers and server actions (presentation), **DI composition root** (`src/server/container.ts`), env validation (`src/server/env.ts`) | `core`, `database`, `ai` |
| `packages/core` (`@commerceos/core`) | Domain rules (`src/domain`), use cases and services (`src/services`), shared Zod input schemas (`src/validators`), ports (`src/ports`), `AppError` and typed errors (`src/errors`). Pure TypeScript | `zod` only (no Next.js, React, ORM or DI) |
| `packages/database` (`@commerceos/database`) | MikroORM config, entities (`defineEntity`), migrations, seeders, repository and health adapters implementing `core` ports | `core` |
| `packages/ai` (`@commerceos/ai`) | Commerce Copilot: `LlmProviderPort` and adapters, Copilot tools, prompts, Zod output schemas, grounding checks, eval utilities | `core` |
| `packages/config` (`@commerceos/config`) | Shared `tsconfig.base.json` only | – |

- Internal packages are consumed as **TypeScript source** (`exports` → `./src/index.ts`) with no build step. Turbopack transpiles workspace packages.
- Business logic never lives in React components or route handlers. Handlers stay thin: wrap with `apiHandler` → validate input (`parseRequestBody`) → resolve the use case from the request scope → return `jsonOk(...)`. Use cases signal failures with `AppError` subclasses (`ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`); `apiHandler` maps them to 400/401/403/404/409 and everything else to a generic 500 (`packages/app/src/server/http/`).
- Layout is **layer folder, then concept folder**, e.g. `core/src/services/products/product.service.ts`, `database/src/entities/products/product.entity.ts` (full layout and naming in `ENGINEERING_STANDARDS.md` §1 and "Repository decisions"). Create a concept folder with its first real file. Do not create a new package without approval.
- Dependency direction is enforced by ESLint (`no-restricted-imports` in `eslint.config.mjs`): `core` imports no framework, ORM or workspace package; `ai` never touches the database package; in `app` only `src/server/container.ts` may import `@commerceos/database` or `@mikro-orm/*`.
- Add layers and folders only when they hold real code: no empty folders, no speculative interfaces.

### Dependency injection (Awilix)

- One composition root: `packages/app/src/server/container.ts`. It is the only place that instantiates infrastructure (ORM, LLM adapters, repositories).
- Lifetimes: **singleton** for process-wide and stateless objects (env, `MikroORM`, LLM provider, health checks); **scoped** for anything per-request (`em` = `orm.em.fork()`, use cases using the EM, user context).
- Per request: `const scope = createRequestScope()` → `scope.cradle.<useCase>` → `await scope.dispose()` in `finally`.
- The container runs in `strict: true`, so Awilix throws if a singleton depends on a scoped registration. Never weaken this.
- Classes receive dependencies through a single constructor object (`constructor(deps: { orm: MikroORM })`), which keeps them testable without the container.

### Database conventions (MikroORM + PostgreSQL)

- Entities use `defineEntity` + `p.*` builders (no decorators) and must be added to `entities` in `packages/database/src/entities/index.ts`.
- **Migrations are the source of truth.** Never use `schema.update()` outside tests. After changing an entity: `npm run db:migration:create`, review the generated SQL, and commit it. The integration test fails on any drift between entities and migrations.
- `allowGlobalContext: false`: always work on a forked EntityManager (request scope or explicit `orm.em.fork()`).
- Money is stored as integer minor units (`priceMinor`, `totalMinor`) in `int` columns with `check (>= 0)`. Use the `Money` helpers in `core`; never use floats.
- Order creation and stock changes run in one transaction (`em.transactional`) with an atomic conditional stock decrement (no overselling). Order items store name and price snapshots.
- `products.stock_quantity` has exactly three writers after product creation (which sets only the initial value, not recorded); product edits never touch it, and the seeder and the CSV import (`DatabaseProductImportRepository.createMany`, insert-only: a row matching an existing slug or SKU is skipped, never updated) set it only for the products they create. Never add another:
  1. a **manual change**, only through `StockRepositoryPort.setStock` (`packages/database/src/adapters/database-stock-repository.ts`): a conditional update on the expected quantity plus a `stock_adjustments` row in one transaction (the only recorded writer);
  2. the **checkout decrement** in `DatabaseOrderRepository.placeOrder` (below);
  3. the **cancel restock** in `DatabaseOrderAdminRepository.changeStatus` (`packages/database/src/adapters/database-order-admin-repository.ts`): `pending_payment → cancelled` as a conditional `update orders … where id = :id and status = :from`, then `stock_quantity = stock_quantity + :q` per line in product-id order, in one transaction (not recorded).
- Checkout decrements stock only in `DatabaseOrderRepository.placeOrder` (`packages/database/src/adapters/database-order-repository.ts`): one `em.transactional`, lines locked in product-id order, each an atomic `update … where status = 'published' and stock_quantity >= :q returning …` that also yields the price snapshot. These decrements are not recorded in `stock_adjustments` (manual changes only).
- Order status changes go only through the transition table in `packages/core/src/domain/orders/order-status.ts` (orders spec A4) and the conditional update above. `paid` is set only by the payment flow (`markPaid`), never by the admin (A3); `refunded` is a recorded status only (no money moves, no restock).
- Add unique constraints and indexes for slugs, SKUs, order references and frequently queried foreign keys. Use DB `check` constraints for enums and invariants.
- Seeders are repeatable and never overwrite owner data (orders spec A18): the demo catalog is insert-only by slug (`on conflict do nothing`; a product that cannot be created is skipped with a warning), and the generated demo data (`DEMO-` orders, both traffic tables) is deleted and regenerated in one transaction. Demo data is visibly marked (`[DEMO]` text and customers, `DEMO-` SKUs and order references; `isDemoOrderReference` / `DEMO_ORDER_REFERENCE_LIKE` in core are the one discriminator). Seeded orders never change stock, and the seed creates no `pending_payment` order (A15).
- Do not return ORM entities from API routes. Map them to explicit DTOs.

### Security and validation

- Validate all untrusted input at the boundary with Zod (route handlers, server actions, AI output). Read env only through `getEnv()`.
- Enforce authorization on the server for every admin and Copilot operation; hiding UI is not authorization.
- **Every admin entry point goes through `packages/app/src/server/auth/require-admin.ts`.**
  - Pages under `src/app/admin/(protected)/` call `requireAdminPage()`. Read the session only inside `<Suspense>`.
  - Routes under `src/app/api/admin/` use `adminApiHandler`.
  - Admin server actions (`*.action.ts`, e.g. `src/server/catalog/category.action.ts`) run every export through `runAdminAction` (`src/server/catalog/run-admin-action.ts`), which calls `requireAdmin()` before the handler, maps `AppError`s to an `ActionState` for `useActionState` forms, updates the `catalog` cache tag, and redirects only after its try/catch. An action that cannot use it calls `requireAdmin()` as its first statement. Each export gets a unit test invoked without a session (redirect to sign-in, no use case resolved).
  - Admin forms are a hook-free **view** (rendered in every state by unit tests) plus a thin `"use client"` wrapper that only calls `useActionState` (`src/components/admin/categories/`).
  - `admin-guard-inventory.test.ts` fails when one of them skips the guard.
  - Never call Better Auth (`getAuth()`) or read the session cookie directly.
- Never trust client-submitted prices, totals, payment status or stock. Never store card data.
- Never return stack traces, raw provider or DB errors, or secrets to users. Log with context through `logger` (`packages/app/src/server/logger.ts`, redacts sensitive keys and URL credentials); never call `console.*` directly in server code.
- Server-only modules start with `import "server-only"`.

### Commerce Copilot rules

- Flow: auth → input validation and limits → deterministic intent routing or a bounded tool-calling loop → **approved tools only** (`getSalesSummary`, `getTopProducts`, `getLowStockProducts`, `getOrderSummary`, `getTrafficSummary`; the last reads seeded, fictional demo traffic data and its output is always labelled as such, see spec §6 and decision D08). No raw SQL or ORM access for the model.
- Output follows the `CopilotRecommendation` schema (title, priority, observation, evidence[], reasoning, suggestedAction, relatedProductIds?, limitations?). Validate at runtime, retry a bounded number of times, then fall back safely.
- Grounding: every metric value and product ID must come from tool results. Never invent data or claim causation from correlation.
- Treat prompts and product content as untrusted (prompt injection). Send the minimum data needed, never credentials or unnecessary personal data. Set timeouts and limits. Never render model output as HTML.
- Metric definitions (revenue, paid orders, AOV, top products, low stock) are documented in both the code and the UI: one source, `METRIC_DEFINITIONS` in `packages/core/src/domain/metrics/metric-definitions.ts`, printed on `/admin` and mirrored in the README. The Copilot tools call the metric use cases in `packages/core/src/services/metrics/` unchanged; never compute a metric a second way.
- All LLM access goes through `LlmProviderPort` (`packages/ai`). Without credentials the app uses `UnconfiguredLlmProvider`, which fails explicitly; the UI must then show a clear fallback state or deterministic rule-based insights, never a fabricated answer.
- Recommendation actions (save, dismiss, complete) go only through the transition table in `packages/core/src/domain/copilot/recommendation-status.ts` (Copilot spec A14) and the conditional update in `DatabaseCopilotRecommendationRepository`; they write `copilot_recommendations` only, never store data.
- Evaluation: keep a version-controlled eval set (in `packages/ai`) that covers factual grounding, invalid output, insufficient data, prompt injection in product content, and provider failure. Assert properties, not exact wording. `npm run eval` prints the report. The checks live in `packages/ai/src/evals/runner/` and the unit tests call them too, so never re-implement a check in a test. `--live` (bounded call budget, refuses under `CI`) is the only path that calls a real provider outside the app. It reads `LLM_*` through `parseLiveEvalEnv`, the one documented exception to `getEnv()` (eval-script spec A1; a parity test pins it to `parseEnv`).

### Testing

- **100% unit coverage is mandatory.** Every new feature and every change must keep unit coverage at **100% lines, branches, functions and statements**. `npm run test:coverage` enforces it and CI fails below it. Do not lower the thresholds, and do not add a coverage exclusion or `/* v8 ignore */` comment without a reason written next to it and the user's approval. The current exclusion list (with reasons) is in `vitest.config.mts`; logic that a page needs goes into a colocated `.ts` module so it is unit-covered.
- Unit tests: `packages/*/src/**/*.test.ts`, run with `npm test` (`npm run test:coverage` for the gate). No network or DB access: use fake ports, or `createUnitTestOrm()` (`@commerceos/database/testing`) with stubbed methods.
- Integration tests: `packages/*/src/**/*.int.test.ts`, run with `npm run test:integration`. A Vitest global setup starts a throwaway PostgreSQL 17 container with **Testcontainers** (needs Docker) and hands its URL to tests via `inject("databaseUrl")`. Use them for persistence, transactions, constraints and migrations.
- E2E tests: `packages/app/e2e/**/*.e2e.test.ts`, run with `npm run build && npm run test:e2e`. The global setup instantiates the whole app ephemerally (PostgreSQL container → migrate and seed CLI → `next start` on a free port) and tests drive it with **agent-browser** through `useBrowser()` (`packages/app/e2e/support/`). Install the browser once with `bash .ai/scripts/ensure-agent-browser.sh`. Failing tests save a screenshot to `packages/app/e2e/artifacts/`. **Every new page or user flow gets an e2e test.**
- Every behaviour change ships with tests; a bug fix ships with a regression test that fails before the fix. Priorities: business rules, persistence and transactions, authorization, AI output validation and failure paths. Extend the e2e suite to the purchase → admin → Copilot path once those flows exist.

### Definition of done

- The whole gate passes (see Validation): lint, format, typecheck, **unit tests at 100% coverage**, build, integration and e2e tests. CI (`.github/workflows/ci.yml`) runs it on every pull request; a red check blocks the merge.
- Input validation, loading, empty and error states, and server-side authorization are in place.
- No secrets or unnecessary personal data in code or logs. Secrets live only in env variables; `.env.example` holds placeholders only.
- Schema changes have a migration; seed data and tests are updated with them.
- Docs (README, this file, specs) are updated when setup, behaviour, architecture or API contracts change.
- Flows without automated tests have documented manual verification steps.

### Agent rules

1. **Inspect before editing:** read the relevant packages, scripts, installed versions (`node_modules/next/dist/docs/`, library typings) and existing conventions first.
2. **Plan bounded changes:** for multi-file work, write or update a spec in `.ai/specs/` and name the files and modules involved.
3. **Stay focused:** no unrelated refactors, stack replacements or broad reorganisations without approval.
4. **Respect the spec:** if a request expands scope or conflicts with the spec or this file, explain the trade-off and ask.
5. **No invented integrations:** without credentials, use an explicitly labelled dev adapter or mock and document the limitation.
6. **No `any`, unsafe casts, disabled lint rules or swallowed errors** without a documented reason.
7. **Run the checks** (see Validation) before declaring a task done. If a check cannot run, say why.
8. **Report on completion:** what changed, key decisions, commands run and their results, known gaps, and the recommended next task. Never claim production readiness.

## Task routing

Before starting a task, read the files listed for the area it touches.

| When the task involves… | Read first | Key rules |
|---|---|---|
| Any task | `AGENTS.md`, `ENGINEERING_STANDARDS.md`, `.ai/specs/2026-10-13-commerceos-mvp.md`, `.ai/lessons.md`, `SDLC.md` | Work from a spec in `.ai/specs/`; log autonomous runs in `.ai/runs/`; record lessons |
| A new feature | `.ai/specs/`, `SDLC.md` | Spec first (`YYYY-MM-DD-slug.md`); after implementation, move the spec to `specs/implemented/` |
| Domain rules / use cases | `packages/core/src/`, `ENGINEERING_STANDARDS.md` §1–3 | Pure TS (+ Zod), no framework imports; `<name>.use-case.ts` / `<name>.service.ts`; ports end in `Port`/`Gateway`; errors extend `AppError`; unit-test with fakes |
| Entities, migrations, seeds | `packages/database/src/`, Database conventions above | `defineEntity` in `entities/<concept>/<name>.entity.ts`; register in `entities/index.ts`; migration plus integration test with every schema change |
| Dependency wiring | `packages/app/src/server/container.ts` | Deliberate lifetimes; strict mode; scoped EM |
| Admin auth, sessions, the owner account | `packages/app/src/server/auth/`, `.ai/specs/implemented/2026-10-15-admin-authentication.md` | Guard every admin entry point with `require-admin.ts`. Sign-in goes through Better Auth's HTTP handler (its router applies the rate limit and origin check; `auth.api.*` does not). Owner via `npm run admin:create` |
| Env variables | `packages/app/src/server/env.ts`, `.env.example` | Add to the Zod schema and `.env.example` together; read via `getEnv()` |
| Pages, layouts, routing (UI) | `packages/app/src/app/`, `node_modules/next/dist/docs/` | Server Components by default; `cacheComponents` is on, so wrap request-time data in `<Suspense>` and call `connection()`; use Next.js 16 APIs |
| UI components, styles | `packages/app/components.json`, `packages/app/src/components/ui/`, `packages/app/src/app/globals.css` | Add components with `npx shadcn@latest add <name>` (run in `packages/app`); Tailwind utilities; accessible states |
| API / Route Handlers | `packages/app/src/server/http/`, `BACKWARD_COMPATIBILITY.md` | `apiHandler` + `parseRequestBody` + `ApiResult` envelope; per-request scope; no internal error details in responses; additive API changes only (`/api/health` keeps its own shape) |
| Commerce Copilot / LLM | `packages/ai/src/`, Commerce Copilot rules above | Go through the port only; schema-validate; ground every claim; handle the fallback; add eval cases |
| New package or shared code | Packages and boundaries above | Do not create a new package without approval; respect the dependency direction |
| Build / TS / lint / test config | `packages/app/next.config.ts`, `packages/config/tsconfig.base.json`, `eslint.config.mjs`, `vitest.config.mts` | Changes to config and env variables follow `BACKWARD_COMPATIBILITY.md` |
| Tests | Testing above, `vitest.config.mts`, `packages/app/e2e/support/` | `*.test.ts` = unit (100% coverage), `*.int.test.ts` = integration (Testcontainers), `*.e2e.test.ts` = e2e (agent-browser) |
| CI / GitHub | `.github/workflows/ci.yml`, `.ai/trackers/github.md`, `SDLC.md` | Jobs mirror the validation gate (lint, unit + coverage, build, integration, e2e); keep the workflow and the gate in sync |
| Code review / PR | `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md`, `SDLC.md` | Pipeline labels follow `SDLC.md`; severities follow `CODE_REVIEW.md` |
| Product discovery, a brief, or a backlog | `.ai/specs/product-brief.md`, `.ai/specs/research/`, `.ai/specs/backlog.md`, the Definition of Ready and protected decisions in `SDLC.md` | Decisions in the brief (non-goals, business rules, decisions) are a protected contract; synthetic personas are hypotheses, never evidence <!-- discovery:routing --> |

## Validation

Run before every commit or PR (the gate from `.ai/agentic.config.json`; CI runs the same checks on every pull request):

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test:coverage      # unit tests, fails below 100% coverage
npm run build
npm run test:integration   # Testcontainers PostgreSQL (needs Docker)
npm run test:e2e           # after `npm run build`; needs Docker and agent-browser
```

Process documents: `SDLC.md` (ticket flow and labels), `CODE_REVIEW.md` (review rules), `BACKWARD_COMPATIBILITY.md` (protected contracts), `.ai/agentic.config.json` (pipeline configuration).

## Repository structure: monorepo

This project is a **monorepo**: one repository holding multiple packages.

- Each package's source code lives in its own directory: `packages/<package-name>/` (current packages: `app`, `core`, `database`, `ai`, `config`; see Packages and boundaries).
- Do not add new standalone source code at the repository root. The root holds only shared tooling and configuration: `package.json` (workspaces and scripts), `eslint.config.mjs`, `vitest.config.mts`, Prettier, `docker-compose.yml`, `.env.example` and `test/` (shared test stubs).
- One `.env` for the whole repo lives at the root. `packages/app/next.config.ts` and the database CLI load it.
- Shared code goes into a dedicated package under `packages/` and is imported from there, not copied.

## Project metadata: the `.ai/` folder

All agents (Claude Code, Codex, etc.) MUST use these structures. Do not store specs, run logs or lessons anywhere else.

```
.ai/
├── specs/                  # Specifications for Spec-Driven Development (SDD)
│   ├── YYYY-MM-DD-slug.md  # Active specs (not yet implemented)
│   ├── implemented/        # Specs moved here once fully implemented
│   ├── archive/            # Obsolete / superseded / abandoned specs
│   ├── product-brief.md    # Product brief from om-discover (fixed name; protected decisions, see SDLC.md)
│   ├── backlog.md          # Backlog map from om-backlog (fixed name)
│   └── research/           # Discovery inputs: interviews, benchmarks, decisions/ records
├── runs/                   # Logs of autonomous AI runs: YYYY-MM-DD-slug.md
├── lessons.md              # Index of findings, lessons and improvements (long-term memory)
├── lessons/                # Detailed lesson write-ups: YYYY-MM-DD-slug.md
└── cezar/                  # Cezar agent-orchestrator workspace (`npx cezar-run`)
```

`.ai/cezar/` belongs to [Cezar](https://github.com/open-mercato/cezar). Its runtime state (task runs, worktrees, automation state, `launch-key`) is ignored by `.ai/cezar/.gitignore`. Commit only Cezar workflows (`.ai/cezar/workflows/*.yaml`) and skills, and never edit the runtime files by hand.

### Rules

1. **Specs first (SDD)**: implement features from a spec in `.ai/specs/`. Name specs `YYYY-MM-DD-slug.md` (lowercase kebab-case slug). When a spec is fully implemented, move it to `.ai/specs/implemented/`; when obsolete, move it to `.ai/specs/archive/`.
2. **Runs**: every autonomous run MUST write a log to `.ai/runs/YYYY-MM-DD-slug.md` (goal, steps taken, decisions, outcome, follow-ups).
3. **Lessons**: read `.ai/lessons.md` before starting work. After fixing a bug or discovering something worth remembering, append an entry to `.ai/lessons.md` (details in `.ai/lessons/YYYY-MM-DD-slug.md` if long).
4. Dates use the current date in `YYYY-MM-DD` format.

## Working principles

Distilled from the Claude Code team's best practices. They apply to every agent working in this repo.

1. **Plan before building.** Start every non-trivial task with a plan: a spec in `.ai/specs/` or plan mode. Invest in the plan so the implementation can be done in one pass. If something goes sideways, stop and re-plan; do not keep pushing.
2. **Verify, don't assume.** Prove the change works: run tests, lint and build, or compare behaviour against `main`. Do not declare work done without evidence.
3. **Prefer the elegant solution.** If a fix turns out hacky or mediocre, scrap it and reimplement it cleanly using everything learned so far. Do not stack patches.
4. **Learn from every correction.** When the user corrects you, or you fix a bug, write the rule or lesson down in `.ai/lessons.md` (or in this file, if it is a project-wide rule) so the mistake does not repeat. Keep these files short and pruned.
5. **Fix autonomously.** Given a bug report, failing CI or logs, investigate and fix end to end without asking how. Ask only for decisions that genuinely belong to the user.
6. **Keep context clean.** Delegate broad searches and independent subtasks to subagents, and run independent work in parallel (for example, separate git worktrees).
7. **Automate repetition.** If you do something more than once, turn it into a skill or script, commit it under `.agents/` or `.ai/scripts/`, and reuse it.
8. **Reduce ambiguity.** Clarify requirements up front and record them in the spec. Specific inputs produce better output.

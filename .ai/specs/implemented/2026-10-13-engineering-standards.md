# Spec: adopt the CommerceOS Engineering Standards

- **Date:** 2026-10-13
- **Status:** implemented (2026-10-13), run log: [`.ai/runs/2026-10-13-engineering-standards.md`](../../runs/2026-10-13-engineering-standards.md)
- **Source:** the "CommerceOS — Engineering Standards" document provided by the user, stored verbatim as [`ENGINEERING_STANDARDS.md`](../../../ENGINEERING_STANDARDS.md).

## Goal

Make the engineering standards part of the repository and bring the existing foundation code in line with them while it is still small, so every following feature starts from the same conventions. No product features are added.

## Conflicts with the existing docs and how they are resolved

The standards are the newer, user-approved document, so they win where they are explicit. AGENTS.md is updated to match.

| Topic | Before (AGENTS.md / code) | Decision |
|---|---|---|
| Zod in `core` | `core` depends on nothing (no Zod) | `core` may depend on **Zod** (standards §2: shared Zod schemas live in core). Still no Next.js, React or MikroORM. |
| Folder layout | concept-first (`core/src/catalog/...`), `domain/` + `application/` | **Layer folder, then concept folder**, following the standards' examples: `core/src/{domain,services,validators,ports,errors}/<concept>/`, `database/src/entities/<concept>/`, `*/src/adapters/`. Concept folder names follow standards §1 (`products`, `orders`, `inventory`, `health`, …). |
| File suffixes | `product.ts`, `health.ts` | `<name>.entity.ts`, `<name>.use-case.ts` / `<name>.service.ts`, `<name>.schema.ts`, `<name>.port.ts`. |
| Port names | `HealthCheck`, `LlmProvider` | `HealthCheckPort`, `LlmProviderPort`. Adapters keep descriptive names under `adapters/`. |
| Use case names | `GetSystemHealth` / key `getSystemHealth` | `GetSystemHealthUseCase` / key `getSystemHealthUseCase`. |
| Zod schema names | `CopilotResponseSchema`, `EnvSchema` | camelCase: `copilotResponseSchema`, `envSchema`. |
| Domain errors | `InvalidMoneyError extends Error` | `AppError` base in `core`; every domain/application error extends it. |
| Page exports | `StorefrontHome`, `AdminDashboard` | `HomePage`, `AdminPage`. |
| shadcn files | lowercase (`button.tsx`) | **Exception:** CLI-generated primitives in `components/ui/` keep the CLI's file names. |
| `/api/health` response | own shape | **Exception:** kept as-is (protected contract, `BACKWARD_COMPATIBILITY.md`). New endpoints use the `ApiResult<T>` envelope. |

## Changes

1. `ENGINEERING_STANDARDS.md` (root): the standards document plus a short "Repository decisions" section with the table above.
2. **Errors** (`packages/core/src/errors/app-error.ts`): `AppError` (with `code`), `ValidationError` (with `fieldErrors`), `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`. `InvalidMoneyError` and `LlmProviderUnavailableError` extend `AppError`.
3. **HTTP layer** (`packages/app/src/server/http/`): `ApiResult<T>` with `jsonOk` / `jsonError`, `parseRequestBody` (invalid JSON or schema failure → `ValidationError`), `toClientErrorResponse` (known errors → 400/401/403/404/409, anything else → generic 500, no stack traces) and `apiHandler` (wraps a route handler, logs unexpected errors safely). The first consumers are the upcoming admin CRUD routes; `/api/health` keeps its contract.
4. **Logger** (`packages/app/src/server/logger.ts`): minimal structured logger that redacts sensitive keys (password, token, secret, authorization, cookie, apiKey, …). Replaces the `console.error` calls in the health route and admin page.
5. **Renames to the conventions** (all consumers updated in the same change; packages are internal and unpublished):
   - core: `domain/products/product.ts`, `ports/health-check.port.ts`, `services/health/get-system-health.use-case.ts`.
   - database: `entities/{categories,products}/<name>.entity.ts`, `adapters/database-health-check.ts`.
   - ai: `ports/llm-provider.port.ts`, `adapters/unconfigured-llm-provider.ts`, `schemas/copilot-response.schema.ts`, `grounding/find-grounding-issues.ts`.
6. **Boundary enforcement** in `eslint.config.mjs` via `no-restricted-imports`:
   - `core`: no `next`, `react`, `@mikro-orm/*`, `awilix`, `@commerceos/*`.
   - `database`: no `next`, `react`, `@commerceos/app`, `@commerceos/ai`.
   - `ai`: no `next`, `react`, `@mikro-orm/*`, `@commerceos/database`, `@commerceos/app`.
   - `app`: `@mikro-orm/*` and `@commerceos/database` only in the composition root (`src/server/container.ts` and its test).
7. **Docs:** AGENTS.md (boundaries, layout, naming, routing row, Zod in core), CODE_REVIEW.md (points to the standards' review checklist), README (dependency direction and how it is enforced).

## Out of scope (deferred until a real consumer exists)

Client-side `/api` helper, `makeCrudRoute`, auth helpers, rate limiting, domain events, shared form/table components.

## Verification

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run format:check`.
- A deliberate forbidden import (e.g. `next/server` in `core`) fails lint (checked manually, not committed).
- `npm run test:integration` only if PostgreSQL is available (file moves touch the integration test imports).

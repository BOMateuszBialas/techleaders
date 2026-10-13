# Run: adopt the engineering standards

- **Date:** 2026-10-13
- **Spec:** [.ai/specs/implemented/2026-10-13-engineering-standards.md](../specs/implemented/2026-10-13-engineering-standards.md)
- **Trigger:** user request to implement the "CommerceOS — Engineering Standards" document

## Goal

Store the standards in the repo, resolve their conflicts with AGENTS.md, and bring the foundation code in line with them (naming, layout, boundaries, errors, logging) before feature work starts.

## Steps

1. Compared the standards with AGENTS.md and the code; recorded the conflicts and decisions in the spec (Zod allowed in `core`, layer-then-concept layout, `Port` suffix, `*.entity.ts` / `*.use-case.ts` / `*.schema.ts`, camelCase Zod schemas, `<Segment>Page`, shadcn and `/api/health` exceptions).
2. Added `ENGINEERING_STANDARDS.md` (the document plus a "Repository decisions" section).
3. `core`: `AppError` hierarchy (`errors/app-error.ts`); `InvalidMoneyError` now extends it; moved files to `domain/products/`, `ports/health-check.port.ts`, `services/health/get-system-health.use-case.ts` (`GetSystemHealthUseCase`).
4. `database`: entities moved to `entities/<concept>/<name>.entity.ts`; health adapter moved to `adapters/`.
5. `ai`: split into `ports/llm-provider.port.ts` (`LlmProviderPort`, `LlmProviderUnavailableError extends AppError`), `adapters/unconfigured-llm-provider.ts`, `schemas/copilot-response.schema.ts` (camelCase schemas), `grounding/find-grounding-issues.ts`; tests split accordingly.
6. `app`: `server/logger.ts` (redacts sensitive keys, URL credentials, reduces errors), `server/http/` (`ApiResult`, `jsonOk`, `jsonError`, `apiHandler`, `toClientErrorResponse`, `parseRequestBody`); health route and admin page log through `logger`; container key `getSystemHealthUseCase`; pages renamed to `HomePage` / `AdminPage`; `envSchema`.
7. ESLint `no-restricted-imports` boundaries per package; verified with temporary probe files (5 expected errors, composition root allowed).
8. Docker turned out to be working now, so ran the DB part of the gate. The live smoke test showed `/api/health` reporting the database as down although migrations worked: `checkConnection()` on the lazily created ORM always returns "Connection not established". Fixed `DatabaseHealthCheck` to run `select 1` and added regression tests (lazy ORM healthy, unreachable DB fails); confirmed the regression test fails on the old code.
9. Docs: AGENTS.md, CODE_REVIEW.md, README, lessons; moved both the standards spec and the (now fully verified) foundation spec to `implemented/`.

## Verification

| Command | Result |
|---|---|
| `npm run lint` | ✅ pass |
| `npm run typecheck` | ✅ pass (4 packages) |
| `npm test` | ✅ 11 files, 42 tests |
| `npm run build` | ✅ |
| `npm run format:check` | ✅ |
| `npm run db:up` / `db:migrate` / `db:seed` | ✅ |
| `npm run test:integration` | ✅ 7 tests (incl. 2 new health regression tests) |
| `next start` + curl | ✅ `/` 200, `/admin` 200, `/api/health` 200 `{"status":"ok",...}` |

## Follow-ups

- `apiHandler`, `parseRequestBody` and `ApiResult` have no route consumers yet; the first ones are the admin CRUD routes.
- Deferred until needed: client `/api` helper, `makeCrudRoute`, auth helpers, rate limiting, domain events.
- Next task: admin authentication (library choice is the user's decision), then product/category CRUD; CI workflow mirroring the gate.

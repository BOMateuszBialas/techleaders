<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project overview: CommerceOS

CommerceOS is a lightweight single-store e-commerce platform (storefront plus merchant admin) with **Commerce Copilot**, an AI advisor that gives the merchant evidence-based recommendations drawn from the store's own data. It is an AI Engineering capstone / portfolio MVP on a 5-week timeline.

- **Source of truth:** `.ai/specs/2026-10-13-commerceos-mvp.md` (scope in §3, architecture in §5). Read it before feature work. If a decision conflicts with the spec, follow the spec unless the user explicitly approves a change. Scope expansions need the user's approval.
- **Conventions:** `ENGINEERING_STANDARDS.md`. **Process:** `SDLC.md`, `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md`.

Product principles: (1) working end-to-end flows beat feature count; (2) real, traceable data beats unsupported AI claims; (3) **AI advises; the merchant decides**: the model never changes prices, publishes products, issues refunds or modifies orders; (4) simple now, extensible later: no microservices, plugin systems or premature abstractions; (5) engineering quality is part of the product; (6) explicit limitations beat fake functionality.

### Stack

Node.js ≥ 22.17, **npm workspaces**; Next.js 16.4 (App Router, `cacheComponents`), React 19.3, TypeScript 5.9 strict; PostgreSQL 17 with **MikroORM 7**; **Awilix 13** DI; Tailwind CSS v4 and shadcn/ui; **Zod 4**; Vitest 5, Testcontainers, agent-browser, ESLint 9, Prettier 3. Admin and customer auth are two Better Auth instances (`~1.7.10`). The LLM is optional (Gemini, free tier). Stripe is not chosen; do not add it silently. Do not add libraries without a stated reason.

## Packages and boundaries

Modular monolith. Internal packages are TypeScript source with no build step. Business logic never lives in React components or route handlers. Do not create a new package without approval. Add layers and folders only when they hold real code.

| Package | Responsibility | Rules |
|---|---|---|
| `packages/app` | Next.js: storefront, admin, route handlers, server actions, DI composition root (`packages/app/src/server/container.ts`), env (`packages/app/src/server/env.ts`) | `packages/app/AGENTS.md` |
| `packages/core` | Pure TypeScript: domain, use cases and services, Zod validators, ports, `AppError` | `packages/core/AGENTS.md` |
| `packages/database` | MikroORM config, entities, migrations, seeders, adapters implementing `core` ports | `packages/database/AGENTS.md` |
| `packages/ai` | Commerce Copilot: `LlmProviderPort`, adapters, tools, prompts, output schemas, evals | `packages/ai/AGENTS.md` |
| `packages/config` | Shared `tsconfig.base.json` only | – |

Dependency direction is enforced by ESLint (`no-restricted-imports` in `eslint.config.mjs`).

## Agent rules

1. **Inspect before editing:** read the relevant package, scripts, installed versions (`node_modules/next/dist/docs/`, library typings) and existing conventions first.
2. **Plan bounded changes:** for multi-file work, write or update a spec in `.ai/specs/` and name the files and modules involved.
3. **Stay focused:** no unrelated refactors, stack replacements or broad reorganisations without approval.
4. **Respect the spec:** if a request expands scope or conflicts with the spec or this file, explain the trade-off and ask.
5. **No invented integrations:** without credentials, use an explicitly labelled dev adapter or mock and document the limitation.
6. **No `any`, unsafe casts, disabled lint rules or swallowed errors** without a documented reason.
7. **Run the checks** (Validation below) before declaring a task done. If a check cannot run, say why.
8. **Report on completion:** what changed, key decisions, commands run and their results, known gaps, and the recommended next task. Never claim production readiness.

Agent guardrails: `.claude/settings.json` denies `.env` files (except `.env.example` and `.env.template`) and credential folders. The hook `.claude/hooks/pre-tool-use.sh` blocks recursive deletes, download-to-shell pipes and `.env` names. If the hook blocks a command, ask the user. Never read or copy `.env`. Write a commit message or PR body that names a `.env` file to a file and pass it with `git commit -F` / `gh pr create --body-file`. `.claude/`, `.agents/`, `.mcp.json`, `.github/workflows/` and the agent instructions belong to the maintainer (`.github/CODEOWNERS`).

Testing: **100% unit coverage is mandatory** (`npm run test:coverage`). Do not lower thresholds or add an exclusion without a written reason and the user's approval (`vitest.config.mts`). Unit tests are `*.test.ts` (no network or DB), integration tests `*.int.test.ts` (Testcontainers), e2e tests `packages/app/e2e/**/*.e2e.test.ts`. A behaviour change ships with tests; a bug fix ships with a regression test that fails before the fix.

Reference files (patterns to copy): `packages/app/src/server/catalog/category.action.ts` (admin action), `packages/database/src/adapters/database-stock-repository.ts` (transactional, audited write), `packages/core/src/domain/orders/order-status.ts` (transition table).

## Task routing

Before starting a task, read the files in the row for its type. Each package's rules are in its own `AGENTS.md`.

| Task type | Read first | Key rules |
|---|---|---|
| Any task | `.ai/lessons.md`, `SDLC.md`, `.ai/specs/2026-10-13-commerceos-mvp.md` | Work from a spec; log autonomous runs in `.ai/runs/`; record lessons |
| New feature | `.ai/specs/`, `SDLC.md`, `ENGINEERING_STANDARDS.md` | Spec first (`YYYY-MM-DD-slug.md`); after implementation, move it to `.ai/specs/implemented/` |
| Bug fix | `.ai/lessons.md`, `CODE_REVIEW.md` | Regression test that fails before the fix; add a lesson if reusable |
| Schema change (entities, migrations, seeds) | `packages/database/AGENTS.md`, `BACKWARD_COMPATIBILITY.md` | `defineEntity`; register in `packages/database/src/entities/index.ts`; migration plus integration test |
| UI change (pages, components, design system) | `packages/app/AGENTS.md`, `docs/design-system.md`, `.ai/design/tokeny.md` | `packages/app/src/components/ui` before new markup; semantic tokens; `check:tokens`; Storybook; e2e for a new flow |
| Copilot change (LLM, tools, prompts) | `packages/ai/AGENTS.md`, `packages/core/AGENTS.md` (Metrics) | Port only; schema-validate; ground every claim; fallback; eval cases |
| Config change (env, build, TS, lint, test) | `BACKWARD_COMPATIBILITY.md`, `packages/app/src/server/env.ts`, `vitest.config.mts`, `eslint.config.mjs` | Env in Zod and `.env.example` together; read via `getEnv()`; thresholds never lowered |
| Domain rules and use cases | `packages/core/AGENTS.md`, `ENGINEERING_STANDARDS.md` §1–3 | Pure TS plus Zod; `AppError` subclasses; unit-test with fakes |
| Dependency wiring, API, route handlers | `packages/app/AGENTS.md`, `packages/app/src/server/http/`, `BACKWARD_COMPATIBILITY.md` | `apiHandler` + `parseRequestBody`; per-request scope; additive API changes only |
| Admin auth, sessions, owner account | `packages/app/AGENTS.md` (Admin), `packages/app/src/server/auth/`, `.ai/specs/implemented/2026-10-15-admin-authentication.md` | Guard every admin entry point with `require-admin.ts`; owner via `npm run admin:create` |
| Customer accounts, My orders, order ownership | `packages/app/AGENTS.md` (Accounts), `packages/app/src/server/customer-auth/`, `packages/core/src/domain/orders/order-access.ts`, `.ai/specs/implemented/2026-10-24-customer-accounts.md`, `.ai/security-notes.md` §10 | Guard with `require-customer.ts`; id from the session only; the A↔B e2e stays green |
| New package or shared code | Packages and boundaries above | No new package without approval; respect the dependency direction |
| Agent settings, hooks, skills, MCP (`.claude/`, `.agents/`, `.mcp.json`) | `.ai/security-notes.md`, `.claude/settings.json`, `.claude/hooks/` | Never weaken a deny rule or the hook without approval; hook changes ship with `npm run test:hooks` cases |
| CI / GitHub | `.github/workflows/ci.yml`, `.ai/trackers/github.md`, `SDLC.md` | Jobs mirror the validation gate; keep the workflow and the gate in sync |
| Code review / PR | `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md`, `SDLC.md` | Pipeline labels follow `SDLC.md`; severities follow `CODE_REVIEW.md` |
| Agent instructions (`AGENTS.md`, `CLAUDE.md`, `.ai/lessons*`) | `scripts/agents/check.ts` | `npm run check:agents` must pass; the router stays under its size budget |
| Product discovery, a brief, or a backlog | `.ai/specs/product-brief.md`, `.ai/specs/research/`, `.ai/specs/backlog.md`, `SDLC.md` (Definition of Ready, protected decisions) | Decisions in the brief are a protected contract; synthetic personas are hypotheses, never evidence <!-- discovery:routing --> |

## Validation

Run before every commit or PR (the gate from `.ai/agentic.config.json`; CI runs the same checks on every pull request):

```bash
npm run lint
npm run format:check
npm run check:tokens       # design tokens: no palette or arbitrary values outside globals.css
npm run check:agents       # agent instructions: router size, referenced paths, CLAUDE.md, lessons budget
npm run test:hooks         # dry-run tests of the agent PreToolUse hook (.claude/hooks/)
npm run typecheck
npm run test:coverage      # unit tests, fails below 100% coverage
npm run build
npm run test:integration   # Testcontainers PostgreSQL (needs Docker)
npm run test:e2e           # after `npm run build`; needs Docker and agent-browser
npm run build-storybook    # design system Storybook (packages/app/stories/)
npm run test:storybook:themes  # stories as tests in Chromium, a11y as errors, light and dark
```

Process documents: `SDLC.md` (ticket flow and labels), `CODE_REVIEW.md` (review rules), `BACKWARD_COMPATIBILITY.md` (protected contracts), `.ai/agentic.config.json` (pipeline configuration).

## Repository structure

- Each package's source lives in `packages/<name>/`. The root holds only shared tooling and configuration (`package.json`, `eslint.config.mjs`, `vitest.config.mts`, `docker-compose.yml`, `.env.example`, `test/`, `scripts/`). Shared code goes into a package and is imported, not copied. One `.env` for the repo lives at the root.
- `.ai/` holds the project metadata: `.ai/specs/` (named `YYYY-MM-DD-slug.md`; finished ones in `.ai/specs/implemented/`, obsolete ones in `.ai/specs/archive/`), `.ai/runs/` (autonomous run logs), `.ai/lessons.md` (index) and `.ai/lessons/` (detail files). Do not store specs, run logs or lessons anywhere else. Dates use `YYYY-MM-DD`.
- `.ai/cezar/` belongs to Cezar. Commit only its workflows and skills; never edit its runtime files by hand.

## Working principles

1. Plan before building: a spec in `.ai/specs/` or plan mode. If something goes sideways, stop and re-plan.
2. Verify, don't assume: run tests, lint and build, or compare behaviour against `main`.
3. Prefer the elegant solution: scrap a hacky fix instead of stacking patches.
4. Learn from every correction: write the rule into `.ai/lessons.md` (or into this file for a project-wide rule). Keep these files short and pruned.
5. Automate repetition: turn a repeated task into a script under `.ai/scripts/` or a skill.

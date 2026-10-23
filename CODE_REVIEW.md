# Code Review

Review rules for this repository. `om-code-review` (and so `om-auto-review-pr`) applies this file automatically, on top of its built-in checklist. Edit it as the project grows.

## Validation gate

Every PR must pass, in order (see `.ai/agentic.config.json`):

```bash
npm run lint
npm run format:check
npm run test:hooks         # dry-run tests of the agent PreToolUse hook
npm run typecheck
npm run test:coverage      # unit tests, fails below 100% coverage
npm run build
npm run test:integration   # Testcontainers PostgreSQL (needs Docker)
npm run test:e2e           # after `npm run build`; needs Docker and agent-browser
```

A red gate (or a red CI check) is a blocker, whatever the review says.

- New or changed code without unit tests that keep coverage at 100% is a **High** finding. So is a new coverage exclusion, `/* v8 ignore */` comment or lowered threshold without a written reason and the user's approval.
- A new page or user flow without an e2e test is a **High** finding.

## Review priorities

1. **Correctness.** Does the change do what the spec or issue asks? Check edge cases, error paths, and loading and empty states.
2. **Security.** Never commit secrets or `.env*` files. Validate input on the server. Do not expose server-only data or secrets to client components.
3. **Contracts.** Changes to protected surfaces follow `BACKWARD_COMPATIBILITY.md`.
4. **Structure.** The repo is a monorepo. New source code goes in `packages/<name>/`, never at the root (see `AGENTS.md`).
5. **Quality.** Keep it readable, avoid duplication, and match existing conventions.

## Repo-specific checks

Apply the full checklist in [`ENGINEERING_STANDARDS.md` §13](ENGINEERING_STANDARDS.md#13-code-review-checklist) (architecture, security and correctness, AI-specific, verification). The points below are the repo-specific additions.

### Conventions and boundaries

- Naming and layout follow `ENGINEERING_STANDARDS.md` §1 and "Repository decisions" (`*.entity.ts`, `*.use-case.ts` / `*.service.ts`, `*.schema.ts`, `*.port.ts`, adapters under `adapters/`, pages export `<Segment>Page`).
- Package boundaries are enforced by ESLint `no-restricted-imports`. Loosening those rules (or adding an `eslint-disable` for them) is a **High** finding unless the spec approves it.
- Route handlers use `apiHandler`, `parseRequestBody` and the `ApiResult` envelope; errors from use cases are `AppError` subclasses. Server code logs through `logger`, not `console.*`.

### Next.js 16 (App Router)

- This Next.js version has breaking changes compared with older releases. The code must follow the docs in `node_modules/next/dist/docs/`, not APIs from older versions. Flag deprecated APIs.
- `cacheComponents` and `partialPrefetching` are enabled in `next.config.ts`. Check that caching and dynamic data are declared deliberately, and that dynamic APIs are not called by accident inside cached scopes.
- Default to Server Components. Add `"use client"` only when a component needs state, effects or browser APIs, and keep client boundaries as low in the tree as possible.
- Use `next/image`, `next/link` and `next/font` instead of raw `<img>`, `<a>` for internal links, or external font `<link>` tags.
- Route files (`page.tsx`, `layout.tsx`, `route.ts`, …) follow App Router naming conventions.

### TypeScript

- `strict` is on. Flag `any`, non-null assertions (`!`) and `@ts-ignore` unless a comment justifies them.
- Use the `@/*` path alias for imports from the project root.

### Styling

- Style with Tailwind CSS v4 utility classes. Global styles stay in `packages/app/src/app/globals.css`. Do not add new CSS frameworks without a spec.

### Dependencies

- Every new dependency needs a reason in the PR description. Prefer what is already installed.
- Commit `package-lock.json` changes together with the `package.json` change.

### Process

- Feature work references a spec in `.ai/specs/`. Autonomous runs leave a log in `.ai/runs/`.
- Lessons from bug fixes go into `.ai/lessons.md`.
- Behaviour changes need tests: unit (`*.test.ts`) for rules and use cases, integration (`*.int.test.ts`) for persistence and transactions. Schema changes need a migration.
- Dependencies are wired only in `packages/app/src/server/container.ts`, with deliberate lifetimes (no request-scoped EM in singletons).
- `packages/core` must not import Next.js, React, MikroORM, Awilix or other workspace packages (Zod is allowed).

## Severity guidance

| Severity | Meaning | Effect |
|---|---|---|
| **Critical** | Security hole, data loss, broken build or gate, breaking a protected contract without a migration path | Request changes |
| **High** | Incorrect behaviour, missing error handling on a real path, violating monorepo or Next.js rules | Request changes |
| **Medium** | Maintainability problems, duplication, weak typing, missing edge cases | Fix or file a follow-up issue |
| **Low / nit** | Naming, style, small cleanups | Optional; may become a follow-up |

# Code Review

Review rules for this repository. `om-code-review` (and so `om-auto-review-pr`) applies this file automatically, on top of its built-in checklist. Edit it as the project grows.

## Validation gate

Every PR must pass, in order (see `.ai/agentic.config.json`):

```bash
npm run lint
npx tsc --noEmit
npm run build
```

A red gate is a blocker, whatever the review says.

## Review priorities

1. **Correctness.** Does the change do what the spec or issue asks? Check edge cases, error paths, and loading and empty states.
2. **Security.** Never commit secrets or `.env*` files. Validate input on the server. Do not expose server-only data or secrets to client components.
3. **Contracts.** Changes to protected surfaces follow `BACKWARD_COMPATIBILITY.md`.
4. **Structure.** The repo is a monorepo. New source code goes in `packages/<name>/`, never at the root (see `AGENTS.md`).
5. **Quality.** Keep it readable, avoid duplication, and match existing conventions.

## Repo-specific checks

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

- Style with Tailwind CSS v4 utility classes. Global styles stay in `app/globals.css`. Do not add new CSS frameworks without a spec.

### Dependencies

- Every new dependency needs a reason in the PR description. Prefer what is already installed.
- Commit `package-lock.json` changes together with the `package.json` change.

### Process

- Feature work references a spec in `.ai/specs/`. Autonomous runs leave a log in `.ai/runs/`.
- Lessons from bug fixes go into `.ai/lessons.md`.
- TODO: tests. There is no test runner yet. Once one is added, require tests for new logic and add the test command to the validation gate.

## Severity guidance

| Severity | Meaning | Effect |
|---|---|---|
| **Critical** | Security hole, data loss, broken build or gate, breaking a protected contract without a migration path | Request changes |
| **High** | Incorrect behaviour, missing error handling on a real path, violating monorepo or Next.js rules | Request changes |
| **Medium** | Maintainability problems, duplication, weak typing, missing edge cases | Fix or file a follow-up issue |
| **Low / nit** | Naming, style, small cleanups | Optional; may become a follow-up |

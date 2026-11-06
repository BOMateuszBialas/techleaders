# Run: context engineering skills (lesson 10, phase 6, items 1-3)

- **Date:** 2026-11-06
- **Branch:** `docs/context-engineering-skills` (from `main` at 353ae1d)
- **Goal:** add the skills `eliminate-no-op` and `task-router`, apply `eliminate-no-op` to the agent instructions, keep root `AGENTS.md` a router under 12 KB, keep `npm run check:agents` green.
- **Continues:** `.ai/runs/2026-10-26-context-engineering.md`. That run did the routing and package files by hand, because the two skills did not exist then. This run does not redo them.
- **Risk:** high for `AGENTS.md` (CODEOWNERS path, maintainer-owned). The owner reviews and merges.

## 1. Skills

- `.ai/skills/eliminate-no-op/SKILL.md`: procedure (inventory, five tests in order: enforced by a mechanism, derivable from config, duplicated in an always-read file, stale, otherwise keep), protected content, gotchas, output format.
- `.ai/skills/task-router/SKILL.md`: procedure (discover, split, move only into real targets, routing table, check, log), budgets, gotchas, output format.
- Both follow the skill-authoring guide: `name` equals the directory, the description says when to use the skill and where its boundary with the other skill lies, and the body is short.

## 2. Measurement (bytes, `wc -c`)

| File | Before | After | Change |
|---|---:|---:|---:|
| `AGENTS.md` (root router) | 11 840 | 11 773 | -67 (budget 12 288) |
| `ENGINEERING_STANDARDS.md` | 27 609 | 26 859 | -750 |
| `SDLC.md` | 23 148 | 23 096 | -52 |

Line counts from `git diff --numstat`: `AGENTS.md` 2 lines rewritten, `ENGINEERING_STANDARDS.md` 13 deleted and 3 added, `SDLC.md` 1 rewritten.

## 3. eliminate-no-op: lines removed or changed, with the reason

| File | Line (short quote) | Test | Evidence |
|---|---|---|---|
| `ENGINEERING_STANDARDS.md` §3 | "A product page must not execute a raw MikroORM query. An order service must not construct a `NextResponse`." | 1, enforced | `eslint.config.mjs`: `packages/app/src/**` restricts `@mikro-orm/*` outside `container.ts`; `packages/core/src/**` restricts `next` |
| `ENGINEERING_STANDARDS.md` §2 | "Create a concept folder only when its first real file is needed; do not pre-create empty directories." (the examples stay, now introduced by "Examples of concept folders:") | 3, duplicated | root `AGENTS.md`: "Add layers and folders only when they hold real code." |
| `ENGINEERING_STANDARDS.md` §10 | "Use strict TypeScript. Avoid `any`; narrow `unknown` at runtime instead of disabling type checks." | 1, enforced | `packages/config/tsconfig.base.json` `strict: true`; `eslint.config.mjs` `@typescript-eslint/no-explicit-any: error`; root `AGENTS.md` rule 6 |
| `ENGINEERING_STANDARDS.md` §11 | "A behavior change should include a test for the new behavior. A bug fix should include a regression test that would fail before the fix." | 3, duplicated | root `AGENTS.md` Testing: "A behaviour change ships with tests; a bug fix ships with a regression test..." |
| `ENGINEERING_STANDARDS.md` §12 | "TypeScript type-check passes.", "Lint passes.", "Relevant tests pass." merged into one line: "The validation gate passes (`SDLC.md`, Validation gate)." | 3, duplicated | `SDLC.md` Validation gate list; `.ai/agentic.config.json` |
| `ENGINEERING_STANDARDS.md` §13 | "Package dependency direction is respected." | 1, enforced | `eslint.config.mjs` `no-restricted-imports` per package |
| `ENGINEERING_STANDARDS.md` §13 | "Core business logic does not import Next.js or React." | 1, enforced | `eslint.config.mjs`, `packages/core/src/**` FRAMEWORK pattern |
| `ENGINEERING_STANDARDS.md` §13 | "Pages and components do not issue raw ORM queries." | 1, enforced | `eslint.config.mjs`, `packages/app/src/**` (container only) |
| `ENGINEERING_STANDARDS.md` §13 | "Lint, type-check, relevant tests, and build pass." | 3, duplicated | `SDLC.md` Validation gate |
| `ENGINEERING_STANDARDS.md` §14 | step 11, "Report changed files, key decisions, commands run, results, and known gaps." | 3, duplicated | root `AGENTS.md` Agent rule 8 |
| `SDLC.md` Ticket/Validation section | "Any non-zero exit fails the gate and blocks the PR." | 3, duplicated | root `AGENTS.md` Agent rule 7; CI jobs in `.github/workflows/ci.yml` |
| `AGENTS.md` stack line | Versions in prose: Node.js 22.17, Next.js 16.4, React 19.3, TypeScript 5.9, PostgreSQL 17, MikroORM 7, Awilix 13, Zod 4, Vitest 5, ESLint 9, Prettier 3, Better Auth `~1.7.10` | 4, stale | `package.json` (`engines.node >=22.17.0`, `eslint ^10.14.0`), `packages/app/package.json` (`next 16.4.3`, `better-auth ~1.7.14`). Two stale values found: ESLint 9 (repo has 10) and Better Auth `~1.7.10` (repo has `~1.7.14`). Versions now point to `package.json`. |
| `AGENTS.md` Testing | "Unit tests are `*.test.ts` ..., integration tests `*.int.test.ts` ..., e2e tests `packages/app/e2e/**/*.e2e.test.ts`." | 2, derivable | `vitest.config.mts` include globs (`*.test.ts`, `*.int.test.ts`, `*.e2e.test.ts`). The sentence now says the suffixes are set in `vitest.config.mts`. |

Totals: 16 lines deleted and 6 added across the three files (net -10 lines), plus the version figures removed from the stack line.

## 4. Kept on purpose (candidates not removed)

- **Not verifiable, generic:** "Prefer the elegant solution" and "Verify, don't assume" (working principles); "Remove dead code, commented-out code, and debug console.log" (ENGINEERING_STANDARDS §10). No mechanism checks them.
- **Partly enforced, but it protects something:** the `.env` deny rule and the secrets lines in ENGINEERING_STANDARDS §8. The settings deny covers reads only; the written rule also covers commits and logs. The fail-fast env validation (§8) stays because the rule covers every new variable, not only the Zod file.
- **Sync rules, not duplicates:** the validation gate appears in both root `AGENTS.md` and `SDLC.md` on purpose. `SDLC.md` says to change both together with `.ai/agentic.config.json`.
- **Pointers and structure:** the Roles and Ticket lifecycle sections in `SDLC.md` are descriptive, but they name the skills and human sign-offs the process depends on.
- **Protected:** the Next.js generated block, the product-decisions block (`discovery:start` / `discovery:end`), the Admin and Accounts guard rules, the stock writers, the QA gate, the 100% coverage rule.

## 5. task-router

- Root `AGENTS.md` was already a router after the 2026-10-26 run (11 840 B). Checked against the skill procedure: the routing table, the package pointers and the validation list are in the root, and the package detail is in `packages/core|database|ai|app/AGENTS.md`. Nothing new moved: no protected rule is left only in the root that has a target, and no package file lacks one.
- The only router change is the stack and testing lines above (-67 bytes).
- Possible next move, not done: the root "Agent guardrails" paragraph could move to `.ai/security-notes.md`. That is not a package file, and the guardrail summary has to stay where every session reads it. Left for the owner.

## 6. Checks

- `npm run check:agents`: ok (5 agent files checked), run after the root was edited.
- `npx prettier --check` on `AGENTS.md`, `ENGINEERING_STANDARDS.md`, `SDLC.md` and both new `SKILL.md` files: all files use Prettier code style.
- `npm run lint`: 0 errors, 6 warnings. The warnings are in `packages/app/src/components/storefront/*` and were already there; no changed file has a warning.
- Environment note: the worktree had no `node_modules`. A directory junction to the main checkout's `node_modules` was created in the worktree (git-ignored, not committed). Without it, `check:agents` reports the Next.js generated-block paths as missing.
- Not run: `npm run test:hooks`, `typecheck`, `test:coverage`, `build` and the integration and e2e suites. The change touches Markdown only, and `check:agents` has its own unit tests (25, unchanged). CI runs the full gate.

## 7. Lessons

No new lesson written. `.ai/lessons.md` is at its 100-line budget and is not edited in this run, per the task. The stale-version finding is recorded in the `eliminate-no-op` gotchas instead.

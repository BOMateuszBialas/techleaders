---
name: om-code-review
description: CommerceOS extension of the built-in om-code-review skill. Adds the checks that are specific to this repository (package boundaries, admin and customer guards, design tokens, Copilot trust rules, coverage) on top of the built-in checklist.
---

# om-code-review: CommerceOS extension

This file is a repo-local extension (`.ai/skills/om-code-review/SKILL.md`). The built-in skill applies it in addition to its own checklist. It never replaces the built-in safety and quality rules, and it never relaxes them. Where the repo's rules and the built-in rules disagree, the stricter rule applies.

Read these first, in this order: `AGENTS.md` (router), `CODE_REVIEW.md` (validation gate and severities), `BACKWARD_COMPATIBILITY.md` (protected contracts).

## 1. Package boundaries

- `packages/core` is pure TypeScript. It imports nothing from `app`, `database`, `ai` or Next.js. ESLint `no-restricted-imports` enforces this; a disabled rule is a **Blocker**.
- Business rules and use cases live in `core`. A rule found in a React component, a server action or a route handler is a **High** finding.
- Adapters that implement `core` ports live in `packages/database` (or `packages/ai` for the LLM). A new package needs the maintainer's approval (**High** if it appears without one).

## 2. Access control (protected surfaces)

- Every admin entry point is guarded by `packages/app/src/server/auth/require-admin.ts`. An admin page, action or route without it is a **Blocker**.
- Every customer entry point is guarded by `packages/app/src/server/customer-auth/require-customer.ts`. A customer page, action or route without it is a **Blocker**.
- The customer id and any order ownership check come from the session and from `packages/core/src/domain/orders/order-access.ts`, never from a URL parameter or a request body (`.ai/security-notes.md` §10). A customer path that reads another customer's order is a **Blocker**.
- A customer must not reach admin surfaces, and an owner must not see data a rule says they cannot see. Any change to these rules needs an integration or e2e test that uses two accounts (A and B), not only the owner session.

## 3. Schema and migrations

- New or changed entities use `defineEntity`, are registered in `packages/database/src/entities/index.ts`, and come with a migration and an integration test (`*.int.test.ts`). A missing migration or test is **High**.
- A change to a stored or public contract is checked against `BACKWARD_COMPATIBILITY.md` before the review passes.

## 4. UI and the design system

- New markup starts from `packages/app/src/components/ui`. A raw element where a primitive exists is a **Medium** finding; a new visual pattern without a Storybook story is **Medium**.
- Colours, radii, spacing and other visual values come from the semantic tokens in `globals.css`. `npm run check:tokens` must be green; a red gate is a **Blocker**.
- A new page or user flow has an e2e test (`packages/app/e2e/**/*.e2e.test.ts`). Without one it is **High**.
- Responsive behaviour: no horizontal page scroll at 320 px, and a readable layout at 390 px. Check the design direction in `.ai/design/tokeny.md` for new screens.

## 5. Commerce Copilot (trust rules)

- The model never changes prices, publishes products, issues refunds or modifies orders. Any code path that lets the model do one of these is a **Blocker**.
- Model output is validated against its schema before it is shown or stored. Missing validation is **High**.
- Every claim in an answer is grounded in store data that is shown with it (evidence, period, source). An answer that can show a figure without its source is **High**.
- A fallback path exists for an unavailable or rate-limited model, and it is visibly labelled. A fallback that looks like a model answer is **High**.
- A change to prompts, tools or output schemas comes with eval cases in `packages/ai`.

## 6. Tests and coverage

- The unit coverage gate is 100%. New code without unit tests is **High**. A new coverage exclusion, a `v8 ignore` comment or a lowered threshold needs a written reason and the maintainer's approval (`vitest.config.mts`); without them it is **Blocker**.
- A behaviour change ships with tests. A bug fix ships with a regression test that fails before the fix (`CODE_REVIEW.md`).

## 7. Specs and process

- A feature PR points to its spec in `.ai/specs/`. A feature with no spec is **Medium**.
- Changes to agent configuration (`.claude/`, `.agents/`, `.mcp.json`, `.github/workflows/`) belong to the maintainer (`.github/CODEOWNERS`). Flag them as a **High** finding for the maintainer, even when they are correct.
- Do not weaken a deny rule or the PreToolUse hook without approval (**Blocker**).

## Verdict

The verdict rules of the built-in skill apply. A red validation gate or a Blocker means **request changes**. A High finding without a clear fix means **request changes** too. Medium and Low findings alone can be approved, with the findings listed.

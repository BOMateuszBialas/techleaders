# Scheduled maintenance workflow (2026-11-19)

Status: implemented (PR open). Owner: maintainer (`@BOMateuszBialas`). Source: course lessons 13 and 25 ("ustaw jedną automatyzację", cotygodniowy harmonogram). Scope: one new GitHub Actions workflow. No app, package or gate change.

## Problem

Every PR and every push to `main` runs the full CI gate (`.github/workflows/ci.yml`). Nothing runs when the repo is quiet. Dependency advisories are published between PRs, so a clean `main` can become vulnerable with no signal. The MVP spec records "npm audit without high" (PR #147), but nothing re-checks it.

## Decision

A weekly scheduled workflow with one job: `npm audit`, split by scope.

| Check | Scope | Result |
|---|---|---|
| `npm audit --omit=dev --audit-level=high` | Runtime dependencies (shipped code) | **Fails the run** on any high or critical advisory |
| `npm audit --audit-level=high` | Full tree, including dev and deploy tooling | **Warning only** (annotation), never fails |

Why the split: on 2026-11-19 the runtime tree has 0 high findings (4 moderate). All 11 high findings are in dev and deploy tooling (Prisma CLI and its dependencies, hono, undici, lodash, chevrotain). They do not reach users, but they need an owner decision, not a silent red build.

Not added: a second copy of the test gate. Lint, unit coverage, typecheck, build, integration and e2e already run on every push to `main` and on every PR. A weekly re-run would use CI minutes and find nothing new, because the lockfile is pinned.

## Schedule

- `cron: "0 4 * * 0"` (Sunday 04:00 UTC), the cadence the course suggests.
- `workflow_dispatch` so the owner can run it by hand.
- GitHub emails the repository owner when a scheduled run fails. No issue is opened automatically.

## Files

- `.github/workflows/scheduled-maintenance.yml` (new; owned by `@BOMateuszBialas` per `.github/CODEOWNERS`).
- This spec.

## Out of scope

- The Cezar `weekly-maintenance` agent workflow from lesson 25. It needs the Cezar runtime and an agent model; the runtime files stay untouched.
- Fixing the dev-tooling advisories. They appeared with the Prisma Compute pin (#269). Upgrading `@prisma/composer-prisma-cloud` is a breaking change (`npm audit fix --force`), so it is an owner decision and goes in its own PR.

## Acceptance

- The YAML parses and both steps run locally with the same commands.
- Runtime audit passes today (0 high). Full-tree audit prints a warning and does not fail the job.
- Trigger check: `on.schedule` is present and `workflow_dispatch` is present.

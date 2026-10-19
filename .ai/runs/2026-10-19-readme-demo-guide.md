# Run: README and demo guide (polish lane)

- Date: 2026-10-19
- Branch / worktree: `docs/readme-demo-guide`, `.ai/tmp/om-auto-create-pr/docs-readme` (from `origin/main` 557d487)
- Mode: autonomous (resumed after an interruption; the README rewrite was found uncommitted in the worktree)

## Goal

Rewrite README.md for the finished P0: what the product is, quick start, a step-by-step demo (purchase → admin → Copilot), what is real and what is not, architecture, specs and process, and keep the reference sections (env, commands, tests, Copilot, payments, metric definitions, known limitations).

## Steps

1. Reviewed the interrupted draft against main.
2. Verified every claim in the new sections against the code: UI strings, seed data, routes, scripts, env vars, Copilot limits, links and anchors. Checked the metric table against `METRIC_DEFINITIONS`.
3. Fixed what verification found:
   - Only a failed check is retried; provider failures are not.
   - The order status label is "Paid".
   - Fictional traffic cites decisions D07 and D08.
   - Added `npm run admin:create` to the command table.
4. `prettier --check README.md` passes.

## Outcome

A docs-only PR. No code changed, so the code gate (typecheck, tests, build) was not run locally. CI runs the full gate.

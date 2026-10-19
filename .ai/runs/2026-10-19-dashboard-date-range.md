# Run: dashboard date-range comparison (P1)

- Date: 2026-10-19
- Engine: om-auto-create-pr (steps 8 ≤ threshold 20)
- Source doc: `.ai/specs/2026-10-19-dashboard-date-range-comparison.md` (spec PR #78, merged by the user)
- Branch: `feat/dashboard-date-range-comparison` (worktree `../wt-date-range`)

## Goal

The owner picks a date range on `/admin` and sees Orders placed, Paid orders, Revenue and AOV compared with the previous period of the same length (absolute and % change, honest zero / partial-data handling). The metrics come only from the existing use cases, and the Copilot is unchanged.

## Scope

`core` (period helpers, change rule, range validator, dashboard use case), `app` (dashboard page, loader, view, copy), e2e, README and `BACKWARD_COMPATIBILITY.md`. **Non-goals:** any `packages/ai` change (the Copilot's period parameter and the `percentChange` import are follow-ups), any new query, port method or migration, charts.

## Implementation Plan

Phase 1 follows the spec's steps 1–8.

## Risks

- Generic use-case types must keep the Copilot's inferred `MetricPeriod`. Checked by `npm run typecheck` and a type test.
- The spec PR must merge before this PR. The spec file is moved to `implemented/` here; after the spec PR is squash-merged, merging main re-adds `.ai/specs/2026-10-19-…`, which must be deleted again.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Date range and comparison on the dashboard

- [x] 1.1 Periods from days — 33cc305
- [x] 1.2 Change rule and definition — 18ab55f
- [x] 1.3 Range validation — b4f9a1a
- [x] 1.4 Use case — b3f8912, 2661c1d
- [x] 1.5 UI — 8abcf6e
- [x] 1.6 E2E — e268400
- [x] 1.7 Docs — (this commit)
- [x] 1.8 Full gate — lint, format, typecheck, 1613 unit tests at 100 % coverage, build, 144 integration, 94 e2e (all green on b1abbcb)

## Log

- Spec written with `om-spec-writing --autonomous` and reviewed by a fresh-context subagent. All 8 findings were applied: the today note, hiding the % on partial history, no `ai` change, the other-currency note, the type test, no new query, the `metric-value` test, and the split step. Spec PR #78 opened.
- Implementation: the core helpers make the metric use cases generic over the period type, so the Copilot still infers `MetricPeriod` (checked by an `expectTypeOf` test), and no file in `packages/ai` changed. The partial-history check reuses `GetOrderSummaryUseCase` over `[epoch, comparison start)`; no new query was added.
- Deviation: the form is a plain GET `<form>`, not `next/form`. This is recorded in the spec's implementation notes.
- An e2e run found that agent-browser `fill` cannot set a date input. The value is now set with `evaluate`; see the lesson.
- Integration test: on the hand-built fixture, a custom range of 11–17 Oct is compared with 4–10 Oct, with orders exactly on the boundary, and history is partial for 4–10 Oct.

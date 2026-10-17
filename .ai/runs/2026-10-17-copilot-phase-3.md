# Run: Commerce Copilot Phase 3 (traffic questions, #28)

- Date: 2026-10-17
- Agent: autonomous (`om-auto-implement-spec` / `om-auto-create-pr-loop` discipline), user away
- Source spec: `.ai/specs/2026-10-17-commerce-copilot.md` (approved), Phase 3, steps 12–15
- Branch: `feat/copilot-phase-3-traffic` from `origin/main` (`15a27a1`), worktree `.ai/tmp/om-auto-create-pr/copilot-p3`
- Issue: closes #28 (E05-S04)
- Parallel work: Phase 2 (Gemini LLM answers) on `feat/copilot-phase-2-llm`. Shared files (`ask-copilot.use-case.ts`, `container.ts`) get minimal, focused edits; no LLM provider, no `LLM_*` env.

## Goal

The three traffic questions ("Where does my traffic come from?", "Where in the funnel do visitors drop off?", "Which products get views but few sales?") get grounded rule-based answers from the seeded, fictional demo traffic tables, every traffic figure flagged and labelled as demo data. The primary question adds the traffic summary (A21). Conversion by source stays declined. Storefront visits write nothing.

## Scope

- `core`: `TrafficStatsPort`, `GetTrafficSummaryUseCase`, calendar days of a metric period, four demo metric definitions.
- `database`: `DatabaseTrafficStats` adapter (aggregate SQL over `traffic_daily_stats` and `product_view_daily_stats`), unit and integration tests.
- `ai`: `getTrafficSummary` tool, traffic plans for the three intents and `focus`, derived traffic facts, rules 4–6, server-attached demo limitation.
- `app`: container registrations, advisory text, summary evidence in the answer view, e2e.
- Docs: README, `BACKWARD_COMPATIBILITY.md`, spec status.

## Non-goals

- Phase 2 (provider, prompt, model-output schema, grounding rewrite, evals dir), Phase 4 (persistence).
- No schema change, no seed change, no tracking of storefront visits.

## Steps

12. Port, adapter, integration.
13. Use case and definitions.
14. Tool, intents, rules.
15. E2E and docs, full gate.

## Decisions (judgment calls)

Recorded while implementing; see the PR body for the final list.

## Progress

- [x] 12 Port, adapter, unit and integration tests
- [x] 13 GetTrafficSummaryUseCase, periodCalendarDays, demo metric definitions
- [x] 14 getTrafficSummary tool, traffic plans, facts, rules 4–6, summaries, demo labels, summary evidence
- [ ] 15

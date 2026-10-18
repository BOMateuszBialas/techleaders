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

- **Use case input:** `GetTrafficSummaryUseCase` takes the resolved `MetricPeriod` (as every E04 use case does), so all tools of one answer cover the same instants; the tables are filtered by its local calendar days (`periodCalendarDays`, DST-tested).
- **Store view-to-purchase rate** (all units in paid orders ÷ all demo product views) is an additive result field: rule 5 needs a baseline, and the spec's "half the store's" left it undefined. `null` when the units ranking (limit 50) is full.
- **Definitions:** the four demo definitions are in `METRIC_DEFINITIONS` under `DEMO_TRAFFIC_METRIC_IDS`, apart from the dashboard's `METRIC_IDS` (the dashboard tests iterate those and print each one).
- **Published products only** in the per-product views and in the "without view data" count: a draft or archived product is not something to act on.
- **Plans:** the three traffic intents read 10 products, `focus` 5 (spec). "Views without sales" also runs `getLowStockProducts` (rule 4 needs the stock). `ToolPlan.topProducts` became optional; `plan` is never `null` now.
- **Summary evidence:** "Where does my traffic come from?" matches no rule, so the spec's e2e ("evidence rows carry Fictional demo data") needed the summary's figures on the page. `summaryEvidence` (additive DTO field) expands `summaryFactIds` like recommendation evidence and is shown for every answered question under "Figures in this summary". It also serves a Phase 2 model answer unchanged.
- **Limitations:** A21's "No traffic or conversion data is available yet" is gone (focus reads traffic). Every answer that read traffic gets the demo-data limitation; "No demo traffic data covers this period" when there are no rows; "N published products have no demo view data" for focus and views-without-sales.
- **Rule dedupe:** rule 4 skips a best seller (rule 1 covers it); rule 5 skips an out-of-stock product (rule 4 covers it). Products are evaluated in views order.
- **No eval directory:** Phase 2 creates `packages/ai/src/evals/`; to avoid a merge conflict, the step-14 properties (traffic answer flagged demo, conversion by source declined, no rate without view data) are unit tests in `traffic-insights.test.ts` and `ask-copilot.use-case.test.ts`. Phase 2 can lift them into eval cases.
- **Shared files** (`ask-copilot.use-case.ts`, `container.ts`): one new dep and tool call, `plan: null` branch removed, `summaryEvidence` passed through; container gets three registrations. No LLM code or env.

## Progress

- [x] 12 Port, adapter, unit and integration tests
- [x] 13 GetTrafficSummaryUseCase, periodCalendarDays, demo metric definitions
- [x] 14 getTrafficSummary tool, traffic plans, facts, rules 4–6, summaries, demo labels, summary evidence
- [x] 15 E2E (`admin-copilot-traffic.e2e.test.ts`), README, BACKWARD_COMPATIBILITY, spec notes
- [x] Merged `origin/main` (`0db6704`, #58) cleanly

## Validation (full gate, 2026-10-17, after merging origin/main)

- `npm run lint` ✓
- `npm run format:check` ✓
- `npm run typecheck` ✓
- `npm run test:coverage` ✓ 1195 tests, 100% statements, branches, functions, lines
- `npm run build` ✓
- `npm run test:integration` ✓ 14 files, 113 tests
- `npm run test:e2e` ✓ 14 files, 77 tests

## Merge with Phase 2 (`60a208a`, #64), 2026-10-18

Conflicts in `ask-copilot.use-case.ts`, its unit test and `ask-copilot.int.test.ts`, resolved keeping both phases:

- `AskCopilotDeps` has both `getTrafficSummaryTool` and `llmProvider`; the answer takes `origin`, `fallbackReason` and `model` from the generation and keeps `summaryEvidence` from `expandDraft`. Phase 2's "traffic not available" branch is gone (every intent has a plan now).
- Traffic facts reach the LLM path through the shared fact table (`demo: true` is serialized). The system prompt gains rule 10 (demo facts are fictional demo traffic, say so, never present them as real shopper behaviour); `COPILOT_PROMPT_VERSION` → `copilot-2026-10-18.2`. Demo labels and the demo limitation stay server-attached, so they hold for model answers too.
- `summaryEvidence` is still never accepted from model output (#63): the model-output schema test passes unchanged.
- Evals: fake demo traffic per eval store (`evalTraffic`), a `demo_labels` property and the `traffic-demo-labels` case (`trafficReply`): a grounded funnel answer whose evidence is all flagged demo and that carries the demo limitation. The integration test runs both the funnel answer and the scripted-model answer.

Gate after the merge: lint ✓, format:check ✓, typecheck ✓, test:coverage ✓ (1290 tests, 100%), build ✓, test:integration ✓ (14 files, 114 tests), test:e2e ✓ (15 files, 78 tests).

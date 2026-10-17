# Run: Commerce Copilot Phase 1 (rule-based, no LLM provider)

- Date: 2026-10-17
- Agent: lane D, autonomous (`om-auto-create-pr`), user away
- Source doc: `.ai/specs/2026-10-17-commerce-copilot.md` on draft spec PR #52 (branch `spec/commerce-copilot`, not on `main`; not copied into this PR)
- Branch: `feat/copilot-phase-1-rule-based` from `origin/main` (`1058c13`)
- Issues: part of #25 and #27 (Phase 2 closes them)
- Engine: om-auto-create-pr (steps: 6, --loop: no)

## Goal

A signed-in owner opens `/admin/copilot`, asks one of the D09 questions (button or free text) and gets a grounded, rule-based answer: a summary plus at most 3 prioritized recommendations whose evidence comes from the E04 metric use cases. Declined and unsupported questions get a deterministic answer. No LLM provider, no provider SDK, no `LLM_*` env variable, no network call.

## Scope

- `core`: `previousPeriod`, `TooManyRequestsError` (`RATE_LIMITED`, 429), Copilot intent ids and the ask-request schema.
- `ai`: intents and routing, the four approved tools, facts, rule insights, response expansion, log port, `AskCopilotUseCase`; response schema narrowed to 3 recommendations, evidence gains `demo`.
- `app`: container registrations, `POST /api/admin/copilot/answers`, `/admin/copilot` page with hook-free views and a thin client wrapper, nav link, guard inventory, e2e, integration test.
- Docs: README, `BACKWARD_COMPATIBILITY.md` §1–2, AGENTS.md pointer if needed.

## Non-goals

- Phase 2 (provider, adapter, prompt, model-output schema, grounding rewrite, evals), Phase 3 (traffic), Phase 4 (persistence and status actions).
- No change to E04 metric use cases or definitions.
- No touching lane A files (orders admin, demo seed, traffic tables) beyond shared registration points.

## Implementation Plan

### Phase 1: Rule-based Copilot

1. Reconcile with E04; `previousPeriod` with DST tests; `RATE_LIMITED` error and 429.
2. Intents and routing.
3. Tools and facts.
4. Rule insights, expansion, narrowed response schema.
5. Use case, log port, container.
6. Route, page, nav, e2e, integration, docs, full gate.

## Risks

- E2E data: the E04 demo order history (lane A, Phase 2) is not on `main`, so the e2e test buys a low-stock product itself to make rule 1 fire deterministically instead of relying on the seeded Pulse scenario.
- Spec on PR #52 is unapproved; this PR must not merge before it.

## Decisions and reconciliation (judgment calls)

Recorded while implementing; see the PR body for the final list.

- **Resumed run.** The first agent stopped at a usage limit after step 1.3 (commits unpushed, step 1.4 uncommitted). A second agent kept the step 1.4 work in progress (sound), added its tests, fixed two plural slips in rule text, and continued from step 1.5. `origin/main` (orders admin #50) was merged in at that point without conflicts.
- **No `llmProvider` dependency in Phase 1.** `AskCopilotUseCase` has no generation path, so it does not take the provider at all; every answered question reports `fallbackReason: "not_configured"` by construction (no adapter exists, the container still wires `UnconfiguredLlmProvider`). Phase 2 adds the dependency together with the call.
- **`ToolPlan.topProducts` is required** (every answered plan names best sellers) and `compareWithPrevious` carries its own `topProducts` limit, which removes unreachable branches.
- **Traffic intents** (`traffic_sources`, `funnel`, `views_without_sales`) are `kind: "answered"` with the deterministic "Traffic data is not available yet" summary, no tools, no period.
- **DTO additions over the spec** (additive, documented in `BACKWARD_COMPATIBILITY.md` §2): `question` (the canonical D09 question the answer is for), top-level `limitations`, `period.name`, and `relatedProducts` (id + name for the admin links) on each recommendation.
- **Rule text grounding** is tested by construction: after removing every cited fact's value and metric name and the period text, no digit may remain (`rule-insights.test.ts`).
- **The panel uses `useActionState` over a browser-side action** (`createAskCopilotAction`, unit-tested with a stubbed `fetch`) that calls the JSON route, so the form follows the hook-free view + thin wrapper pattern. No character counter (it would need extra client state); the textarea has `maxLength` 500 and a hint.
- **E2E data.** The seed has no order history and other suites rely on Pulse's 3 units, so the e2e test buys one Arena Fight Stick (2 in stock, used by no other suite for stock) and confirms its demo payment; rule 1 then flags it. The integration test (`packages/app/src/server/copilot/ask-copilot.int.test.ts`) runs the real container on PostgreSQL with a fixed clock and two hand-inserted paid orders, and compares every shown value to the E04 use cases.
- **Provider wording.** The product owner chose the Gemini API (spec PR #52, 8baf9c1) after this run started; Phase 1 docs and copy name no provider.

## Validation (full gate, 2026-10-17, after merging origin/main)

- `npm run lint` ✓ (after fixing one `consistent-type-imports` error in the integration test)
- `npm run format:check` ✓
- `npm run typecheck` ✓
- `npm run test:coverage` ✓ 1106 tests, 100% statements, branches, functions, lines
- `npm run build` ✓ (`/admin/copilot` partial prerender, `/api/admin/copilot/answers` dynamic)
- `npm run test:integration` ✓ 12 files, 94 tests
- `npm run test:e2e` ✓ 13 files, 71 tests

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Rule-based Copilot

- [x] 1.1 Reconcile with E04, previousPeriod, RATE_LIMITED — 2481bee
- [x] 1.2 Intents and routing — 35b235b
- [x] 1.3 Tools and facts — 4886460
- [x] 1.4 Rule insights and expansion — 199d55a
- [x] 1.5 Use case, log port, container — 8122926
- [x] 1.6 Route, page, e2e, integration, docs — 35ceee8

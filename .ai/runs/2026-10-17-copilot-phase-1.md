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

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Rule-based Copilot

- [ ] 1.1 Reconcile with E04, previousPeriod, RATE_LIMITED
- [ ] 1.2 Intents and routing
- [ ] 1.3 Tools and facts
- [ ] 1.4 Rule insights and expansion
- [ ] 1.5 Use case, log port, container
- [ ] 1.6 Route, page, e2e, integration, docs

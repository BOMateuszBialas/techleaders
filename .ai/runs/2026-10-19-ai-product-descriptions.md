# Run: AI-drafted product descriptions

- Date: 2026-10-19
- Source doc: `.ai/specs/2026-10-18-ai-product-descriptions.md` (merged in #69; A1–A3 confirmed by the owner with the merge)
- Engine: om-auto-implement-spec → om-auto-create-pr (steps: 11, --loop: no)
- Branches: `feat/ai-product-descriptions-phase-1` (PR 1, `risk-high`), `feat/ai-product-descriptions-phase-2` (PR 2, `risk-medium`)

## Goal

Implement the spec's two phases: a drafting service and protected route that return an LLM product description only when every number, feature, platform, brand and promise in it also appears in the owner's form fields (Phase 1), and the product form panel that previews the draft and copies it into the Description field without saving (Phase 2).

## Scope

- `core`: request schema `validators/products/description-draft.schema.ts`.
- `ai`: shared daily cap (`llm/llm-daily-cap.ts`), sources, glossary and text analysis (`descriptions/`), grounding (`grounding/find-description-issues.ts`), prompt, output schema, `DraftProductDescriptionUseCase`, eval cases.
- `app`: `POST /api/admin/products/description-drafts`, container registration, integration test; Phase 2: product form slot, panel view, client helpers, wrapper, page wiring, e2e.
- Docs: `BACKWARD_COMPATIBILITY.md` §2, README "AI drafts".

## Non-goals

No new env variables, no migration, no change to `LlmProviderPort` or the Gemini adapter, no tone or length options, no stored drafts, no live eval script.

## Risks

- Lexical grounding has false rejections; measured in the manual smoke test (at most ~10 real calls).
- The daily-cap move touches the Copilot; existing Copilot tests must pass unchanged.
- Phase 1 carries `risk-high`, so it waits for the owner's merge; Phase 2 is stacked on it.

## Implementation Plan

### Phase 1: Drafting service and route

1. Shared daily cap module; Copilot imports it.
2. Request schema in core.
3. Sources, glossary and text analysis.
4. Grounding rules (`findDescriptionIssues`).
5. Prompt and output schema.
6. `DraftProductDescriptionUseCase`.
7. Eval cases.
8. Route, container, integration test, docs.

### Phase 2: Product form panel

9. Views and client helpers.
10. Page wiring.
11. E2E, manual smoke test, docs, spec moved to `implemented/`.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Drafting service and route

- [ ] 1.1 Shared daily cap module
- [ ] 1.2 Request schema
- [ ] 1.3 Sources, glossary and text analysis
- [ ] 1.4 Grounding rules
- [ ] 1.5 Prompt and output schema
- [ ] 1.6 Use case
- [ ] 1.7 Eval cases
- [ ] 1.8 Route, container, integration test, docs

### Phase 2: Product form panel

- [ ] 2.1 Views and client helpers
- [ ] 2.2 Page wiring
- [ ] 2.3 E2E, smoke test, docs, spec moved

## Decisions and log

(appended during the run)

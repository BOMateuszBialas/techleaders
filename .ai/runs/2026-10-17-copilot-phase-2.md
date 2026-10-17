# Run: Commerce Copilot Phase 2 (LLM answers, Gemini)

- Date: 2026-10-17
- Agent: autonomous (`om-auto-implement-spec` / `om-auto-create-pr-loop` discipline), user away
- Spec: `.ai/specs/2026-10-17-commerce-copilot.md` (approved; A1–A4 confirmed by the product owner), Phase 2, steps 7–11
- Branch: `feat/copilot-phase-2-llm` from `origin/main` (`15a27a1`, Phase 1 merged as #54); worktree `.ai/tmp/om-auto-create-pr/copilot-p2`
- Issues: closes #25 and #27
- Parallel work: Phase 3 (traffic, #28) runs on `feat/copilot-phase-3-traffic` in another worktree; changes to `ask-copilot.use-case.ts` are kept small (the generation path lives in its own module) to ease that merge.

## Goal

When `LLM_PROVIDER=gemini` with `LLM_API_KEY` and `LLM_MODEL` is set, an answered question gets one structured-output Gemini call (at most two attempts) that writes the answer from the numbered fact table; the server accepts it only when every number, product and piece of evidence traces back to the facts each recommendation cites. Otherwise, and on any provider failure, the Phase 1 rule-based answer is shown with the reason. No real provider call in any automated test.

## Implementation Plan (spec steps)

| Step | Content | Status |
| ---- | ------- | ------ |
| 7 | Env (`LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`), `.env.example`, `BACKWARD_COMPATIBILITY.md` §4, e2e global setup blanks `LLM_*` | todo |
| 8 | `@google/genai` in `packages/ai`, `GeminiLlmProvider` (injected client, JSON schema, timeout and abort, no SDK retries, error reasons, finish reasons, usage), port additions, ESLint import restriction, container selects the adapter | todo |
| 9 | Model output schema, versioned system prompt, rewritten `findGroundingIssues` | todo |
| 10 | Generation path in `AskCopilotUseCase`: attempts, deadline, daily cap, retry with problem codes, fallback reasons, log keys | todo |
| 11 | Eval cases (unit suite, scripted provider), integration (scripted answer on the seeded store → `origin: "llm"`), docs (AGENTS.md stack row, README), real-key smoke test, full gate | todo |

## Decisions (judgment calls)

Recorded as they are made.

## Progress

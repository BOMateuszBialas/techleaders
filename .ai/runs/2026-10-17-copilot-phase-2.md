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
| 7 | Env (`LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`), `.env.example`, `BACKWARD_COMPATIBILITY.md` §4, e2e global setup blanks `LLM_*` | done (`c99315e`) |
| 8 | `@google/genai` in `packages/ai`, `GeminiLlmProvider` (injected client, JSON schema, timeout and abort, no SDK retries, error reasons, finish reasons, usage), port additions, ESLint import restriction, container selects the adapter | done (`1e52075`) |
| 9 | Model output schema, versioned system prompt, rewritten `findGroundingIssues` | done (`fa441d0`) |
| 10 | Generation path in `AskCopilotUseCase`: attempts, deadline, daily cap, retry with problem codes, fallback reasons, log keys | done (`4f4a3a8`) |
| 11 | Eval cases (unit suite, scripted provider), integration (scripted answer on the seeded store → `origin: "llm"`), docs (AGENTS.md stack row, README), real-key smoke test, full gate | done |

## Decisions (judgment calls)

- **Model: `gemini-3-flash-preview`.** The key's model list still shows Gemini 2.5, but they are closed to new keys (found in the step 8 smoke test). `.env.example` and README name the 3 Flash preview; `LLM_MODEL` has no default in code (A2).
- **Thinking level LOW instead of a token budget.** Gemini 3 Flash thinks at a high level by default and missed the 20 s attempt timeout; `thinkingLevel: LOW` keeps an attempt at about 6–9 s and inside `maxOutputTokens`.
- **Prompt `copilot-2026-10-18.1`.** The smoke test showed the model citing a product's revenue in `reasoning` without citing that fact, and naming a product in the summary without one of its facts. Grounding rejected both (correctly); rules 3 and 4 now say how to fix them, and the retry message says "The summary" instead of "The answer" for summary issues. No grounding rule was relaxed.
- **Rate limiter cleanup reset the daily LLM cap (bug found by the step 11 integration test).** `DatabaseRateLimiter` deleted windows that started more than an hour ago whenever any key opened a new window, which included the running 24 h `copilot:llm:day` window, so the cap of 100 attempts per day never held. Cleanup now keeps a day, and a window longer than a day is refused. Regression tests in unit and integration.
- **Eval cases are data plus scripted replies** (`packages/ai/src/evals/cases/*.cases.ts`, `replies.ts`), exported from `@commerceos/ai/evals` for the integration test only. `run-evals.test.ts` asserts properties for every case: kind, origin, fallback reason, number of model calls, the displayed answer passes the response schema, absent fabricated or injected text, a fallback equals the rule-based answer exactly, no UUID in any prompt, related product ids are real.

## Progress

- 2026-10-17: steps 7–10 committed (one commit each).
- 2026-10-18 (resumed after a usage-limit stop): kept the step 11 WIP (eval set, scripted replies, thinking level, grounding regex escapes, integration case), sharpened the prompt, fixed the rate limiter cleanup, wrote the docs (AGENTS.md stack row, README "AI answers (Gemini)", `.env.example`).
- **Smoke test (real key, 8 calls in total: 1 model list + 7 generation attempts):** `focus` on the eval demo store with `gemini-3-flash-preview`. Prompt `copilot-2026-10-17.1`: two runs fell back with `invalid_output` (grounding caught uncited numbers in reasoning and a product named in the summary), one attempt got a provider error (`provider_error`, the preview model was busy). Prompt `copilot-2026-10-18.1`: the first attempt failed the number check, the retry passed: `origin: "llm"`, 3 grounded recommendations, 18 s. Fallbacks behaved as designed every time. The key was never printed or logged.

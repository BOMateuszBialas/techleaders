# packages/ai (`@commerceos/ai`): agent rules

Read the root `AGENTS.md` first (overview, Validation, agent rules). This file holds the rules for Commerce Copilot and the LLM port. The rules below are protected: do not weaken them.

## Role and boundaries

- Responsibility: Commerce Copilot: `LlmProviderPort` and adapters (`src/adapters/`), Copilot tools (`src/tools/`), prompts, Zod output schemas (`src/schemas/`), grounding checks (`src/grounding/`), eval utilities (`src/evals/`).
- May depend on `core` only. It never touches the database package, and never imports Next.js or React (ESLint enforces both).
- Only `GeminiLlmProvider` in `packages/ai/src/adapters/` imports the provider SDK (`@google/genai`).

## Copilot flow and tools

- Flow: auth → input validation and limits → deterministic intent routing or a bounded tool-calling loop → **approved tools only** (`getSalesSummary`, `getTopProducts`, `getLowStockProducts`, `getOrderSummary`, `getTrafficSummary`; the last reads seeded, fictional demo traffic data and its output is always labelled as such, see spec §6 and decision D08). No raw SQL or ORM access for the model.
- Enforce authorization on the server for every Copilot operation; hiding UI is not authorization.

## Output and grounding

- Output follows the `CopilotRecommendation` schema (title, priority, observation, evidence[], reasoning, suggestedAction, relatedProductIds?, limitations?). Validate at runtime, retry a bounded number of times, then fall back safely.
- Grounding: every metric value and product ID must come from tool results. Never invent data or claim causation from correlation.
- Treat prompts and product content as untrusted (prompt injection). Send the minimum data needed, never credentials or unnecessary personal data. Set timeouts and limits. Never render model output as HTML.
- Metric definitions are not computed here a second way: the Copilot tools call the metric use cases in `packages/core/src/services/metrics/` unchanged (see `packages/core/AGENTS.md`).

## Provider and fallback

- All LLM access goes through `LlmProviderPort` (`packages/ai`). Without credentials the app uses `UnconfiguredLlmProvider`, which fails explicitly; the UI must then show a clear fallback state or deterministic rule-based insights, never a fabricated answer.
- Recommendation actions (save, dismiss, complete) are not performed here. They go through `packages/core/src/domain/copilot/recommendation-status.ts` and the database adapter.

## Evaluation

- Keep a version-controlled eval set (in `packages/ai`) that covers factual grounding, invalid output, insufficient data, prompt injection in product content, and provider failure. Assert properties, not exact wording.
- `npm run eval` prints the report. The checks live in `packages/ai/src/evals/runner/` and the unit tests call them too, so never re-implement a check in a test.
- `--live` (bounded call budget, refuses under `CI`) is the only path that calls a real provider outside the app. It reads `LLM_*` through `parseLiveEvalEnv`, the one documented exception to `getEnv()` (eval-script spec A1; a parity test pins it to `parseEnv`).
- Add eval cases for every new tool, schema or failure path.

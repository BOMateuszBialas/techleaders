# Run: product description drafts take one daily-cap unit per draft (LOG-01 parity)

- Date: 2026-11-09. Branch `feat/product-description-daily-cap` from `origin/main` (PR B, base `main`).
- Trigger: the Copilot review's open item for product descriptions (`.ai/specs/implemented/2026-10-17-commerce-copilot.md`). The draft use case took a unit of `copilot:llm:day` before every attempt, so a refused retry reported `daily_limit` in place of `invalid_output`.

## What changed

- `packages/ai/src/llm/llm-daily-cap.ts`: `consumeLlmDailyAttempt` replaced by `takeLlmDailyUnit`, which returns `{ allowed, remaining }` for one whole answer or draft.
- `packages/ai/src/descriptions/draft-product-description.use-case.ts`: one unit before the first attempt; a retry runs only while `remaining > 0`, and takes no unit.
- Tests: four regression tests fail with the old per-attempt check and pass with the fix (checked by temporarily restoring the old check).
- `.ai/specs/implemented/2026-10-18-ai-product-descriptions.md`: dated note; the Copilot spec's open item is marked fixed.

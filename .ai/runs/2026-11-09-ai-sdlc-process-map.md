# Run: AI SDLC process map on a synthetic case (2026-11-09)

- Branch: `docs/ai-sdlc-process-map` from `origin/main`. Docs only; no code change.
- Lesson: `lekcja-23.md` (steps 1 to 9 and the homework). Plan: `.ai/analysis/2026-11-09-week5-plan.md`, section 5 (PR #228).

## Changes

- `.ai/analysis/2026-11-09-ai-sdlc-synthetic-case.md`: synthetic case (fictional shop "Nowak Stationery", labelled as synthetic). Contains the initiative canvas, the process choice, the process map with roles, times and handoffs, three task cards (T1 intake draft, T2 build, T3 staging QA), the harness design (agent rights, guardrails, logs in `.ai/runs/`), and the evaluation plan with a human baseline, thresholds and verdict criteria.
- Every assumed number is marked ASSUMPTION. The evaluation is a plan: no results are reported.

## Validation

- `npm run check:agents`: ok. `npm run check:tokens`: ok. `npx prettier --check` on the changed files: clean.
- Not run: unit, integration and e2e tests (docs only).

## Notes

- The homework's real initiative is outside the repository. The file covers only the fictional case, as the plan (section 5.4) recommends.

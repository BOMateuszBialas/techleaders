# Run: Copilot partial results (GR-04) and unavailable state (FALL-02)

- Date: 2026-11-09. Branch `feat/copilot-partial-and-unavailable` (PR A, base `main`; #227 is merged).
- Scope: spec `.ai/specs/implemented/2026-10-17-commerce-copilot.md`, changes 6 and 7, verdict table, open items.
- Owner decisions applied: LOG-01 accepted (cap counts answers); GR-04 and FALL-02 fixed.

## What changed

- `packages/ai/src/copilot/source-gaps.ts`: incomplete source = traffic with a `null` store conversion.
- `rule-insights.ts`: each rule names its source and its note; an incomplete source skips its rules and the note becomes a limitation.
- `copilot-data-unavailable.ts`: `CopilotDataUnavailableError`, thrown when a read in the tool plan fails.
- `ask-copilot.use-case.ts`: wraps the plan reads, logs `copilot.unavailable` (no text), rethrows.
- `answers/route.ts`: 503 `COPILOT_DATA_UNAVAILABLE`; other errors unchanged (500).
- UI: `copilot-copy.ts` (`data_unavailable` failure, copy), `copilot-fallback.ts` (notice).

## Known gaps

- Only traffic can be incomplete: the other sources never return `null` (truncation stays a limitation).
- With every source of an intent missing, the model still runs; no fallback reason was added (would need a migration).
- Save failures after a finished answer remain a 500.

## Environment note

The worktree's `node_modules` was empty; imports resolved to the main checkout's packages. `npm install` in the worktree fixed the workspace links.

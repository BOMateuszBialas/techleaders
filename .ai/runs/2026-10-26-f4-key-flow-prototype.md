# Run: F4 key-flow prototype (lesson 07)

- Date: 2026-10-26. Branch: `design/f4-key-flow-prototype` (worktree `wt-f4-prototype`, from `main` at `0ea37ed`).
- Goal: a neutral, gray, clickable prototype of the purchase and admin key flows, and a screen map (s01–s19, 3 layouts for s01 and s18), from the owner-accepted F4 recommendations. Design only; no application code, no package changes.

## Steps

1. Read `AGENTS.md`, `.ai/lessons.md`, the F4 plan (scratchpad screen plan) and the `om-mockup-prototype` skill and its references.
2. Read `.ai/specs/product-brief.md` (Key flows, R01–R10, N01–N06, D01–D11) and the order and Copilot status tables in `packages/core` (read only).
3. Wrote `.ai/design/mapa-ekranow.md` (commit 1).
4. Built `.ai/prototypes/discovery/commerceos-key-flow/revision-001/index.html`: one page, 20 screens (including an unknown-fragment page), in-memory state, review bar with account and state controls, layouts A/B/C for s01 and s18 (commit 2).
5. Verified in a headless Chrome over the DevTools protocol (see below).
6. Wrote `README.md` (context record, assumptions AS-01–AS-16, rule and decision references), `prototype.json` (ownership manifest, SHA-256 inventory) and this log (commit 3).

## Decisions and their sources

- Owner decisions Q1–Q8 and the 3 layouts for s01 and s18 are taken as given (the caller's brief; the owner accepted F4). Recorded in the map §2.
- The skill's confirmation step was answered by that acceptance, not by a fresh question. The README says so.
- One prototype for both key flows, with an account switch (Q1).
- The skill's "panel report" input was not supplied; the prototype uses no `[SYNTHETIC]` content.
- The configured browser provider (`agent-browser`) was not installed: its ensure script downloads binaries, which the skill forbids as dependency installation. The Chrome extension was not connected. The walk therefore used an installed headless Chrome and is recorded as a substitute.

## Verification

- Static: the script parses; all referenced IDs and hash links resolve; no external resources, no storage, no network calls; simulated text is inserted with text nodes only.
- Browser walk (`evidence/browser-walk/`): 81/81 scripted checks passed on the final revision; no page overflow at 320 px on the 20 screens; no runtime or console errors. Screenshots: `evidence/s01-home-1440.png`, `evidence/s18-copilot-answer-320.png`.
- `prototype.json` says `verification: "not-run"`: the required browser walk through the configured provider did not run.
- `npm run lint`, `npm run format:check`: no TypeScript or JavaScript source changed and `.ai/` is ignored by Prettier (`.prettierignore`). The worktree has no `node_modules`, so the checks were not run here; the Prettier binary from the main checkout checked the Markdown and JSON files, which passed.

## Problems met

- A Node-spawned headless Chrome gave no DevTools port on Windows; starting Chrome from the shell worked.
- The first walk had two test-script errors (a reset that removed the account order, and a stock check that needed two increases). Both were fixed in the test, not the prototype.
- The 320 px screenshot first showed only the review bar; it was regenerated after scrolling to the screen heading.
- The hook blocked a recursive delete of a leftover scratch profile folder (`scratchpad/cdp/chrome-profile-test`). It was not removed; the user should delete it.

## Follow-ups

- Owner: choose the layout for s01 and s18; check AS-01–AS-16 in the README; confirm the Q1–Q8 wording in the map.
- Run the configured provider walk when it is installed (`bash .ai/scripts/ensure-agent-browser.sh`), then update `verification` in `prototype.json`.
- Keyboard-only and 1440 px review; dark theme and the theme switch (not simulated).
- Design-system prototype (React + Vite, `.ai/prototypes/ds/`) is a later step, not this PR.
- Retrofit spec (`2026-10-2x-ui-retrofit-key-flow`) from the owner's decisions is a later step.

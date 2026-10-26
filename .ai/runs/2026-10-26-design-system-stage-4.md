# Run: design system stage 4 (teaching pages) and stage 5 (checks)

- **Date:** 2026-10-26
- **Branch:** `design/stage-4-teaching-pages` (worktree `wt-ds-stage4`)
- **Goal:** finish the stage 4 plan in `.ai/design/POSTEP.md` (“Etap 4”): 8 general pages and 6 epic pages in the Storybook group “Design system”, `docs/design-system.md`, the AGENTS.md routing row; then the stage 5 checks and report.

## Steps

1. Read the plan, the spec stage-4 row, the batch decisions (B1.x–B4.x, Q lists), `referencje.md`, `audyt.md`, `tokeny.md`.
2. Reviewed the uncommitted WIP (StartHere, HowToChoose, Components, UsageAndAccessibility, components.stories.tsx) against sources and the code. Corrected examples that were not in the code (“Save product”, “Featured on the home page”, “Continue shopping”, “Back to products”, “How these metrics are calculated”, catalog category Select, “Pay (demo)”), a wrong Tabs activation claim, a wrong measure token name, and sources that were not sources (plan-stage phrases). Rules without a source are marked **P**.
3. Wrote the remaining pages: Content, What to avoid, What is missing (with the P list), Contributing, six epic pages (E07 marked P).
4. Found and fixed MDX parse errors (curly braces in text) and wrong Storybook doc IDs (`--docs` vs the real `--<story>` ids). Found five stage 2 links to missing docs pages and one to a missing Text link page; fixed them in `stories/primitives/*.mdx`.
5. Added the story sort order for the new group; added `docs/design-system.md`; added the AGENTS.md routing row (additive).
6. Stage 5: typecheck, lint, format:check, build-storybook, test:storybook:themes (274 tests, both themes, including the catalog a11y), check:tokens (25 findings, all in existing app files), a browser measurement of 14 docs pages at 320 / 768 / 1440 px in both themes (script outside the repo).

## Decisions

- Examples in the pages come from the code (strings, components), not from the plan’s wording.
- A P item is an unsourced rule. The P list is in `What is missing`, section 4 (23 items).
- The publish control is a button in code; the plan had assumed a checkbox. Recorded as a deviation; no change to the app.
- Docs tables at 320 px still scroll sideways (What to avoid up to 712 px). Not fixed: needs a table redesign, recorded as a follow-up.
- The agent test (`.ai/design/test-agentem.md`) is prepared, not run.

## Outcome

- Pages written and checked as above; gate results in the PR body and in POSTEP “Etap 5”.
- Not run here: unit coverage, hook tests, integration and e2e tests (no app behaviour changed; the only app file touched is none, the changes are in `packages/app/stories`, `.storybook` and docs).

## Follow-ups

- P list decisions (owner).
- Table layout on phones in the docs pages.
- Retrofit (lesson 08) and the agent test.
- `check:tokens` is not yet a CI gate; its 25 findings are the retrofit list.

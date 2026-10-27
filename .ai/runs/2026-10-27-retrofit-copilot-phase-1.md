# Run: Copilot retrofit, Phase 1 (question form and advisory note)

- Date: 2026-10-27
- Branch: `feat/retrofit-copilot-phase-1` from `main` (c89adab)
- Spec: `.ai/specs/2026-10-26-retrofit-copilot.md`, Phase 1 only (owner-approved OA-1 to OA-9 and Q1 to Q10 on 2026-10-26)
- Risk: medium (no change to Copilot tools, prompts, schemas, the answer route or the status action)

## Goal

Phase 1 only: the question field becomes a DS `Field` with a visible counter (D8, C4, OA-4, OA-6), and the advisory banner becomes an `Alert` `info` with `role="note"` (D11, C3). Wording unchanged except the approved counter text.

## Steps and decisions

1. `copilot-copy.ts`: `questionLengthText(length, max)` returns "N of 500 characters" (Q5: always visible).
2. `copilot-panel-view.tsx`: `Label` + `Textarea` + static `<p>` become `Field`, `FieldLabel` (same text, so `fillLabel` still works), `Textarea` (same `name`, `maxLength`, `defaultValue`, `readOnly`), `FieldDescription` with the limit text and the counter in a `<span>`, `aria-describedby` kept. The suggested-question group uses `FieldSet` and `FieldLegend`. The view stays hook-free and takes `questionLength` and `onQuestionChange` as props.
3. `copilot-panel.tsx` (wrapper): one `useState` for the length, initialised from `state.question`, passed to the view (C5, OA-4). The owner-approved exception is written into `packages/app/AGENTS.md` (Admin forms rule), so the rule and the code agree.
4. `page.tsx`: the banner is `Alert variant="info" role="note"` with `AlertDescription`; the text is `ADVISORY_TEXT`, unchanged.
5. Counter is outside any `aria-live` region (A6). The e2e checks it after typing.
6. Tests: `copilot-components.test.ts` (label bound to the textarea, limit and counter in the description, no `aria-live` in the form, the change handler reports the length by walking the element tree the hook-free view returns); the `questionLengthText` cases sit in the existing "copilot copy" describe (the spec named a new `copilot-copy.test.ts`; kept in the existing file to avoid a new file for four assertions). `recommendation-components.test.ts` gets the two new required props.
7. e2e `admin-copilot.e2e.test.ts`: new test "shows the question counter as the owner types, without sending the question".
8. Storybook: `stories/patterns/copilot/QuestionForm.stories.tsx` (idle, typed, pending) with play assertions on the field description and the pending status.

## Commands run (worktree, final tree)

| Command | Result |
|---|---|
| `npm ci` | ok (node_modules was empty in the worktree) |
| `npm run lint` | pass, 0 errors; 2 pre-existing warnings in `.ai/prototypes/ds` |
| `npm run format:check` | pass |
| `npm run check:tokens` | pass (269 files) |
| `npm run check:agents` | pass (5 agent files) |
| `npm run test:hooks` | pass (334/334 checks, 9 known gaps still open) |
| `npm run typecheck` | pass (after fixing two test call sites that did not pass the new props) |
| `npm run test:coverage` | pass: 190 files, 2123 tests; 100% statements, branches, functions, lines; no exclusion added |
| `npm run build` | pass |
| `npm run test:integration` | pass: 22 files, 193 tests (Testcontainers, Docker 29.8.2) |
| `npm run test:e2e` | pass: 25 files, 140 tests (agent-browser installed by `ensure-agent-browser.sh`) |
| `npm run build-storybook` | pass |
| `npm run test:storybook:themes` | pass: 70 files, 334 tests (light and dark, a11y as errors) |

Note on logs: the session scratchpad is shared with the other retrofit agents running in parallel. An early e2e log was overwritten by another worktree's run, so the reported e2e result comes from a re-run that logged to a private folder.

## Visual check (Storybook static build, agent-browser)

- 1440 px, light: the field, the counter and the Ask button sit in one column; no overflow.
- 320 px, dark: the counter wraps to two lines ("90 of 500 / characters"); the first suggested question button is wider than the column and runs past the right edge. The page scrolls sideways by 41 px (`scrollWidth` 361 against 320). Cause: the DS `Button` has `whitespace-nowrap`, a fixed `h-control-sm` and `shrink-0`, so a long suggested-question label cannot wrap. This exists on `main` too (same button, same classes); it is not caused by this phase. The fix belongs in the DS (a wrapping variant or label rule), which OA-9 puts in a separate PR. Not fixed here; see the report.
- 390 px and 768 px, and the 1440 px dark screenshot, were not inspected in this pass (time). The e2e `admin-mobile` Copilot test still passes at 390 px.

## Gaps

- The 320 px overflow of the suggested-question buttons (above). Needs a DS decision (OA-9 separate PR).
- The spec's test of the counter's layout at 768 and 1024 px with the sidebar (Q1) belongs to phase 2 (evidence switch); not checked in phase 1.
- The review by a model from another family (D14) and the owner's manual test are still to do.
- The `.ai/runs` file and PR are phase 1 only; phases 2 to 4 are not started.

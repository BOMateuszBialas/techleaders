# Run: Copilot retrofit, Phase 2 (answer summary, fallbacks and evidence)

- Date: 2026-10-27
- Branch: `feat/retrofit-copilot-phase-2` from `origin/main` (2301582)
- Spec: `.ai/specs/2026-10-26-retrofit-copilot.md`, Phase 2 only. Approvals used: OA-2 (evidence table from the container breakpoint, list below), OA-3 (fallback variant map, sign-in link), OA-4 (focus on a 400), OA-6 (copy: rule-based description, empty-store title, sign-in text), OA-7 (risk-high, owner merges).
- Risk: high (Copilot answers, fallback notices and the evidence display are the trust surface). No self-QA.

## Scope

- `copilot-fallback.ts` (new): pure map of the answer notices (S1 to S9) and the failure notices (S11 to S13). Lookup tables typed on the unions, so a new reason fails the build.
- `copilot-fallback-view.tsx` (new): hook-free `AnswerNoticeView` (no role, inside the existing `aria-live`) and `FailureNoticeView` (warning, `role="alert"`, sign-in link on a session end).
- `copilot-evidence-view.tsx` (new): `EvidenceView`, the table from `@xl` (36 rem) of an outer `@container` and a labelled list below it. Both shapes are in the DOM; the demo tag is in both.
- `copilot-answer-view.tsx`: notice above the summary; declined and unsupported summaries shown in the info notice (`data-testid="copilot-summary"` kept); `Empty` for an answered question with no recommendations (S10); `Disclosure` for the definitions (D7). Recommendation card unchanged apart from the evidence view (priority and status are phase 3).
- `copilot-panel-view.tsx`: failure notice instead of `<p role="alert">`; a 400 shows `FieldError` under the textarea with `aria-invalid` and `aria-describedby`; the focus moves to the question on a 400 through the textarea's ref callback.
- `copilot-copy.ts`: `PanelFailure` on the panel state, set by `createAskCopilotAction` (same messages as before); `focusRefusedQuestion`; the approved copy constants.
- `copilot-panel.tsx`: unchanged from main in this phase (one `useState` for the counter, as phase 1).
- `packages/app/e2e/admin-mobile.e2e.test.ts`: the Copilot evidence check replaced. The old check ("every table container has no overflow") passes vacuously once the table is hidden; the new check asserts the table is hidden, the list is shown, the page does not scroll sideways and every value is inside the viewport at 390 px.
- `stories/patterns/copilot/AnswerStates.stories.tsx` (new): rule-based answer at 1440 and 320 px, declined, empty store, session ended.
- Unit tests: `copilot-fallback.test.ts`, `copilot-evidence-view.test.ts`, `copilot-answer-states.test.ts` (new); `copilot-components.test.ts` updated for the failure field, the field error, the sign-in link and the focus.

## Decisions and deviations

- The focus after a 400 uses a ref callback in the view (`ref={(el) => focusRefusedQuestion(state, el)}`), not a wrapper effect. The first version used `useRef` and `useEffect` in the wrapper: the React Compiler lint rejects a ref object passed into a function during render, and the effect's arrow would be uncovered by unit tests. The wrapper therefore keeps only the counter's `useState`, which is the exception already in `packages/app/AGENTS.md`. The callback runs on each render of the view; it only focuses while the state is a refused question, and typing does not move the focus away from the field.
- Declined and unsupported answers: the spec's S8 and S9 are shown as the info notice carrying the server's summary. The summary is not repeated below it.
- The empty-store next step ("Try another suggested question, or check again after more store activity.") is new copy. OA-6 approved the title and the next-step item, but its wording was not written in the spec. Flagged for the owner to confirm.
- The unsupported list of questions stays as a list below the notice.

## Commands run (worktree)

| Command | Result |
|---|---|
| `npm ci` | ok |
| `npm run lint` | pass, 0 errors; 2 pre-existing warnings in `.ai/prototypes/ds` |
| `npm run format:check` | pass (after prettier on the phase's files) |
| `npm run check:tokens` | pass (281 files) |
| `npm run check:agents` | pass (5 agent files) |
| `npm run typecheck` | pass |
| `npm run test:coverage` | pass: 196 files, 2175 tests; 100% statements, branches, functions, lines; no exclusion added |
| `npm run build` | pass |
| `npm run test:integration` | pass (Testcontainers) |
| `npm run test:e2e` | pass: 25 files, 144 tests |
| `npm run build-storybook` | pass |
| `npm run test:storybook:themes` | first run failed: `AnswerStates` 320 px story used `getByRole("table")`, which skips a `display:none` table. Fixed with `hidden: true`; rerun pass: 76 files, 370 tests, light and dark, a11y as errors |
| `npm run test:hooks` | pass: 334/334 checks, 9 known gaps still open |

## Visual check

- No manual screenshot review was done in this pass. The 320 px and 1440 px checks are the Storybook play assertions (no sideways scroll at 320 px, evidence list visible, table hidden) run in Chromium in light and dark.
- The e2e check at 390 px verifies the list, the hidden table and the absence of sideways scroll.
- Not checked: 768 and 1024 px with the sidebar (Q1), and the 44 px target size of the sign-in link.

## Gaps

- Owner review and the manual test are still to do. This phase needs a review by a model from another family in a new session (D14) before merge.
- The focus on a 400 has no e2e test; it is covered by unit tests of the ref callback only.
- The empty-store next-step copy needs the owner's confirmation (see above).
- Phases 3 and 4 are not started: priority neutral badge (OA-1), status badge map, saved list, `Suspense` skeleton, docs.

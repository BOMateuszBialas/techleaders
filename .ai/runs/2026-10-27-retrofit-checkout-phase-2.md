# Run: retrofit checkout, Phase 2 (checkout form and order summary)

- Date: 2026-10-27
- Spec: `.ai/specs/2026-10-26-retrofit-checkout-cart.md`, section "Phase 2" (risk-high: checkout is the money path)
- Branch: `feat/retrofit-checkout-phase-2` from `main` c89adab (Phase 1 merged as #134)
- Worktree: `wt-retrofit-checkout-p2`

## Scope done

Steps 1 to 9 of the spec's Phase 2 section:

1. `Field`, `FieldLabel` (with `optional`), `Input`, `FieldError` per checkout field; label, control, error in that order. "(optional)" now comes from `FieldLabel` (C12). `aria-invalid` and `aria-describedby` from `lib/field-a11y.ts`.
2. Session-lost and server error alerts are `Alert` (`destructive`, `role="alert"`); the session-lost banner keeps its text.
3. Place order is `variant="action"` with `aria-busy` next to `disabled` (C1, B1.6, P3).
4. Focus after a failed submit: `components/checkout/first-invalid-field.ts` (pure helper `firstInvalidFieldId` plus `focusFirstInvalidEffect`). `checkout-form.tsx` only wires the effect with `useEffect`. The logic is unit-tested, so no coverage exclusion is needed (OA-7 not used).
5. Order summary is a `Card` (`CardContent` around the `section`). The section's own border and padding moved to the card, so there is no double border. The list and the `dl` are unchanged.
6. Checkout loading state: `CheckoutPageSkeleton` (`SkeletonGroup` "Loading checkout"). Unavailable state: `CheckoutPageUnavailable` (`ErrorState`, title "Checkout unavailable", retry link "Try again" to `/checkout`) (C9, OA-5).
7. Conflict link, "Review your cart" and the sign-in link are `TextLink`.
8. Unit tests updated and added; e2e focus check and 320 px checkout check; Storybook `stories/storefront/checkout.stories.tsx` (default, field errors, conflict, session lost, pending, focus after submit through the real wrapper, summary, loading, unavailable).
9. Docs: EpicE02 retrofit list and WhatIsMissing E02-S02 row updated.

Not in this phase (spec Phases 3 and 4): Confirm test payment, the order pages, the not-found and lookup states, store `error.tsx` (P18), and moving the spec to `implemented/`.

## Decisions

- **OA-2 (focus move).** Implemented as the spec asks. The rule is recorded in `.ai/design/tokeny.md` §7 rule 13 and in the audit (decision 5). The repo has no separate approval record for OA-2, OA-5 or OA-7. The user's instruction to implement Phase 2 is taken as the go-ahead. The owner must confirm when merging (risk-high).
- **OA-7 avoided.** The effect body lives in a tested module, so `checkout-form.tsx` needs no exclusion in `vitest.config.mts`. Thresholds unchanged.
- **Lint warning.** `useEffect` with a returned function triggers `react-hooks/exhaustive-deps`. One `eslint-disable-next-line` with its reason is on that line.
- **Copy.** Two new strings: "Checkout unavailable" (title) and "Loading checkout" (sr-only label). The retry label reuses "Try again" from the cart copy. Listed under OA-5.
- **Checkout form error alert.** Shows `state.message` as before. The field messages are unchanged.

## Environment issues found

- The worktree's `node_modules` was a partial copy (no `.bin`, no `.d.ts`). `npm ci` failed with ENOTEMPTY on Windows. `npm install` reconciled it (858 added, 188 changed, exit 0). `package-lock.json` did not change.
- `npm run test:hooks` takes about 2.5 min on this machine (one node spawn per case). It is not hung.
- Two `npm run test:hooks` runs from another session were alive during the work. They were left alone.
- The `.bin` folder was missing during the first gate attempts, so `npm run` and `npx` failed until the install completed.

## Commands and results

| Command | Result |
|---|---|
| `vitest run --project unit <checkout>` (after edits) | 34 passed |
| `npm run lint` | exit 0 (2 warnings in `.ai/prototypes/ds`, not touched by this change) |
| `npm run format:check` | pass after prettier on the changed files and `WhatIsMissing.mdx` |
| `npm run check:tokens` | pass (271 files) |
| `npm run check:agents` | pass (5 agent files) |
| `npm run test:hooks` | pass (334/334 checks, 9 known gaps still open) |
| `npm run typecheck` (app, scripts, core, database, ai) | pass (exit 0 for each) |
| `npm run test:coverage` | pass: 191 files, 2130 tests; 100% statements, branches, functions, lines |
| `npm run build` | pass (exit 0) |
| `npm run test:integration` | pass: 22 files, 193 tests |
| `npm run test:e2e` (after build) | pass: 25 files, 141 tests (includes the new focus check and the 320 px checkout check) |
| `npm run build-storybook` | pass |
| `npm run test:storybook:themes` | pass: 70 files, 346 tests (light and dark, a11y as errors) |

Agent-browser was installed with `.ai/scripts/ensure-agent-browser.sh` (v0.35.2).

## Gaps

- No manual visual check at 320 px and 1440 px in light and dark (no screenshots taken this run). The e2e checks cover no sideways scroll at 320 px and the focus move. Storybook covers both themes for the components.
- Screen-reader behaviour of the focus move and the alert roles was not tested (spec "What could not be verified").
- The e2e focus check and the 320 px check ran green, but the e2e is not proof that focus is visible on every control (T13). Keyboard Tab-through was not run.
- The 320 px check measures page width only. The 44 px target rule for Place order was not measured (not in the spec's Phase 2 acceptance).
- Phase 3 and 4 are open.

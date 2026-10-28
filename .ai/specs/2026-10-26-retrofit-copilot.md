# Retrofit the Commerce Copilot screens to the design system (lesson 08, area 4)

- Backlog: none yet. File the phases with `om-backlog` after the owner approves this spec.
- Status: **ready for the owner to merge (design-only PR; no application code changed). The owner approved OA-1 to OA-9 and every Q recommendation (Q1 to Q10) with the recommended option on 2026-10-26.** Written on 2026-10-26 against `origin/main` at `12da918`. The owner's decisions it relies on are recorded in `.ai/design/POSTEP.md` (sections "Decyzje właściciela" for batches 2 to 4, and the Storefront v2 section) and `.ai/design/tokeny.md` (sections 1b, 3, 7, 8). The target for the Copilot screens already exists in `packages/app/stories/design-system/EpicE05Copilot.mdx` (states table, "Retrofit (lesson 08)" list) and in `WhatIsMissing.mdx` (section 2 rows for E05-S01 to E05-S03, section 4 rows P15 and P16).
- Risk: **risk-high** for the implementation, because the answer, the grounding display, the fallback notices and the recommendation status actions are the trust surface of Copilot. Phase 1 and phase 4 are **risk-medium** (form and close-out). Every phase is its own PR, and the owner merges the risk-high ones (agent merge policy). No self-QA is allowed for risk-high phases.
- Design authority: `.ai/design/tokeny.md` (sections 1b, 3 density and "Wiersz tabeli", 4, 7 rules 4, 5, 10, 11, 13, 14, 16, 20), `.ai/design/POSTEP.md` (B1.18, B1.23, B2.11, B2.16 to B2.20, B2.24, B3.5, B3.9, B3.10, B3.21, B3.23, B3.24, B3.26, batch 3 Q5, Q6 and the accepted deviation on the evidence table at line ~489), `.ai/design/audyt.md` (Copilot notes, lines 32, 37, 54), `packages/app/stories/design-system/EpicE05Copilot.mdx`, `packages/app/stories/design-system/WhatIsMissing.mdx`, `ENGINEERING_STANDARDS.md`, `SDLC.md`, `AGENTS.md` ("Commerce Copilot rules", "Security and validation", admin guard rules), `packages/ai/AGENTS.md`, `packages/app/AGENTS.md`.
- Baseline: `packages/app/src/app/admin/(protected)/copilot/*`, `packages/app/src/app/admin/(protected)/admin-copilot.test.ts`, `packages/app/src/components/admin/copilot/*` (14 files, 1 757 lines with the tests), and the Copilot pieces of `packages/app/src/components/ui/error-state.tsx` and `components/admin/form-feedback.tsx` as used by Copilot.
- Related specs: `.ai/specs/implemented/2026-10-17-commerce-copilot.md` (UI/UX and API contracts), `.ai/specs/2026-10-26-retrofit-admin.md` (branch `spec/retrofit-admin`, PR #123, open), `.ai/specs/2026-10-26-retrofit-checkout-cart.md` (branch `spec/retrofit-checkout-cart`, PR #124, open). This spec follows the same format.

## 📝 TLDR

Copilot is the fourth and last area of lesson 08 (after storefront, checkout and admin). It works and keeps every Copilot rule, but its screens still hand-build what the design system now provides: a `Label` and a `Textarea` without `Field`, a static hint where the spec promised a 500-character counter, a fixed `<p role="alert">` for every failure, a grey `bg-muted/40` note, an unlabelled `<details>`, a priority badge that is red like an error, a status badge that always says `secondary`, a `FormMessage` from the shared admin file, and an evidence `Table` that overflows a phone (the 390 px overflow recorded in POSTEP at batch 3). This spec turns the screens into four shippable phases: question form and notice (medium), answer summary, fallbacks and evidence (high), recommendation cards, status badges and saved list (high), and states, Storybook, docs and close-out (medium). Presentation only: no server action, use case, port, schema, prompt, eval, route, API contract, env variable, migration or guard changes. The Copilot rules (grounding, validation, fallback, approved tools, the status transition table, "AI advises, the merchant decides") are untouched and each one has an acceptance item.

Five decisions need the owner before phase 2 and phase 3 start (see "Owner approvals needed"): the neutral priority badge (it contradicts a recommendation the owner already accepted in batch 2), the evidence card list on phones, the fallback variant map, the counter's small piece of state in the client wrapper, and the new copy.

## 📝 Decisions and assumptions

| # | Decision | Source | How this spec builds it |
|---|---|---|---|
| D1 | Presentation only. Copilot server code, the answer route, `ask-copilot.use-case.ts`, prompts, schemas, grounding, evals, env and the status action stay unchanged | AGENTS.md Copilot rules; `packages/ai/AGENTS.md`; task brief | Every phase has a diff check (A2). The status action and its `from`/`to` contract are not touched |
| D2 | Copilot is an admin screen, so it uses the compact admin density (`data-density="admin"` from the admin layout): control `sm` 28 px, `md` 32 px, `lg` 36 px from 768 px; 44 px below | tokeny.md section 3 (density table), R04.3, K7 | DS components only; no raw heights (A3) |
| D3 | **Priority is a neutral badge with its word** ("High priority", "Medium priority", "Low priority"). No red and no warning colour carries priority. Proposal: `default` for high, `secondary` for medium and low | tokeny.md section 7 rule 20 ("priorytet jako badge z tekstem", neutral); EpicE05Copilot.mdx "Rules this epic follows" (neutral badge); rule 5 (red is an error) | Phase 3. **Conflict:** POSTEP B2.17 recommends `warning` for "high" and the owner accepted B2.1 to B2.31 "according to the recommendations" on 2026-10-24. See C1 and OA-1 |
| D4 | Status badges follow one map: `new` = `outline`, `saved` = `secondary`, `dismissed` = `outline`, `completed` = `success`. Text always says the status ("Status: Saved"); colour is never the only signal | tokeny.md section 7 rule 10 (status never colour alone); POSTEP B2.17 (`success` for done states, `outline` for neutral) | Phase 3, one pure function in `recommendation-copy.ts`. See OA-5 |
| D5 | A fallback is information, not an error: **`Alert` `info`** for configuration and refusal states, **`Alert` `warning`** for timeouts, limits, failed checks and an unreachable service; `ErrorState` only for the saved list (as the E05 page says). No red button anywhere | EpicE05Copilot.mdx states table and rule "A fallback is an information state, not an error"; POSTEP B3.24; tokeny rule 5 | Phase 2 (answer and fallbacks), phase 3 (saved list). Map in section "Fallback and state map" |
| D6 | Evidence is a `Table` from the container breakpoint (about 36 rem, to verify) and a labelled list of rows below it. Each row keeps metric, value, period and source; the value stays visible without sideways scroll | POSTEP B3.10 (card list instead of a table on phones, Storybook story at 320 px), tokeny section 3 row "Wiersz tabeli" (phone: "lista kart zamiast tabeli"), POSTEP batch 3 note on the accepted deviation until this retrofit (line ~489), lesson 2026-10-19 (Copilot evidence hid the Value column in its scroll container) | Phase 2. See Q1 (how the switch is made) and C2 |
| D7 | `<details>` "How these numbers are defined" becomes the DS `Disclosure` (native `<details>`, no JavaScript). The definitions stay out of the decision path, as the rule requires | POSTEP B3.26 and batch 3 Q5 (Disclosure on native details); EpicE05Copilot.mdx retrofit step 3 | Phase 2 |
| D8 | The question field is a `Field` with a `Label`, a `Textarea`, a hint that states the 500-character limit and a visible counter. The counter is not announced on each keystroke | Copilot spec UI/UX ("textarea (500 max, counter)"); WhatIsMissing P16 (recommended: accept); EpicE05Copilot.mdx "Rules" (counter as P) | Phase 1. Needs the wrapper to hold one `useState` (C5, OA-4) |
| D9 | Demo labelling is unchanged: the text tag "Fictional demo data" stays on every traffic row, now as the `demo` variant. No `--warning` for demo data | AGENTS.md (demo data labelled); D08 (`.ai/specs/2026-10-13-commerceos-mvp.md`); tokeny rule 11; POSTEP B2.17 | Phase 2 (evidence rows), phase 3 (any demo badge) |
| D10 | Form-level results use the DS `Alert`: errors `destructive` with `role="alert"`, success `success` with `role="status"`. The role is chosen by the place of use (B2.18). The answer notices sit inside the existing `aria-live="polite"` region and get **no** role, so one answer is announced once | POSTEP B2.18 (no default role, Q4 accepted), B2.19, B2.20; WhatIsMissing P4 and P5 | Phases 2 and 3. Removes the last Copilot use of `FormMessage` from `components/admin/form-feedback.tsx` |
| D11 | The advisory banner is an `Alert` `info` with `role="note"` (a standing note, not an alert). Its wording stays exactly as `ADVISORY_TEXT` | POSTEP B2.18 (standing note: no role or `note`); Copilot spec UI/UX "Advisory banner (always)" | Phase 1 |
| D12 | The saved list "Your recommendations" stays a list of cards, not a `Table`. Each card holds a rich evidence block, so a table row cannot show it; the status badge sits in the card header | POSTEP B3.10 and B3.5 (a table is for data rows with one action); owner question Q2 in this spec | Phase 3. See Q2 |
| D13 | Copy changes are proposals. Every new or changed string is listed in OA-6 and is not shipped until the owner approves it. Existing copy (`FALLBACK_REASON_TEXT`, `UNAVAILABLE_TEXT`, `RATE_LIMITED_TEXT`, `SESSION_ENDED_TEXT`, `PRIORITY_TEXT`, the status labels) stays | WhatIsMissing P11 and P10 pattern (owner approves final wording) | Every phase; the phase waits for approved copy |
| D14 | Each phase stops for review by a model from another family in a new session (course rule, Faza 5 point 3), then the owner's manual test, then merge | `PLAN-TYDZIEN-2.md` "Faza 5 – L08" point 3 | Phase gate |

## 📝 Problem Statement

The Copilot screens were built before the design system and were never retrofitted. Their state on `origin/main` (read in this spec pass; not copied from the audit):

- **Question form.** A `Label` and a `Textarea` are wired by hand (`components/admin/copilot/copilot-panel-view.tsx:48–57`), not a `Field`, so there is no `aria-invalid` and no error slot. The hint is a static sentence ("Up to 500 characters, in English.", `:58–60`). The spec promised a counter ("textarea (500 max, counter)", Copilot spec UI/UX), and WhatIsMissing P16 records that it is not built. The suggested-question group is a raw `<fieldset>` with a `<legend>` (`:30–31`); that is fine, but it has no DS treatment.
- **Notices and errors.** The advisory banner is `rounded-md border bg-muted/40 p-3` (`app/admin/(protected)/copilot/page.tsx:25`, a colour at 40 % opacity, forbidden by admin rule A4). Every error is a bare `<p role="alert" className="text-sm text-destructive">` (`copilot-panel-view.tsx:74–76`; `saved-recommendations-view.tsx:26`), so a rate limit, a closed session and an outage look the same and nothing says what to do next. The session-ended text has no sign-in link (`copilot-copy.ts:18`), although EpicE05Copilot.mdx asks for one.
- **Fallback states.** `FALLBACK_REASON_TEXT` (`copilot-copy.ts:23–32`) is shown as plain text inside the origin `Badge` (`copilot-answer-view.tsx:284`). The fallback is not a visible state of its own, so the owner cannot see at a glance that the answer is rule-based.
- **Evidence.** The evidence `Table` (`copilot-answer-view.tsx:162–197`) has four columns with `whitespace-normal` cells and a caption. It is the table that overflows a phone: POSTEP batch 3 (line ~489) measured 37 px of sideways overflow on the Copilot evidence tables at 390 px with the 12 px padding, and 5 px with the 8 px padding the owner accepted as a temporary deviation "until the card list in the retrofit (B3.10)". This spec is that retrofit. The 320 px check was not measured for this table; it is in A11.
- **Priority.** `RecommendationCardView` colours the priority badge `destructive` when the priority is high (`copilot-answer-view.tsx:215`). POSTEP B2.17 names this as a defect ("czerwony jak błąd"), and tokeny rule 20 asks for a neutral badge.
- **Recommendation status.** The status badge is `outline` for `new` and `secondary` for every other status (`recommendation-status-form-view.tsx:178`). The saved and dismissed states look the same; the completed state gets no positive signal.
- **Status actions.** The result of Save, Dismiss and Mark completed is rendered by `FormMessage` from `components/admin/form-feedback.tsx` (`recommendation-status-form-view.tsx:132, :205`). That file is being retired by the admin retrofit (its phase 6), so Copilot must stop importing it.
- **Links.** Product names are a raw `Link` with `underline underline-offset-4` (`copilot-answer-view.tsx:247`, `saved-recommendations-view.tsx:38, :61, :67`). The DS `TextLink` exists for this (B1.18).
- **Definitions.** `<details>` and `<summary>` are styled by hand (`copilot-answer-view.tsx:320–321`). The DS `Disclosure` is the same native element with the DS style.
- **Loading.** The page's `<Suspense>` fallback is a bare paragraph "Loading Copilot…" (`page.tsx:29`). The pending answer is a `role="status"` paragraph (`copilot-panel-view.tsx:70–72`), which is correct and stays.
- **Empty states.** There is no DS `Empty` on this screen. An answer with no recommendations shows only the limitations (`copilot-answer-view.tsx:305–308`), and "Your recommendations" shows a plain paragraph when the owner has saved nothing (`saved-recommendations-view.tsx:33`).

The owner's target for this screen is already written: the states table and the retrofit list in `EpicE05Copilot.mdx`, and the rows E05-S01 to E05-S03 in `WhatIsMissing.mdx`. This spec turns that target into phases.

## 📝 Non-goals

- Any change to Copilot behaviour: the question routing, the tool plans, the prompts, the output schema, grounding checks, retries, timeouts, the rate limits (10 per 10 minutes per owner, 100 LLM attempts per day, Copilot spec A4), the daily limit, the eval set and `npm run eval`.
- Any change to the answer API (`POST /api/admin/copilot/answers`), its response shape, its status codes (200, 400, 401, 429, 500) or `CopilotAnswerDto`. The fallback is still a 200 with `origin: "rules"` (Copilot spec, API Contracts).
- Any change to `changeRecommendationStatus`, `recommendation.action.ts`, the transition table in `packages/core/src/domain/copilot/recommendation-status.ts`, the conditional update in `DatabaseCopilotRecommendationRepository`, or the `from`/`to` form fields.
- Any change to `copilot-copy.ts` wording that is not listed in OA-6 (for example `UNAVAILABLE_TEXT`, `RATE_LIMITED_TEXT`, `FALLBACK_REASON_TEXT` stay).
- The admin shell (`app/admin/(protected)/layout.tsx`, sidebar, navigation), the admin `error.tsx` and `not-found.tsx`, the sign-in page. They are the admin retrofit's phases 1 and 6. Copilot inherits them.
- A chart, a sparkle or any AI icon, a gradient, a purple accent (tokeny rule 20, "bez magii AI").
- The product page, the dashboard, the orders screens and the storefront.
- New DS components or changes to `components/ui/*` (OA-9 applies to any DS change). The Copilot evidence list is a pattern in `components/admin/copilot/`, not a DS component (P22: it has two uses, not a third).
- New dependencies. Container queries use Tailwind v4, which is installed.
- Markdown or HTML rendering of model text. It stays plain React text.

## 📝 Existing rules this changes (owner approval needed)

| # | Existing rule | Where it is written | What changes | Phase |
|---|---|---|---|---|
| C1 | "High" priority is a `destructive` badge | `copilot-answer-view.tsx:215`; POSTEP B2.17 (recommends `warning`, accepted in batch 2) | Neutral badge: `default` for high, `secondary` for medium and low (D3). **This contradicts the batch 2 recommendation**, so it is OA-1 | 3 |
| C2 | Evidence is a `Table` on every width (`Table`, caption, four columns) | `copilot-answer-view.tsx:162–197`; Copilot spec UI/UX "evidence table" and its Accessibility paragraph ("evidence as a `<table>` with caption") | A `Table` from the container breakpoint; a labelled row list below it (D6). The e2e `admin-mobile` assertion on `[data-slot=table-container]` changes (see Test plan) | 2 |
| C3 | Advisory banner: `border bg-muted/40` with `role="note"` | `app/admin/(protected)/copilot/page.tsx:25` | `Alert` `info` with `role="note"` (D11). The wording stays | 1 |
| C4 | The question field: `Label` and `Textarea`, static hint | `copilot-panel-view.tsx:48–60`; Copilot spec UI/UX ("counter") | `Field` with a visible counter that names the limit (D8). The counter needs the current length, so the client wrapper keeps one `useState`. AGENTS.md says the wrapper "only calls `useActionState`" (C5) | 1 |
| C5 | Admin form wrappers call only `useActionState` (`packages/app/AGENTS.md`, "Admin forms are a hook-free view plus a thin wrapper") | `packages/app/AGENTS.md` (Admin, protected); `copilot-panel.tsx` | The Copilot panel wrapper also calls `useState` for the length counter. The view stays hook-free and renders every state in unit tests. A rule change, so it is OA-4 | 1 |
| C6 | Session ended: plain text, no action | `copilot-copy.ts:18`; EpicE05Copilot.mdx states table ("with a sign-in link") | `Alert` `warning` with a `TextLink` to `/admin/sign-in` (the route exists: `app/admin/sign-in/page.tsx`). Copy unchanged (OA-6 only if the link text changes) | 2 |
| C7 | Fallback shown as text inside the origin badge; no state of its own | `copilot-answer-view.tsx:284`; `copilot-copy.ts:23–32` | `Alert` per fallback reason (section "Fallback and state map"), with the existing reason text as its title. The origin badge stays | 2 |
| C8 | Status badge: `outline` for `new`, `secondary` for all others | `recommendation-status-form-view.tsx:178` | The map in D4. Text unchanged ("Status: …") | 3 |
| C9 | Result of a status action: `FormMessage` (shared admin file) | `recommendation-status-form-view.tsx:132, :205`; `components/admin/form-feedback.tsx` | `Alert` `success` with `role="status"` and `Alert` `destructive` with `role="alert"` (D10). After this phase Copilot does not import `form-feedback.tsx`; the admin retrofit's phase 6 can remove it | 3 |
| C10 | Saved list failure: `<p role="alert">` | `saved-recommendations-view.tsx:25–29` | `ErrorState` (E05 states table: "`ErrorState` for the saved list") | 3 |
| C11 | Product links: raw `Link` with a hand-written underline | `copilot-answer-view.tsx:247`; `saved-recommendations-view.tsx:38, :61, :67` | `TextLink` (B1.18) with the same `href` | 3 |
| C12 | Definitions: hand-styled native `<details>` | `copilot-answer-view.tsx:320–321` | DS `Disclosure` (native, same behaviour) (D7) | 2 |
| C13 | Suspense fallback: bare text "Loading Copilot…" | `app/admin/(protected)/copilot/page.tsx:29` | `SkeletonGroup` with the label "Loading Copilot" (B3.16 to B3.19). The page's `<Suspense>` placement stays | 4 |
| C14 | No empty state for an answer with no recommendations or a store with no paid orders | `copilot-answer-view.tsx:305–308`; `rule-insights.ts:78–85` (the rules' "No paid orders in the period" text) | `Empty` (B3.21) with the server's summary and limitations, and a next step (A14). Copy in OA-6 | 2 |
| C15 | "Your recommendations" empty state is a plain paragraph | `saved-recommendations-view.tsx:33` | `Empty` with the existing text "Saved recommendations appear here." (no new copy) | 3 |

No rule about access, data, grounding, validation, fallback logic, the transition table, the demo labelling, the metric definitions or the approved tools changes.

## 📝 Rule index (sources kept by this spec)

Each row is a Copilot rule that the retrofit must keep. Acceptance items cite the row.

| Rule | Source | Kept by |
|---|---|---|
| Flow: auth, validation, routing or tool loop, approved tools only, no SQL or ORM for the model | AGENTS.md "Commerce Copilot rules"; `packages/ai/AGENTS.md` "Copilot flow and tools" | A1, A2 (no server change) |
| Output follows `CopilotRecommendation`; validated at runtime; bounded retries; safe fallback | AGENTS.md; `packages/ai/AGENTS.md` "Output and grounding" | A2 (schemas unchanged); A7 (each fallback reason has a state) |
| Every metric value and product id comes from tool results; the page shows the figures it used | AGENTS.md; EpicE05Copilot.mdx ("Figures in this summary") | A11 (evidence rows show every field) |
| Plain text only: no `dangerouslySetInnerHTML`, no Markdown or HTML rendering of model output | Copilot spec UI/UX; AGENTS.md | A13 |
| Fallback without credentials: rule-based insights with the reason, never an invented answer | AGENTS.md; `packages/ai/AGENTS.md` "Provider and fallback" | A7, A16 |
| Recommendation actions only through `allowedRecommendationTransitions`; the status form posts `from` (lost-update guard) and `to` | AGENTS.md; `packages/ai/AGENTS.md`; Copilot spec A14 | A10 |
| AI advises, the merchant decides: the page says so and changes nothing in the store | AGENTS.md principle 3; ADVISORY_TEXT | A15 (banner kept) |
| Demo data is labelled in the text ("Fictional demo data") and never by colour alone | D08; tokeny rule 11 | A12 |
| Metric definitions from one source (`METRIC_DEFINITIONS`), shown in the UI | AGENTS.md "Metric definitions" | A11 (definitions list kept) |
| Guard: `requireAdminPage()` inside `<Suspense>`; no change to the route guard | `packages/app/AGENTS.md` "Admin (protected)" | A1 |
| Eval and test suites keep their assertions on properties, not on wording | `packages/ai/AGENTS.md` "Evaluation" | Test plan |

## 📝 Affected packages and modules

Only `packages/app` changes, in these folders. Each phase PR lists its files in its description.

| Area | Files (current, on `main`) | Change |
|---|---|---|
| Page | `packages/app/src/app/admin/(protected)/copilot/page.tsx`, `load-copilot.ts` (unchanged) | Phase 1 (banner, C3); phase 4 (`SkeletonGroup`, C13) |
| Question form | `packages/app/src/components/admin/copilot/copilot-panel-view.tsx`, `copilot-panel.tsx` (wrapper only, C5), `copilot-copy.ts` (pure length text) | Phase 1; phase 2 (error mapping to the fallback view) |
| Answer | `packages/app/src/components/admin/copilot/copilot-answer-view.tsx` | Phase 2 (summary, origin, notices, evidence, definitions, empty); phase 3 (recommendation card) |
| Evidence and fallback (new) | `packages/app/src/components/admin/copilot/copilot-evidence-view.tsx` (new: table and list), `copilot-fallback-view.tsx` (new: `Alert`s), `copilot-fallback.ts` (new: pure map from reason to variant and text) | Phase 2 |
| Recommendation status | `recommendation-status-form-view.tsx`, `recommendation-copy.ts` (pure maps: status variant, priority variant), `recommendation-statuses.tsx` (unchanged), `recommendation-status-form.tsx` (wrapper, unchanged) | Phase 3 |
| Saved list | `saved-recommendations-view.tsx` | Phase 3 |
| Shared | `components/admin/form-feedback.tsx` (Copilot stops importing `FormMessage`; the file stays for other screens) | Phase 3 |
| Storybook | `packages/app/stories/patterns/copilot/*` (new, see "Storybook"); `packages/app/stories/design-system/EpicE05Copilot.mdx` (states table, retrofit list marked done); `WhatIsMissing.mdx` (E05 rows and P15, P16) | Phase 4 (pattern stories also in each phase) |
| Tests | `components/admin/copilot/copilot-components.test.ts`, `recommendation-components.test.ts`, `app/admin/(protected)/admin-copilot.test.ts`; new colocated unit tests for each new `.ts` module; `packages/app/e2e/admin-copilot*.e2e.test.ts`, `admin-mobile.e2e.test.ts` (Copilot test only) | Each phase |
| Docs | `.ai/specs/implemented/2026-10-17-commerce-copilot.md` (UI/UX rows: evidence table, counter, pending text; C2 and OA-6); `.ai/design/POSTEP.md` (stage record for this retrofit) | Phase 4 |

Not touched in any phase: `packages/core`, `packages/database`, `packages/ai`, `packages/app/src/server/**` (including `copilot/recommendation.action.ts`, `container.ts`, `env.ts`, `require-admin.ts`), `app/api/admin/copilot/answers/route.ts`, the admin `layout.tsx`, `globals.css`, `components/ui/*`, migrations, env, `.env.example`.

## 📝 Proposed Solution

### Component decisions (what the Copilot screens use)

| Need | DS component | Rule it follows | Notes |
|---|---|---|---|
| Question label, hint, counter, error | `Field`, `FieldLabel`, `FieldDescription`, `FieldError` (`components/ui/field.tsx`) | B1.22 to B1.26, B2.11, D8 | Replaces the `Label` and the static `<p>` in `copilot-panel-view.tsx:48–60`. `FieldError` shows server field messages (400) |
| Question text | `Textarea` (`components/ui/textarea.tsx`) | B1.20 (`min-h-24` on the admin scale is a proposal for the DS, not a change here) | Keeps `name="question"`, `maxLength`, `defaultValue`, `readOnly` while pending |
| Suggested questions | `Button` `outline` `sm` inside a `FieldSet` and `FieldLegend` | B1.2, B2.16 | Same names and values (`name="intent"`, `value`), so the e2e clicks by role still work |
| Ask | `Button` `default` | tokeny rule 4 (main action is neutral `--primary`) | Keeps `disabled={pending}` (P3) |
| Advisory banner | `Alert` `info` with `role="note"` | B2.18, B2.19 | Replaces `page.tsx:25` |
| Answer origin | `Badge` `outline` (`AI-generated · model` or `Rule-based insights · reason`) | B2.16, tokeny rule 10 | Text carries the origin; the fallback reason also appears in the notice |
| Fallback and errors | `Alert` `info`, `warning`, `destructive` (fallback map, section below); `ErrorState` for the saved list | B2.18, B2.19, B3.24, batch 3 Q4 | Icon plus text in every variant (the DS adds the icon) |
| Summary | `p` with the body style | tokeny section 4 | Summary is plain text |
| Evidence (wide) | `Table`, `TableCaption`, `TableHead`, `TableBody`, `TableRow`, `TableCell` (`components/ui/table.tsx`) | B3.5, B3.7, B3.9, B3.10 | Numbers right-aligned and tabular (`tabular-nums`); caption visible or `sr-only` |
| Evidence (narrow) | a labelled list (`<ul aria-label>` with `<dl>` per row), new pattern in `copilot-evidence-view.tsx` | B3.10, tokeny section 3 | Used twice (summary evidence and recommendation evidence): P22 is met |
| Demo tag | `Badge` `demo` with the text | B2.17, tokeny rule 11 | Replaces `Badge variant="outline"` at `copilot-answer-view.tsx:182` |
| Priority | `Badge` `default` (high) or `secondary` (medium, low) with `PRIORITY_TEXT` | D3 (conflict: OA-1) | Replaces `copilot-answer-view.tsx:215` |
| Recommendation card | `Card`, `CardHeader`, `CardTitle`, `CardContent` | B2.25 (`border`, no shadow, `rounded-card`) | Keeps `data-testid="copilot-recommendation"` |
| Recommendation status | `Badge` (map D4) with the text "Status: …" | B2.17, rule 10 | Replaces `recommendation-status-form-view.tsx:178` |
| Status actions | `Button` `default` (Save, Mark completed), `outline` (Dismiss), `size="sm"` | tokeny rule 4; B2.16 | Labels, `aria-label` pattern and `name`/`value` unchanged |
| Status result | `Alert` `success` (`role="status"`) or `destructive` (`role="alert"`) | D10, B2.18 | Replaces `FormMessage` |
| Product link | `TextLink` (`components/ui/text-link.tsx`) | B1.18, tokeny section 1b (`--link`, underlined in text) | Same `href` (`productPath`) |
| Definitions | `Disclosure` (`components/ui/disclosure.tsx`) with `DisclosureTrigger` and `DisclosureContent` | B3.26, batch 3 Q5, D7 | Native `<details>`; the summary text is unchanged |
| Pending answer | the text stays `role="status"` (B2.18); `aria-busy` on the form (B1.6) | P3, B1.6 | "Analysing your store data…" unchanged (see Q7) |
| Loading (page) | `SkeletonGroup` with `label="Loading Copilot"` | B3.16 to B3.19 | Phase 4 |
| Empty | `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`, `EmptyContent` | B3.21, B3.23, P14 | Answer with no recommendations; saved list with nothing saved (C14, C15) |
| Saved list failure | `ErrorState` (`components/ui/error-state.tsx`) | B3.24, batch 3 Q4, E05 states table | Replaces `saved-recommendations-view.tsx:25–29` |
| Pager | `TextLink` for "Newer" and "Older"; `nav aria-label="Recommendation pages"` kept | B1.18 | Same hrefs |

The DS components not used here: `Dialog`, `AlertDialog` (no destructive action on the Copilot screens: the status actions are reversible through the transition table, so no confirmation is added), `Tabs`, `NavigationMenu`, `Drawer`.

### Fallback and state map

One row per state the owner sees. The map is one pure function in `copilot-fallback.ts` (new) that returns `{ variant, title, role, copy }` for each reason, so every row is a unit test. Text is the existing copy unless marked.

| # | State | Source (code) | Today | Target (variant, role) | Title and copy |
|---|---|---|---|---|---|
| S1 | Rule-based: AI not configured | answer `origin: "rules"`, `fallbackReason: "not_configured"` | origin badge text only | `info`, no role | `FALLBACK_REASON_TEXT.not_configured`; description "Showing rule-based insights from your store data." (new, OA-6) |
| S2 | Rule-based: AI timed out | `timeout` | badge text | `warning`, no role | "AI timed out" + the same description |
| S3 | Rule-based: daily AI limit reached | `daily_limit` | badge text | `warning`, no role | "Daily AI limit reached" + description |
| S4 | Rule-based: AI provider busy | `rate_limited` | badge text | `warning`, no role | "The AI provider is busy" + description |
| S5 | Rule-based: AI provider failed or rejected the credentials | `provider_error`, `auth` | badge text | `warning`, no role | "The AI provider failed" / "The AI provider rejected the credentials" + description |
| S6 | Rule-based: AI answer failed our checks | `invalid_output` | badge text | `warning`, no role | "The AI answer failed our checks" + description |
| S7 | AI declined to answer | `refused` | badge text | `info`, no role | "The AI declined to answer" + description |
| S8 | Declined question: data not recorded (kind `declined`) | `kind: "declined"`, `missingData` | summary text | `info`, no role; the suggested questions below | Summary text from the server, unchanged |
| S9 | Outside the list (kind `unsupported`) | `kind: "unsupported"` | summary text + list | `info`, no role; the list of seven questions as buttons or a list | Summary text from the server, unchanged (see Q8) |
| S10 | Empty store or no recommendations | `kind: "answered"`, `recommendations: []` | limitations only | `Empty` (not an alert) with the server's summary and limitations; next step (OA-6) | Title (new): "Not enough store data yet" (OA-6) |
| S11 | Provider unreachable, HTTP 500 or network error | fetch error or status 500 | `<p role="alert">` "Copilot is temporarily unavailable." | `warning`, `role="alert"` (an error the owner must see, not an AI fallback; see Q4) | `UNAVAILABLE_TEXT` |
| S12 | Owner rate limit, HTTP 429 | status 429 | `<p role="alert">` | `warning`, `role="alert"` | `RATE_LIMITED_TEXT` |
| S13 | Session ended, HTTP 401 | status 401 | `<p role="alert">` | `warning`, `role="alert"`, with `TextLink` "Sign in" to `/admin/sign-in` (C6) | `SESSION_ENDED_TEXT` (existing copy) |
| S14 | Question refused by validation, HTTP 400 | status 400 with `fieldErrors` | `<p role="alert">` with the first field message | `FieldError` under the textarea, `aria-invalid="true"`, `aria-describedby` to it; no alert | The first field message from the server (existing rule in `errorText`) |
| S15 | Saved list not loaded | `list === null` | `<p role="alert">` | `ErrorState` (`destructive`, `role="alert"`) | Title "Your recommendations could not be loaded." (existing text, split into title and description: OA-6) |
| S16 | Status action refused or failed | `ActionState` with `status: "error"` | `FormMessage` | `destructive`, `role="alert"` | `state.message` (server text, unchanged) |
| S17 | Status action saved | `ActionState` with `status: "success"` | `FormMessage` | `success`, `role="status"` | `statusChangedMessage(to)` (unchanged) |
| S18 | Answer pending | `pending` | "Analysing your store data…" | unchanged: `role="status"` text; button disabled; `aria-busy` | `PENDING_TEXT` |
| S19 | Traffic rows | `row.demo` | outline badge | `demo` badge with `DEMO_DATA_TAG` | `DEMO_DATA_TAG` |

Rules behind the table: no fallback is red (S1 to S10 are `info` or `warning`; S11 to S13 are `warning`); the only `destructive` items are form-level errors after an action (S16) and the saved list (S15), and neither is an action button. An Alert never carries a button in the destructive colour.

### Layout of the answer (after the retrofit)

1. Origin badge and period (unchanged text), one line.
2. The fallback notice (S1 to S9) as an `Alert`, above the summary.
3. The question echo "Question: …" (unchanged).
4. The summary (`data-testid="copilot-summary"`).
5. Summary evidence: `copilot-evidence-view` (table from the breakpoint, list below).
6. Up to three recommendation cards, or the empty state (S10).
7. Definitions in a `Disclosure`.

## 📝 Phases

Each phase is one PR, shippable and reviewable on its own. Each one: (a) changes its files and tests, (b) updates the Storybook pattern stories it touches, (c) runs the gate and the e2e suites it touches, (d) carries the 320 px, 390 px, 768 px and 1440 px checks for its screens in light and dark (`A11`), (e) stops for review by another model family in a new session (D14), then the owner's manual test, then merge.

### Phase 1: question form and advisory note (`risk-medium`, one PR)

- `copilot-panel-view.tsx:48–60`: `Label` and the static hint become `Field`, `FieldLabel` ("Or ask about your store", same text for the e2e `fillLabel`), `Textarea` (`name`, `maxLength`, `defaultValue`, `readOnly` kept), `FieldDescription` with the limit text and the counter, `aria-describedby` pointing to the description.
- Counter: a pure `questionLengthText(length, max)` in `copilot-copy.ts` (for example "120 of 500 characters", final copy in OA-6). It is rendered in the description, **not** in an `aria-live` region, so it is not announced on each keystroke. It updates visually on input.
- `copilot-panel.tsx` (wrapper): one `useState` for the current length, initialised from `state.question`, updated by an `onChange` on the textarea. No other hook. The view receives `length` as a prop, so the view stays hook-free (C5, OA-4).
- The 500-character limit comes from `COPILOT_QUESTION_MAX_LENGTH` (core), as today. The server still validates `1–500` (route); no change.
- `page.tsx:25`: the advisory `p` becomes `Alert` `info` with `role="note"`, the wording unchanged (C3).
- Button `Ask` stays `default`; the suggested-question buttons stay `outline` `sm`, wrapped in `FieldSet` and `FieldLegend` "Suggested questions" (same text).
- Tests: `copilot-components.test.ts` (panel view: all states rendered, the field label is bound to the textarea, the description names the limit, the counter text for 0, 120 and 500, no `aria-live` on the counter); new `copilot-copy.test.ts` cases for `questionLengthText`; `admin-copilot.test.ts` unchanged. e2e `admin-copilot.e2e.test.ts` keeps `fillLabel("Or ask about your store", …)` and `clickRole("button", "Ask")`.
- Storybook: `stories/patterns/copilot/QuestionForm.stories.tsx` (idle, typed 120 characters, pending, server field error) with a11y in light and dark.

### Phase 2: answer summary, fallbacks and evidence (`risk-high`, one PR)

- New `copilot-fallback.ts`: a pure map from `FallbackReason` and from the answer kind or HTTP status to `{ variant, title, role, copy }` (the map above, S1 to S13). Exhaustive over `COPILOT_FALLBACK_REASONS` (a `switch` with a `never` default, so a new reason fails the build).
- New `copilot-fallback-view.tsx`: hook-free view that renders one `Alert` for the map entry; S13 adds the `TextLink` to `/admin/sign-in`.
- `copilot-answer-view.tsx`: the origin badge keeps its text; the fallback `Alert` is rendered above the summary (S1 to S9); the summary and "Question: …" stay as they are; the `Empty` for S10 replaces the limitations-only block when there are no recommendations (`copilot-answer-view.tsx:305–308`); `<details>` becomes `Disclosure` (D7).
- New `copilot-evidence-view.tsx`: `EvidenceTable` moves here. It renders two shapes from the same rows:
  - the `Table` (caption, four columns, `tabular-nums` for the value, `whitespace-normal` cells) inside a wrapper that is shown from the container breakpoint (Q1);
  - a `<ul aria-label={caption}>` of `<li>` rows, each a `<dl>` with metric (term, `TextLink`-free text), value (strong, `tabular-nums`), period and source (`wrap-anywhere`, muted).
  - Both shapes are rendered in the DOM (the one not shown is hidden with the CSS class, so no JavaScript decides which one is read). The `Badge` `demo` tag appears in both shapes next to the metric text (D9).
- The `[data-slot=table-container]` attribute is kept on the `Table` wrapper, so the admin e2e can still find the table at wide widths (see Test plan).
- `copilot-panel-view.tsx:70–84`: the error branch renders `CopilotFallbackView` (S11, S12, S13, S14) instead of `<p role="alert">`. The pending branch is unchanged.
- Tests: exhaustive unit test of `copilot-fallback.ts` (every reason, every kind, every HTTP status used by `errorText`); view tests render every row; evidence view tests render both shapes with every field and the demo tag; the answer view test shows `Empty` for S10 and does not show it when recommendations exist.
- e2e `admin-mobile.e2e.test.ts` (Copilot test, lines 66 to 82): the assertion changes from "table containers have no overflow" to "at 390 px the Value column is visible inside the viewport and the page does not scroll sideways; the table is hidden below the breakpoint". The old assertion would pass vacuously once the table is hidden (its `scrollWidth - clientWidth` is 0), so it must be replaced, not kept.

### Phase 3: recommendation cards, status badges and saved list (`risk-high`, one PR)

- `recommendation-copy.ts`: two pure maps, `priorityVariant(priority)` (D3) and `recommendationStatusVariant(status)` (D4), with unit tests for every value. `statusText` and `STATUS_BUTTON_TEXT` unchanged.
- `copilot-answer-view.tsx` (`RecommendationCardView`): the priority `Badge` uses `priorityVariant` (C1, OA-1); the product name becomes `TextLink` (C11); the "Related:" list keeps its text and the `(deleted product)` text.
- `recommendation-status-form-view.tsx`: the status `Badge` uses `recommendationStatusVariant` (C8); the actions keep their `name`, `value`, `aria-label` (`"{Button label}: {title}"`) and `from`/`to` hidden fields; the result `FormMessage` (line 205) becomes `Alert` `success` (`role="status"`) or `destructive` (`role="alert"`) through a small pure mapper (S16, S17), so the import of `form-feedback.tsx` is removed (C9).
- `saved-recommendations-view.tsx`: the failure branch becomes `ErrorState` (C10, S15); the empty branch becomes `Empty` with the existing text (C15); the pager uses `TextLink` (C11); the "Suggested on" time stays a `<time>` element.
- The saved list stays a list of cards (D12). Each card's header carries the priority and the status badge.
- Tests: `recommendation-components.test.ts` updated for the new markup (the `Alert` roles, the `ErrorState`, the `TextLink`s); new unit tests for the two maps; a test that the status form still posts `recommendationId`, `from` and the pressed `to`, and that the buttons offered are exactly `allowedRecommendationTransitions(status)` minus `new`; `recommendation.action.test.ts` unchanged.
- e2e `admin-copilot-actions.e2e.test.ts`: selectors and texts unchanged ("Status: New", "Status: Saved", `button[value="completed"]`, `Save: <title>`). Add one assertion that the status badge text is present in the saved list card.

### Phase 4: states sweep, Storybook, docs and close-out (`risk-medium`, one PR)

- `page.tsx:29`: the `<Suspense>` fallback becomes `SkeletonGroup` with the label "Loading Copilot" (C13). The page's `await requireAdminPage()` placement inside `CopilotSection` stays.
- Storybook: `stories/patterns/copilot/` holds one story per screen state (question form, answer with three recommendations, rule-based fallback, unsupported, empty store, saved list, saved list empty, saved list failed, status result) with a11y in light and dark (`npm run test:storybook:themes`).
- `EpicE05Copilot.mdx`: the "Target after the retrofit" column is marked as built, and the retrofit list becomes a "done" list with the phase numbers. The P items section keeps P15 and P16 until the owner decides them.
- `WhatIsMissing.mdx`: the rows E05-S01 to E05-S03 are removed from section 2 when they ship; P15 and P16 are closed with the owner's decision.
- `.ai/specs/implemented/2026-10-17-commerce-copilot.md`: the UI/UX rows "Question form" (counter built, pending sentence per Q7), "Recommendation card" (priority colour per the decision), and the Accessibility paragraph ("evidence as a `<table>` with caption" → table from the breakpoint, list below). Each row is updated in the phase that changes it (C2, OA-6).
- `.ai/design/POSTEP.md`: a "Retrofit: Copilot" stage record (phase list, PR numbers, the owner decisions taken, the measured overflow before and after at 320, 390, 768 and 1440 px).
- No behaviour change in this phase: a regression sweep of the Copilot e2e suites and of the screenshots at the four widths.

## 📝 Storybook

- New folder `packages/app/stories/patterns/copilot/` (the admin spec uses `stories/patterns/admin/`; both are new and do not collide). Stories are in `stories/`, never in a dot-directory (AGENTS.md; lesson 2026-10-24).
- Each pattern story has a fixed fixture: no network, no provider, no database. The fixtures are plain `CopilotAnswerDto` objects written by hand in the story file, using the fictional store values already in the eval fixtures (`packages/ai/src/copilot/copilot-results.fixture.ts`, read only for the shape, never imported into the DS).
- Every story passes `a11y` as an error in light and dark (`npm run test:storybook:themes`).
- Stories check the 320 px and 1440 px viewports for the evidence view (the table/list switch), per POSTEP B3.10 ("Story przy 320 px z testem a11y").

## 📝 Acceptance criteria

| # | Criterion | How it is checked |
|---|---|---|
| A1 | Every Copilot page and route keeps its guard: `requireAdminPage()` inside `<Suspense>` on the page, `changeRecommendationStatus` (`runAdminAction`), `adminApiHandler` on the answer route. `admin-guard-inventory.test.ts` is green. Copilot code does not import `require-customer` | unit test (inventory), PR diff review |
| A2 | No change in `packages/core`, `packages/database`, `packages/ai`, `packages/app/src/server/**`, `app/api/admin/copilot/answers/route.ts`, migrations, env, `globals.css`, `components/ui/*`, `layout.tsx` (each phase) | PR diff check listed in the PR description |
| A3 | Copilot controls use the compact admin density (28 / 32 / 36 px from 768 px; at least 44 px below). No raw `h-*` or `size-*` control classes in Copilot files, only DS components. Table rows 44 px | grep in the PR; e2e `getBoundingClientRect` on the Copilot page at 1440 and 390 px |
| A4 | No palette classes (`amber-`, `emerald-`, `red-`, `green-`, `gray-`, `slate-`, `zinc-`, `neutral-`), no `dark:` variants, no `/40`, `/50`, `/90` and no `opacity-` used for state in Copilot files. `bg-primary/90` and `hover:bg-primary/90` are gone from Copilot files | grep; `npm run check:tokens` clean for the Copilot files |
| A5 | The question is a `Field`: its label is bound to the textarea (`fillLabel` works), its hint states the 500-character limit, its error (400) is a `FieldError` with `aria-invalid="true"` and `aria-describedby` | unit tests; e2e `admin-copilot` |
| A6 | The counter is not inside an `aria-live` region (no announcement per keystroke) | unit test (no `aria-live` ancestor on the counter); code review |
| A7 | Every row S1 to S14 of the fallback map renders its variant and text; no fallback or error uses a `destructive` button; the fallback is never `ErrorState` | unit test (exhaustive map); grep for `variant="destructive"` on `Button` in Copilot files returns nothing |
| A8 | Priority and status badges: text is always present; the variant follows D3 and D4; no badge uses colour alone | unit tests (maps); e2e (text present) |
| A9 | Demo labelling is unchanged: "Fictional demo data" on every traffic row, now the `demo` variant, never `warning` | unit test; e2e `admin-copilot-traffic` |
| A10 | Status actions: the buttons offered are exactly `allowedRecommendationTransitions(status)` without `new`; the form posts `recommendationId`, `from` and `to` as today; the labels "Save", "Dismiss", "Mark completed" and the `aria-label` pattern are unchanged | unit tests; e2e `admin-copilot-actions` |
| A11 | Evidence: at 320, 390, 768 and 1440 px the answer does not scroll the page sideways; below the breakpoint each row shows metric, value, period and source in the list; from the breakpoint the table shows the same four columns with a caption; the Value column is inside the viewport at 320 and 390 px | unit (both shapes render all fields); e2e `admin-mobile` (replaced assertion); manual screenshot check (phase review) |
| A12 | Demo rows keep the text "Fictional demo data" (`DEMO_DATA_TAG`) | unit test; e2e |
| A13 | Model text is plain text: no `dangerouslySetInnerHTML`, no Markdown or HTML parser in Copilot view files | grep in the PR; unit tests render a summary containing `<b>x</b>` as text |
| A14 | Every empty state (S10, saved list empty) says why it is empty and gives a next step; no developer command (`npm run`) appears in Copilot copy | unit (copy); grep for `npm run` in `components/admin/copilot` returns nothing |
| A15 | The advisory text "Copilot suggests; you decide…" is shown on every Copilot page state, as `Alert` `info` with `role="note"` | unit test (the page shell); e2e `admin-copilot` (text present) |
| A16 | Fallback copy is unchanged except for the approved new strings in OA-6 (`FALLBACK_REASON_TEXT`, `UNAVAILABLE_TEXT`, `RATE_LIMITED_TEXT`, `SESSION_ENDED_TEXT` keep their text) | unit tests compare with the constants; review of OA-6 |
| A17 | The session-ended alert links to `/admin/sign-in` with a `TextLink` | unit test (S13) |
| A18 | Focus is a 2 px `--ring` outline with 2 px offset (DS); no `ring-ring/50` in Copilot files; the failed question keeps its typed value (P2) | grep; e2e `admin-copilot` (value kept after an error) |
| A19 | Answer and status results: `role` is chosen by place (B2.18): notices in the answer region have no role; form-level errors `role="alert"`; saved status `role="status"` | unit tests |
| A20 | Storybook: every Copilot pattern story passes `a11y` as errors in light and dark (`npm run test:storybook:themes`) | Storybook test run |
| A21 | Coverage stays at 100% lines, branches, functions and statements, with no new exclusion | `npm run test:coverage` |
| A22 | The e2e journeys of Copilot keep passing; each changed selector or assertion is listed in its phase PR (the `admin-mobile` overflow assertion is replaced, not deleted) | `npm run test:e2e` |
| A23 | The answer API, its status codes and the `CopilotAnswerDto` shape are unchanged (BACKWARD_COMPATIBILITY.md: additive only) | diff of `app/api/admin/copilot/answers/route.ts` is empty; route tests unchanged |
| A24 | Docs: `EpicE05Copilot.mdx`, `WhatIsMissing.mdx` (E05 rows, P15, P16), the implemented Copilot spec rows and `POSTEP.md` are updated in the phase that changes their behaviour text | PR diff in phase 4 |

## 📝 UI/UX and states

- **Density and layout:** the Copilot page keeps its `max-w-4xl` column in the admin shell. Controls use the admin scale (D2). Phones use 44 px controls and the evidence list.
- **Loading:** `SkeletonGroup` with "Loading Copilot" for the page; "Analysing your store data…" as a `role="status"` text for an answer (S18). No spinner (tokeny section 5).
- **Empty:** `Empty` with a title, one sentence and a next step, left aligned (P14).
- **Fallback:** `Alert` `info` or `warning` above the summary, with the reason in its title and one sentence about what the owner is looking at (OA-6).
- **Error:** `Alert` `warning` with the text for the state (S11 to S13); field error under the textarea (S14); saved list `ErrorState` (S15); status action `destructive` with `role="alert"` (S16).
- **Success:** `Alert` `success` with `role="status"` after the server confirms the action (S17, P4).
- **Pending:** button disabled and `aria-busy` on the form; text unchanged (P3).
- **Status:** text plus variant (rule 10).
- **Priority:** word plus neutral variant (D3).

## 📝 Accessibility

- Labels: the question has a visible `Field` label. The suggested-question group has a legend. The saved list has a heading ("Your recommendations", `h2`) and `aria-labelledby`.
- Errors: `aria-invalid` and `aria-describedby` on the textarea (S14). Form-level errors are `role="alert"` (S15, S16). Notices in the answer region are announced once through its `aria-live="polite"`, not twice.
- Focus: 2 px `--ring` outline (A18). After a 400 the focus moves to the textarea (the first invalid field), as the admin spec's A-2 does for forms; this is a wrapper effect and needs OA-4 approval with the counter.
- Tables: a caption (visible or `sr-only`); the list has `aria-label`; the first column identifies the row (B3.10); demo rows say so in text.
- Targets: 44 px below 768 px (WCAG 2.5.8, tokeny rule 16), including the suggested-question buttons and the pager links.
- Contrast: pairs from tokeny section 2 only (`--foreground` on `--card`, `--muted-foreground` for muted text, `--warning` and `--destructive` on their surfaces, `--link` for product names). No new pair without `node .ai/design/kontrast/run.mjs`.
- Motion: the pending pulse is the DS skeleton only; no new animation.

## 📝 Security and validation

- No change to validation: the route's Zod schema (`question` 1–500, `intent` one of the seven), the server's field messages and the `ApiResult` envelope stay.
- No change to the status action or its transition checks. The UI offers only the allowed transitions; the server refuses the rest (lost-update guard on `from`).
- The fallback text is server text or copy from `copilot-copy.ts`. Model text is rendered as plain React text (A13).
- Authorization: `requireAdminPage()` and `adminApiHandler` stay; hiding UI is not authorization (AGENTS.md). The sign-in link (S13) only navigates; it does not carry a token.
- No new client data: the counter reads the textarea value on the client and sends nothing new. The advisory and fallback texts add no data.
- Logs: no change. The `logger` is not touched.

## 📝 Edge cases & failure scenarios

| Case | Expected behaviour |
|---|---|
| The model returns text with HTML tags | Shown as text, tags visible; no injection (A13) |
| A 401 while a question is pending | `SESSION_ENDED_TEXT` in a `warning` `Alert` with the sign-in link (S13); the typed question stays (P2) |
| The owner types exactly 500 characters, then 501 | `maxLength` stops at 500; the counter reads 500 of 500; no error is needed |
| A 400 from the server with a field message | `FieldError` under the textarea with the server message; `aria-invalid` (S14); the typed value stays |
| An answer with three recommendations and a 320 px screen | Cards stack; evidence is the list; no page sideways scroll (A11) |
| An answer with no recommendations and no paid orders | `Empty` with the server's summary and limitations (S10); no card |
| A saved recommendation whose product was deleted | "(deleted product)" text, no link (unchanged) |
| The saved list fails to load | `ErrorState` (S15); the answer above still works |
| Two cards show one recommendation and one saves it | The shared status (`RecommendationStatusesProvider`) shows the same badge in both (unchanged, #67) |
| JavaScript disabled | The suggested-question buttons and the status forms are native forms (unchanged); the counter and the wrapper's state are not available, so the textarea works without the counter text updating (the static hint with the limit stays in the DOM) |
| The rules fallback with `not_configured` on a store with data | `info` notice, the rule-based summary and recommendations shown, the origin badge reads "Rule-based insights · AI is not configured" (S1) |

## 📝 Risks & Impact Review

| Risk | Impact | Mitigation |
|---|---|---|
| The phone evidence list hides the table, so an e2e that waits for table text times out | Medium | The replaced assertion waits for the list; the caption text stays in the list's `aria-label`; the `admin-mobile` test is updated in the same PR |
| Both evidence shapes are in the DOM; an e2e reads hidden text | Low | Hidden shapes are `display:none` and do not appear in `innerText`; checked in e2e |
| A container breakpoint that is wrong for the sidebar layout (the content column is narrower than the viewport at 768 to 1000 px) | High (sideways scroll in the content column) | Use a container query on the evidence wrapper, not a viewport query; verify at 768 and 1024 px with the sidebar; see Q1 |
| The priority colour is reversed by the owner (OA-1) after phase 3 is built | Low (one class) | The map is one pure function; a change is one line and one test |
| The counter needs a `useState` in the wrapper (C5) and the owner rejects it | Medium (phase 1 scope shrinks) | Phase 1 ships the `Field` and the static limit hint; the counter becomes its own small PR after OA-4 |
| `Alert` copy is not approved (OA-6) | Medium | Each phase waits for the owner's copy; the existing copy ships first |
| The admin retrofit changes the shell or `form-feedback.tsx` while Copilot is in review | Medium | Copilot phases do not depend on the admin phases; rebase on `main` before review; phase 3 removes the Copilot import, the admin phase 6 removes the file |
| Status badge map confuses "Dismissed" with "New" (both `outline`) | Low | The text says the status; the map is an owner decision (OA-5) |
| The Storybook fixtures drift from the real answer DTO | Low | Fixtures are typed as `CopilotAnswerDto`; a type error fails `typecheck` |

## 📝 Decisions in play

Carried from the decisions table. Open questions below are not decided by this spec.

## Screen IDs

Screen IDs are from `.ai/design/mapa-ekranow.md` §3. The phasing below is unchanged; this note only maps each phase to the screens it touches.

| Phase | Screen IDs | Note |
|---|---|---|
| 1 Question form and advisory note | s17 | Question form, advisory banner, suggested questions, 500-character counter |
| 2 Answer summary, fallbacks and evidence | s18 | Source and fallback states, evidence tables, refusal and empty store |
| 3 Recommendation cards, status badges and saved list | s18 (cards); s19 (decision and saved list) | |
| 4 States sweep, Storybook, docs and close-out | s17, s18, s19 | The "Loading Copilot" fallback is the s17 loading state |

## 📋 Phasing

| Phase | Title | Risk | Depends on | Files (summary) |
|---|---|---|---|---|
| 1 | Question form and advisory note | risk-medium | this spec approved; OA-4 for the wrapper state | page banner, panel view and wrapper, `copilot-copy.ts` |
| 2 | Answer summary, fallbacks and evidence | risk-high | 1 (shares the `Alert` pattern); OA-3 | `copilot-answer-view.tsx`, new `copilot-evidence-view.tsx`, `copilot-fallback-view.tsx`, `copilot-fallback.ts`, panel view error branch, `admin-mobile` e2e |
| 3 | Recommendation cards, status badges, saved list | risk-high | 2 (shares the answer view); OA-1, OA-5 | `copilot-answer-view.tsx` (card), `recommendation-status-form-view.tsx`, `recommendation-copy.ts`, `saved-recommendations-view.tsx` |
| 4 | States sweep, Storybook, docs and close-out | risk-medium | 1 to 3 | page `Suspense`, `stories/patterns/copilot/*`, `EpicE05Copilot.mdx`, `WhatIsMissing.mdx`, Copilot spec rows, `POSTEP.md` |

Phase 1 can start as soon as this spec is approved and OA-4 is answered. Phases 2 and 3 are sequential because they share the answer view. Phase 4 is last.

## 📝 Implementation plan

1. Owner decides OA-1 to OA-9 (or accepts the recommendations in this spec).
2. Phase 1 PR (risk-medium): build, unit tests, Storybook for the question form, e2e `admin-copilot`. Review by another model family in a new session. Owner manual test. Merge.
3. Phase 2 PR (risk-high): fallback map first (pure, tested), then the views, then the e2e replacement. Owner review and merge.
4. Phase 3 PR (risk-high): the two pure maps first, then the card, the status form and the saved list. Owner review and merge.
5. Phase 4 PR (risk-medium): stories, docs and records. Owner review and merge.

## 📝 Test plan

**Per phase (gate):** `npm run lint`, `npm run format:check`, `npm run test:hooks`, `npm run typecheck`, `npm run test:coverage` (100 %), `npm run build`, `npm run test:integration` (no change expected), `npm run test:e2e` (Copilot suites), `npm run build-storybook`, `npm run test:storybook:themes`.

**Unit (`*.test.ts`, colocated):**
- `copilot-fallback.ts`: every `FallbackReason`, every answer kind, every HTTP status in `errorText`; the `never` default proves exhaustiveness at compile time.
- `recommendation-copy.ts`: `priorityVariant`, `recommendationStatusVariant`, the status-result mapper.
- `copilot-copy.ts`: `questionLengthText` at 0, 1, 120 and 500.
- `copilot-components.test.ts` and `recommendation-components.test.ts`: each view renders each state (idle, pending, answer, error, empty, unsupported, declined, fallback, saved list, saved list empty, saved list failed); assert roles, labels, variants (by `data-variant` from the DS `Alert`), text and absence of `destructive` buttons. Tests query by role and text, not by class.
- The status form: the buttons offered equal `allowedRecommendationTransitions` minus `new`; hidden fields unchanged.

**E2E (`packages/app/e2e`, agent-browser):**
- `admin-copilot.e2e.test.ts`: unchanged journeys (suggested question, typed question, a refused question). Add: the counter text is visible after typing.
- `admin-copilot-actions.e2e.test.ts`: unchanged selectors. Add: the status badge text in the saved list.
- `admin-copilot-traffic.e2e.test.ts`: unchanged; "Fictional demo data" stays visible.
- `admin-mobile.e2e.test.ts` (Copilot test, lines 66 to 82): **replaced** assertion. At 390 px: after the suggested question, the answer has no page-level sideways scroll; the evidence list is visible; the `table` of the evidence is hidden (`display:none`) below the breakpoint; every evidence row's value is inside the viewport. The old "every `table-container` has no overflow" check is removed because a hidden table passes it vacuously.
- Screenshots at 390 and 320 px for the phase review (`ARTIFACTS_DIR`, git-ignored).

**Manual (owner, per phase):** sign in as the owner (`npm run admin:create` on a fresh database), open `/admin/copilot`, check the question form with keyboard only (Tab order: suggestions, textarea, Ask), ask a suggested question and a typed one, save, dismiss and complete one recommendation, check the status badges, open the definitions, and check the page at 320, 390, 768 and 1440 px in light and dark. Each phase lists its own checklist in the PR.

**Provider:** not needed for presentation tests. The fallback states are rendered from fixtures and from the rules path (no key). A live LLM answer is not required for this retrofit.

## 📝 Open questions

Owner decision 2026-10-26: every recommendation below is accepted (Q1 to Q10).

| # | Question | Recommendation |
|---|---|---|
| Q1 | How does the evidence switch between table and list? Options: a viewport breakpoint (`md:`), or a container query on the evidence wrapper (`@container` and `@xl:`) | Container query. The answer sits in the admin content column, which is narrower than the viewport from 768 px (the sidebar is beside it). A viewport breakpoint would show a table that overflows at 768 to 1000 px. Verify the switch at 768 and 1024 px with the sidebar |
| Q2 | "Your recommendations": keep cards (D12) or a table with one row per recommendation and an expand control? | Keep cards. A row cannot show the evidence block, and an expand control is a disclosure per row (the DS rule: Disclosure only for extra content, never for decision content, B3.28). The status badge goes in the card header |
| Q3 | Empty store and no recommendations: `Empty` with the server's summary (S10), or an `Alert` `info`? | `Empty`. It is a state of "nothing to show yet" with a next step (B3.23), not a notice about the AI. Copy in OA-6 |
| Q4 | Provider unreachable or HTTP 500 (S11): `warning` (E05 states table) or `destructive` (it is an error)? | `warning`, as the E05 target says. It is an error the owner can retry, not a destructive action, and the shape matches the other fallbacks. Owner may choose `destructive` for a hard failure; the map is one line |
| Q5 | The counter: always visible ("120 of 500 characters") or only near the limit? | Always visible in the field description. A counter that appears late teaches nothing; the copy is for the owner to approve (OA-6) |
| Q6 | The advisory note: `Alert` `info` with `role="note"` (D11), or a `Card`? | `Alert` `info` with `role="note"`. A standing note with an icon, no border colour of a state (B2.18, B2.19) |
| Q7 | The pending sentence: the implemented spec says "this can take up to 45 seconds"; the code shows "Analysing your store data…" only | Restore the spec sentence in the pending state (it sets an honest expectation for a slow provider, timeout 45 s per the spec). Copy in OA-6 |
| Q8 | The unsupported answer: the spec says "I can answer these questions:"; the code says "Copilot can't answer that question. It can answer these:" (`packages/ai/src/copilot/intents.ts:110`) | Keep the code text (it is the server's answer, and the owner has not approved the spec sentence). Update the spec row in phase 4 (OA-6) |
| Q9 | Priority wording "High priority" etc. (`PRIORITY_TEXT`) | Keep. It is the word the E05 page asks for |
| Q10 | Should the status badge for "Completed" be `success`? | Yes: a done state with its word. It is not an action colour (rule 4). Part of OA-5 |

## 📝 Owner approvals needed

| # | Approval | Source or status | Phase |
|---|---|---|---|
| OA-1 (**owner-approved 2026-10-26, recommended option: neutral priority badge**) | **Neutral priority badge** (C1, D3): high = `default`, medium and low = `secondary`, instead of the red `destructive` today and the `warning` that POSTEP B2.17 recommends. Batch 2 was accepted "according to the recommendations" (2026-10-24), so this is a change of that recommendation | tokeny rule 20 and EpicE05Copilot.mdx say neutral; POSTEP B2.17 says `warning`. The owner decides which one holds | 3 |
| OA-2 (**owner-approved 2026-10-26, recommended option: evidence table from the container breakpoint, list below**) | Evidence as a table from the container breakpoint and a list below it on phones (C2, D6); the replaced `admin-mobile` assertion | POSTEP B3.10 and the batch 3 deviation note (line ~489) say "until the card list in the retrofit"; owner accepted the deviation for now | 2 |
| OA-3 (**owner-approved 2026-10-26, recommended option: fallback variant map and sign-in link**) | Fallback variant map (section "Fallback and state map"): `info` for not configured and refused, `warning` for the rest and for unreachable service, `ErrorState` only for the saved list; sign-in link in the session-ended alert (C6) | EpicE05Copilot.mdx (states table and retrofit step 4); the variant for S11 is Q4 | 2 |
| OA-4 (**owner-approved 2026-10-26, recommended option: one `useState` in the Copilot wrapper for the counter, and focus on a 400**) | The question's counter needs one `useState` in the client wrapper, and a 400 moves focus to the textarea (a wrapper effect). This changes the rule "the wrapper only calls `useActionState`" for Copilot | AGENTS.md (admin forms rule, quoted in `packages/app/AGENTS.md`); admin spec A-2 precedent (wrapper-only effect) | 1, 2 |
| OA-5 (**owner-approved 2026-10-26, recommended option: status badge map new outline, saved secondary, dismissed outline, completed success**) | Status badge map (D4): `new` outline, `saved` secondary, `dismissed` outline, `completed` success | POSTEP B2.17 (`success` for done, `outline` for neutral); tokeny rule 10 | 3 |
| OA-6 (**owner-approved 2026-10-26, recommended option: all proposed copy, with Q7 and Q8 as recommended**) | **Copy** (every string is proposed; nothing ships before approval): the counter text (Phase 1); the fallback description "Showing rule-based insights from your store data."; the empty-store title "Not enough store data yet" and its next step; the saved-list `ErrorState` title and description split; the sign-in link text ("Sign in"); the pending sentence with the 45-second note (Q7); the unsupported sentence (Q8: keep the code text). Existing constants stay | WhatIsMissing P11 and P10 pattern (owner approves final wording); Copilot spec UI/UX | 1, 2, 3, 4 |
| OA-7 (**owner-approved 2026-10-26, recommended option: phases 2 and 3 risk-high, owner merges**) | Phase 2 and phase 3 are risk-high and wait for the owner's merge (agent merge policy). Phases 1 and 4 are risk-medium | Agent merge policy; SDLC | all |
| OA-8 (**owner-approved 2026-10-26, recommended option: folder `stories/patterns/copilot/`**) | The Storybook pattern folder `stories/patterns/copilot/` (a new folder; the admin retrofit proposes `stories/patterns/admin/`) | WhatIsMissing "Contributing" (a pattern is built once it has two uses); confirm the folder names with the admin spec | 4 (and 1–3 for stories) |
| OA-9 (**owner-approved 2026-10-26, recommended option: no DS change; a DS change is a separate PR**) | Any DS change needed while building Copilot (for example a `min-h` on the textarea, B1.20, or a `cn` fix, P21) | Not planned. A DS change is a separate PR with its own approval | any |

## 📋 P list (WhatIsMissing section 4 and POSTEP): recommendation for each Copilot item

The owner accepts or rejects each P item. Items that belong to other screens are marked and are not part of this spec.

| P | Item (short) | Recommendation | Note for this retrofit |
|---|---|---|---|
| P1 | The field keeps the `--ring` focus while it shows its error | **Accept** | Phase 1 (`Field`), tokeny section 5 |
| P2 | After a failed submit the typed values stay | **Accept** | Kept by the state (`question` in `CopilotPanelState`); phases 1 and 2 keep it |
| P3 | A second click on a waiting button does not submit again | **Accept** | `disabled={pending}` on Ask and the fieldset; `aria-busy` on the form |
| P4 | Success is shown only after the server confirms it | **Accept** | The status result is the server's `ActionState` (phase 3) |
| P5 | An error the user must act on is never a toast | **Accept** | Copilot has no toasts |
| P6 | Dialog and Alert dialog have a visible title | **Not applicable** | No dialog on Copilot (status actions are reversible; see the DS note above) |
| P13 | Sentence case for headings and labels | **Accept** | Already sentence case |
| P14 | Empty states are left aligned | **Accept** | Phase 2 (`Empty`), phase 3 (saved list) |
| P15 | Epic E05: the answer and the saved list share one status for each recommendation | **Accept** (as built today: `RecommendationStatusesProvider`, #67) | Keep the provider; the badge map is the same in both places |
| P16 | Epic E05: a visible counter for the question length limit | **Accept** | Phase 1 (D8); OA-4 and OA-6 |
| P21 | `cn` does not merge the project's token classes | **Accept as a separate fix** if an override is still needed | The Copilot retrofit avoids overrides (OA-9) |
| P22 | A variant or pattern needs at least two uses before it is added | **Accept** | The evidence list has two uses (summary and recommendation evidence) |
| P23 | A need that appears once stays in its screen, with tokens only | **Accept** | The counter and the status result mapper stay in their files |

Storefront and admin items (P9, P10, P11, P18, P19, P20, P12, P17) are outside this spec. P10 (sign-in copy) and P11 (empty orders copy) are for the admin retrofit.

## 📝 Review log

- 2026-10-26: spec written by the agent from the design docs and the Copilot code listed above; the baseline is `origin/main` at `12da918`. Not yet reviewed by a second model family (course rule before phase 1 starts).
- 2026-10-26: owner approved OA-1 to OA-9 with the recommended option each, and every Q recommendation (Q1 to Q10). Decided: neutral priority badge (`default` for high, `secondary` for medium and low; C1 accepted over POSTEP B2.17); evidence table from a container breakpoint with a list below (C2, Q1 container query); fallback map of `info` or `warning`, sign-in link on session end (C6; Q4 `warning` for an unreachable service); one `useState` in the Copilot wrapper for the counter, and focus on a 400 (C5, OA-4); status badge map (D4); all new copy in OA-6 accepted, including the Q7 pending sentence and the Q8 server text for unsupported questions; cards kept for the saved list (Q2); empty store as `Empty` (Q3); counter always visible (Q5); completed as `success` (Q10). Status set to ready for the owner to merge. Each phase still needs review by a model from another family before merge (D14).

## What could not be verified

- No application run: the worktree has no `node_modules`, so `npm run check:tokens`, `npm run build-storybook`, the unit tests and the e2e suites were **not** run for this spec. The only checks were reading the files and `grep`.
- No browser measurement. The 390 px overflow of the evidence table is the one recorded in POSTEP batch 3 (line ~489), not a fresh measurement. The 320 px overflow of the Copilot evidence table was **not** measured; the story and the e2e check in phase 2 must measure it. The 320 px overflow listed in POSTEP stage 5 (line ~687) is for the storefront documentation pages, not Copilot, and is out of scope.
- The suggested-question buttons at 320 px were fixed earlier (POSTEP line ~701); this spec keeps them under A11 but did not re-measure them.
- The owner account was not used in this pass, so the Copilot screens were not seen in the running app. The state map comes from the code and from the E05 Storybook page, not from a screen.
- The container-query breakpoint (about 36 rem) is a proposal; the table's real width with four columns at 14 px was not measured.
- The status variant and priority variant pairs (B2.16 and B2.17 contrast numbers) were taken from POSTEP; the new combinations (for example `success` on a `card` in dark mode) are not in the contrast table and must be counted with `node .ai/design/kontrast/run.mjs` before phase 3 is built (A16).
- The Copilot evals and the provider were not run. No behaviour of the model, the fallback or the rate limits was tested; this spec changes presentation only.
- The sign-in route `/admin/sign-in` was confirmed by its folder; the link text and the behaviour after sign-in were not checked in the app.
- The e2e suites' full selector list was taken from grep of `admin-copilot*.e2e.test.ts` and `admin-mobile.e2e.test.ts`; a run may show selectors not caught by the grep.
- The `.ai/runs/` log (CLAUDE.md, autonomous runs) was not written, because the task asked for the spec file only.

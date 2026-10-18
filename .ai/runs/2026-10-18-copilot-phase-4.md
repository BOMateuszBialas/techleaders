# Run: Commerce Copilot Phase 4 — recommendation actions (#26)

- Date: 2026-10-18
- Spec: `.ai/specs/implemented/2026-10-17-commerce-copilot.md` (Phase 4, steps 16–18; A13–A15, A20)
- Branch / worktree: `feat/copilot-phase-4-actions`, `.ai/tmp/om-auto-create-pr/copilot-p4` (from `origin/main` a36eb3f)
- Mode: autonomous (om-auto-implement-spec / om-auto-create-pr discipline)

## Goal

Save, dismiss and complete Copilot recommendations: store status and time, only valid transitions, no session refused, never change store data (#26). The only Copilot migration lands here and stores both answer origins and traffic evidence with demo flags (A20).

## Steps

1. **Core** (`5b6b2f4`): `domain/copilot/recommendation-status.ts` (A14 transition table, `StaleRecommendationStatusError`), `domain/copilot/copilot-recommendation.ts` (origins, fallback reasons, priorities, evidence record), `CopilotRecommendationRepositoryPort`, `SaveCopilotAnswerUseCase`, `ListCopilotRecommendationsUseCase`, `ChangeRecommendationStatusUseCase`, status-change schema. Unit tests for every allowed and disallowed pair, stale, not-found, malformed id.
2. **Database** (`ab38ebf`): `CopilotRecommendationSchema` (`defineEntity`, registered), migration created with `npm run db:migration:create` against a throwaway PostgreSQL 17 container (never the dev DB), renamed `Migration20261018180016_copilot_recommendations`, SQL reviewed against the Data Model; re-running create reported no changes. `DatabaseCopilotRecommendationRepository` (one multi-row insert; conditional status update). Integration: drift, every check rejects a bad row, both origins and demo evidence stored, stale and not-found, a two-fork race (exactly one wins), store snapshot unchanged, deleted product readable, migration down/up.
3. **AI + wiring** (`cab69f6`): `AskCopilotUseCase` stores every answered question's recommendations (provider/model/prompt version for LLM only) and returns `answerId` and ids; container registrations (scoped); app integration test saves and completes through the container.
4. **UI** (`8b3c567`): `changeRecommendationStatus` via `runAdminAction` (no-session unit test), `RecommendationStatusFormView` + `RecommendationStatusForm`, status actions on every stored card, "Your recommendations" (`SavedRecommendationsView`, `load-copilot.ts`, `?page=`), guard inventory.
5. **E2E** (`f5d719e`): `admin-copilot-actions.e2e.test.ts` (save → listed; complete → no actions; dismiss → not listed; signed out → sign-in). `resetCopilotQuestionBudget()` in every Copilot suite (#62).
6. **Docs**: README, AGENTS.md (Copilot rules), BACKWARD_COMPATIBILITY.md §1, §2, §5; spec notes (Phase 4, A19 `demo_labels` and prompt version) and moved to `implemented/`; lesson.

## Decisions

- A second e2e owner is impossible (exactly one owner, `createOwner`), so the e2e budget fix resets the owner's `copilot:ask:*` buckets in the throwaway database instead.
- An answered question without recommendations stores nothing and returns `answerId: null`.
- A failed insert fails the request (500) rather than showing cards whose buttons cannot work.
- Plain `(status, created_at)` index (B-tree scans backwards for `desc`), no expression index.
- Status buttons use `aria-label` "Save: <title>" (agent-browser did not compute the name from an `sr-only` span).

## Outcome

See the PR for gate results, review and QA.

## Follow-ups

- Undo of a dismissal (additive transition) if the owner asks for it.
- Retention of never-actioned `new` rows (audit data, A13) once volume matters.

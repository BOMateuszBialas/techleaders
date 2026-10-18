# 2026-10-18 — Copilot follow-ups (#63, #65, #67)

**Goal:** fix the small Commerce Copilot follow-ups left by the reviews of #61, #64 and #66, on one branch (`fix/copilot-followups-63-65-67`), one PR, full gate. #59 (dev server DI) is out of scope.

## Steps and decisions

### #67 — answer card status, generic paging helpers
- **Stale answer card.** The answer card and the "Your recommendations" card of one recommendation each kept their own status. Chosen fix (not the "snapshot" label): a page-level client context, `RecommendationStatusesProvider` (`components/admin/copilot/recommendation-statuses.tsx`), shares every status a card's action returned. `RecommendationStatusForm` wraps its action with `reportingStatusAction` and passes the reported status to the view; `shownRecommendationStatus` prefers the reported status, then the card's own, then the rendered one, and hides the card's own message once the other card changed the status. The reducer, the reporting action and the choice live in `recommendation-copy.ts` (unit-covered); the wrapper and provider stay thin.
  - Covers completing *and* dismissing from the list (a dismissed card leaves the list, but its report stays in the provider).
  - Limitation: a change made in another browser tab is still shown only after the next action or reload (as before; the stale-conflict path already corrects it on the next press).
- **Paging helpers.** `parseAdminOrderPage`/`adminOrderPageSchema` became `parseListPage`/`listPageSchema` in `core/src/validators/common/list-page.schema.ts`; `firstQueryValue` moved to `app/src/lib/first-query-value.ts`. Orders and Copilot both import the common modules; no Copilot module imports an orders helper.

### #63 — Phase 3 traffic nits
1. `trafficSourcesSummary` sorts by `sessions.number`, not the display string. Regression test with a formatted value ("1 000").
2. Rule 5 compares unrounded ratios: rate facts carry `ratio` (never serialised to the model; `serializeFactContext` is an allowlist). Tests at the threshold (0.025 vs 0.0249 against 5%, both shown as "2.5%") and for a store rate under 0.05% (shown as "0%").
3. `summaryEvidence` from the model: **already covered**, no change. `copilotModelOutputSchema` (Phase 2) has no `summaryEvidence`/`evidence` fields, Zod strips them, and `copilot-model-output.schema.test.ts` ("never takes evidence values from the model ... (#63)") asserts both the parse result and the Gemini JSON schema. `summaryEvidence` is only expanded server-side from `summaryFactIds` (`expand-response.ts`).

### #65 — Gemini adapter
- Rejected attempts keep their usage: `LlmOutputInvalidError` and `LlmProviderUnavailableError` take `usage`; the adapter attaches it to every error raised after a response (empty, bad JSON, schema mismatch, refusal, early finish). `generateAnswer` adds `llmUsageOf(error)` before classifying the failure.
- No SDK `console.warn`: the adapter reads `candidates[0].content.parts` text parts without `thought`, never `response.text` (test: a `text` getter that throws, plus a `console.warn` spy).
- Finer cause: `LlmProviderUnavailableError.causeCode` for `provider_error` (`bad_request`, `not_found`, `server_error`, `http_<status>`, `network`, `finish_<reason>`); logged as `providerCause` in `copilot.answer` (only when it matches `^[a-z0-9_]{1,40}$`). The fallback reason stays `provider_error`.

## Verification
- `npm run lint`, `format:check`, `typecheck`, `test:coverage` (1391 tests, 100%): pass.
- `build`: pass. `test:integration`: 139 tests pass. `test:e2e`: 83 tests pass (the Phase 4 suite now checks the answer card after completing in the list).
- No real Gemini call: unit tests stub the client; e2e blanks `LLM_*`.

## Follow-ups
- None required. #59 (dev server DI) stays open.

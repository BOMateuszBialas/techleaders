# Run: Commerce Copilot cross-model review fixes (2026-11-09)

- Branch: `fix/copilot-review-2026-11-09` from `main`. Review replies cherry-picked from `docs/e05-cross-model-review` (commit `b4cbbef`), which holds the only copy of the file.
- Spec: `.ai/specs/implemented/2026-10-17-commerce-copilot.md`, section "Recenzja innym modelem (2026-11-09)" (verdict table, 25 rows).

## Changes

- LOG-01: one daily-cap unit per answer before the first attempt; a retry only checks availability (`packages/ai/src/copilot/generate-answer.ts`).
- SEC-02 / INJ-01: product names and SKUs sanitized and capped (`packages/ai/src/grounding/catalog-text.ts`, `packages/ai/src/copilot/build-facts.ts`); the quoted-name exception in `hidden_character` removed.
- GAP-01: `summary` column on `copilot_recommendations` (migration `Migration20261109161321_copilot_recommendation_summary`, generated from the entity change with `db:migration:create` against a temporary database); entity, adapter, port, tests.
- GR-02: causal check in every free-text field, paraphrases added; prompt rule 5 and version `copilot-2026-11-09.1`.
- GR-03: `no_evidence` check.
- Spec section and verdicts; lessons; this log.

## Validation

- `npm run typecheck`: clean.
- `npm run test:coverage`: 220 files, 2394 tests, 100% statements, branches, functions, lines.
- `npx vitest run --project integration` on `database-copilot-recommendation-repository.int.test.ts`, `database.int.test.ts` (drift) and `packages/app/src/server/copilot`: see the final report.
- `npx eslint` on the changed .ts/.tsx files: no errors (migration ignored-file warning expected).
- `npx prettier --check` on the changed folders: clean.

## Notes

- The cap now counts answers, not attempts (owner decision LOG-01). Worst case is twice the cap in attempts per day; the spec asks the owner to confirm.
- The product-description drafts use the same cap helper with the same retry shape. Not changed here (outside Copilot scope); listed as an open item in the spec.

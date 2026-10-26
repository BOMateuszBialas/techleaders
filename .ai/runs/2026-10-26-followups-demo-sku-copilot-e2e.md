# Run: follow-ups from the storefront reviews (demo SKU case, Copilot e2e flake)

Date: 2026-10-26. Branch: `fix/followups-demo-sku-copilot-e2e` from `origin/main` (12da918).

## Goal

1. Check whether the demo-text migration's SQL (`sku like 'DEMO-%'`) disagrees with the code's SKU rule (`isDemoSku`: trimmed, upper-cased). Fix it without touching stock, prices, statuses or orders.
2. Find the cause of the flaky admin-copilot e2e test "declines a margin question".

## Steps and decisions

### 1. SKU case

- Every "is demo" decision by SKU: `isDemoSku` (ai description sources and the product import row schema, both `toUpperCase().startsWith`), and the migration SQL (`like 'DEMO-%'`). Order references: `isDemoOrderReference` (`startsWith`) and `DEMO_ORDER_REFERENCE_LIKE` (`like`). Both are case-sensitive, so they agree.
- The SKU rule did disagree with the SQL. Lower-case and space-padded `DEMO-` SKUs count as demo in code but not in SQL.
- Impact is limited: the write path (`normalizeSku`) stores SKUs trimmed and upper-cased, and the seed uses upper-case SKUs. So such a row needs a direct SQL edit. The only effect is a leftover "[DEMO] " text prefix. No stock, price, status, order or data is lost.
- Decision: the applied migration `Migration20261026120000_demo_text_prefix` is not edited. The new migration `Migration20261026190000_demo_sku_case` strips the prefix where `upper(btrim(sku)) like 'DEMO-%'`. Its `down` is a no-op, like the original.
- The discriminator now lives in one place: `packages/core/src/domain/products/demo-sku.ts` (`DEMO_SKU_PREFIX`, `DEMO_SKU_LIKE`, `isDemoSku`). The import row schema and packages/ai use it.
- Known residual difference: `btrim` strips spaces only, while JS `trim` also strips tabs and newlines. The write path cannot store those characters.
- Tests: unit `demo-sku.test.ts`; integration case in `demo-text-prefix.int.test.ts` (lower-case and padded SKUs). With the new migration moved away, that case fails (RED confirmed).

### 2. Copilot e2e flake

- Cause: the "declines a margin question" assertion counted `main [data-testid="copilot-recommendation"]` and expected 0. That selector also matches the cards in "Your recommendations", which is rendered on the same page. `admin-copilot-actions.e2e.test.ts` leaves one completed recommendation in `copilot_recommendations` at the end. Vitest orders e2e files by cached duration, so the margin test failed when it ran after that suite.
- Reproduced: with the pre-fix test file, a shuffled run (`--sequence.shuffle --sequence.seed=7`) ran the margin test after saved actions data and failed with `expected 1 to be +0`. The default file order did not reproduce it in three attempts (vitest kept `admin-copilot` first).
- Fix (test-only, assertion not weakened):
  - the count is scoped to the answer (`ANSWER_RECOMMENDATION`), which is what the test means;
  - the signed-in `beforeAll` also calls `clearCopilotRecommendations()`, so the suite does not depend on other suites' saved data.
- After the fix, the same shuffled run passes the margin test. The actions suite's own tests fail under test-level shuffling because that suite relies on its own order. This is a property of the shuffle flag, not a regression.

### 3. Integration failure found during the gate (not part of the original scope)

- `description-draft.int.test.ts` runs `seed.ts` on the shared integration container without resetting it. When `demo-store` or `demo-text-prefix` ran first and left renamed demo orders, the re-seed failed with `orders_pkey` duplicate.
- Pre-existing order dependence, the same class as the e2e flake. Fix: the test's `beforeAll` drops and recreates the public schema before migrating, as the other integration files do.

## Gate results

See the PR description for the final list. Summary of this run:

- lint, format:check, check:tokens, check:agents, typecheck, test:hooks, test:coverage (2091 unit tests, 100%), build: pass.
- test:integration: 190 passed (after the description-draft fix; one failure before it).
- test:e2e: 137 passed, twice in the default order (runs with the fix). Plus the shuffled pair above.

## Follow-ups

- Make the e2e Copilot suites independent of file order without the shuffle workaround: each suite could reset its own saved recommendations.
- Consider one shared SQL rule for the order and SKU discriminators in a single core module (the migration text is frozen, so the test asserts the rule).
- `btrim` versus JS `trim` for control whitespace (see the residual above).

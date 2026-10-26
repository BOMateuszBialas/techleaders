# Run: storefront design, Phase 1 (2026-10-26)

## Goal
Implement Phase 1 of `.ai/specs/2026-10-26-storefront-design-implementation.md`: remove storefront demo framing, fictional footer block, one test-payment note, `[DEMO]` text removed from seed and existing demo rows (OA-4a), AI demo marker moved to the `DEMO-` SKU (OA-3).

## Steps
1. Worktree `../wt-p1` on `feat/storefront-phase-1` from `origin/spec/storefront-design-implementation`; `npm ci`.
2. Storefront copy, footer, shell banner removed; checkout/pay/account copy; admin shipping label.
3. Seed text without prefix; one-off data migration `Migration20261026120000_demo_text_prefix` plus integration test.
4. Core: optional `sku` on `descriptionDraftSchema`; admin client sends it.
5. AI: `isDemoSku` replaces `isDemoNotes`/`stripDemoMarker`/`DEMO_PREFIX`; eval fixtures and checks updated.
6. Unit, integration, build and e2e tests updated.

## Decisions
- Hero description: the "Everything here is demo data" sentence removed in Phase 1 (spec table defers it to Phase 4; Q4 and D1 say all demo wording goes now).
- Admin shipping label "free (demo store)" changed to "free" (spec lists `admin-orders` e2e for it).
- Admin `DEMO_PAYMENT_LABEL` ("Demo payment (no money charged)") kept: admin text, not in the spec inventory.
- `core` import reservation of `[DEMO]` text (product import) kept unchanged: validation outside Phase 1 scope; its help text still mentions `[DEMO]` in admin.
- Story files under `packages/app/stories/` and DS docs keep old wording (not storefront).

## Outcome
- Unit: 172 files, 1971 tests, 100% coverage.
- Integration: 21 files, 184 tests (incl. new migration test).
- E2E: 23 files, 121 tests.

## Follow-ups
- OA-8 register check for "CommerceOS Demo Shop" (pre-merge, not run here).
- Decide on the product-import `[DEMO]` reservation and admin demo copy wording.
- R11 brief PR must merge before Phase 1 merges (not part of this branch).
- Phase 2 (cart drawer) starts after this PR.

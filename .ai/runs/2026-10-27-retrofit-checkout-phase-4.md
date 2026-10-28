# Run: retrofit checkout phase 4 (store error page)

Date: 2026-10-27. Branch `feat/retrofit-checkout-phase-4` from `origin/main` (2301582). Spec: `.ai/specs/2026-10-26-retrofit-checkout-cart.md`, Phase 4 (C10, OA-6, owner-approved).

## Changed

- `packages/app/src/app/(storefront)/error.tsx` (new): client error boundary; renders the view with `reset` as the retry handler.
- `packages/app/src/components/storefront/storefront-error-view.tsx` (new): hook-free view on `ErrorState` (h1 title, description, "Try again" button when a retry is given, outline link to `/products`).
- `packages/app/src/components/storefront/storefront-error-view.test.ts` and `packages/app/src/app/(storefront)/error.test.ts` (new): unit tests.
- `packages/app/src/components/storefront/storefront-copy.ts`: four OA-6 string constants.
- `packages/app/stories/design-system/WhatIsMissing.mdx`: the "Every page error" row (Prettier realigned the table).
- `.ai/lessons.md`: one lesson (error boundary `reset` vs `retry`).

Not added: `global-error.tsx`, `not-found.tsx` (the spec names only `error.tsx`).

## Decisions

- `reset()` kept as approved in OA-6. Next 16.4 (installed) gives both `reset` and `retry`; its docs recommend `retry` for a failed server render because it re-fetches, and the admin boundary uses `retry`. Owner to confirm; switching is a one-line change.
- Copy is the OA-6 proposal from the spec, verbatim, including the spelling "catalogue".

## Gates (worktree, Windows)

- lint, format:check (after Prettier on the MDX table), check:tokens, check:agents, typecheck: pass.
- test:coverage: 195 files, 2162 tests, thresholds met.
- build: pass (error boundary compiles under cacheComponents).
- test:integration: 24 files, 203 tests pass.
- test:e2e: 25 files, 144 tests pass (no new e2e; see below).
- build-storybook: pass. test:storybook:themes: 74 files, 360 tests pass.

## Not done

- No e2e for the error page: no safe way to force a render error in the e2e environment without a test hook.
- No visual check at 320 and 1440 px, light and dark: the error state cannot be reached in the running app without breaking the database. Manual steps from the spec (stop the database, load `/products`, restart, press Try again) were not run.
- No Storybook story (the spec does not name one).

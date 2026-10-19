# Run: fix #59, dev server layers rebuild each other's DI container

- **Date:** 2026-10-18
- **Goal:** in `next dev`, alternating page and API requests must not dispose the cached DI container, while a hot reload still rebuilds it (issue #59, follow-up from #57).

## Steps

1. Read `container.ts`: outside production the cache owner was a per-evaluation `Symbol` (#35), so every evaluation of the module treated any other evaluation's container as stale and disposed it at once.
2. Probe in `next dev` (temporary log, not committed): the module is evaluated once per server layer, and the bundled code differs per layer (Turbopack import names carry `[app-route]` / `[app-rsc]`). A fingerprint of the class sources therefore cannot tell a sibling layer from a hot reload; a fingerprint of registration names alone would keep old class code after an edit until a restart.
3. Fix: each evaluation takes a process-wide generation number (a counter on `globalThis`). A newer evaluation replaces an older container; an older evaluation reuses the newer container instead of replacing it back. A replaced container is disposed after a 30 s grace period (`STALE_CONTAINER_GRACE_MS`, timer `unref`ed), so requests and Better Auth calls still running on it finish. Production keeps one shared generation (0), as in #57.
4. Verified in `next dev` with a temporary log: alternating `/`, `/api/health`, `/admin`, `/products`, `/admin/orders` three times built the container twice at start-up (route layer, then the first page layer) and never again; after editing `container.ts` each layer rebuilt once on its next request, then stayed stable.

## Tests

- `container-hot-reload.test.ts`: new #59 test (two evaluations: the older one reuses the newer container; only the replaced container closes, after the grace period). It and the two updated stale-container tests fail on `main`.

## Outcome

Fixed. Gate results are in the PR body.

## Follow-ups

- None. A layer that has not re-evaluated after an edit uses the newer container until its next request re-evaluates it (seconds in practice).

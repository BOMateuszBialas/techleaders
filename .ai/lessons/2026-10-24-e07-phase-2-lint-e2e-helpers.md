# 2026-10-24 — E07 Phase 2: lint treats e2e helpers named `use*` as React hooks; a migration guard needs a lock; split phases by consumer

- `react-hooks/rules-of-hooks` runs on e2e files too. A helper that calls `useCustomerSession()`, or is itself named `use…`, fails lint when it is called from a named function or a loop. Name such helpers without `use` and call `browser().setCookieHeader(...)` directly.
- A `down` migration that checks data before dropping (D-d: "refuse while account orders exist") must `lock table` first. Otherwise a row committed between the check and the `alter table` slips through. The migration's own transaction makes the lock safe.
- An in-memory fixture whose ids are not uuids breaks as soon as a use case validates ids with `isUuid` before querying. Use uuid ids in fixtures.
- The logger redacts any context key that matches `/session/i` (also `sessionStatus`). Log a session outcome under a neutral key such as `outcome`.
- When a phase split would ship use cases with no consumer yet, move them to the phase that uses them and record it, as Phase 1 did with `toOrderViewer`.

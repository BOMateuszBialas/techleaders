# Run: fix #57, intermittent "Failed to get session" 500

- **Date:** 2026-10-17
- **Goal:** make Better Auth's internal errors diagnosable (log a sanitized cause) and, if possible, fix the root cause of the intermittent e2e 500 on `POST /api/admin/copilot/answers`.

## Steps

1. Read Better Auth 1.7 `getSession`: its catch-all calls `logger.error("INTERNAL_SERVER_ERROR", error)` and throws `FAILED_TO_GET_SESSION`; our adapter dropped `error`.
2. Read the failed CI log (run 39057123214, attempt 1): no cause logged, as expected.
3. Hypothesis: `container.ts` stamps its `globalThis` cache with a per-evaluation `Symbol` (#35, dev hot reload). Built the app and found the container module in 5 server chunks with different module ids (route vs page layers).
4. Probe against a production build (`next start` + Testcontainers PostgreSQL, temporary instrumentation, not committed): alternating `GET /`, `GET /api/health`, `POST /api/admin/copilot/answers`, `GET /admin` logged "stale container disposed" on every layer switch, and Better Auth was re-created each time (its low-entropy warning repeated). Disposing closes the ORM and Better Auth pools, so a request in flight on the other layer fails: the observed "Failed to get session".
5. Fix: production uses one shared owner (`Symbol.for("commerceos-container-production")`); the per-evaluation key stays for development. Re-ran the probe: no disposal, Better Auth built once.
6. Logging: `createAuthOptions` passes `summarizeAuthError(firstErrorArg)` (class, code, constraint, bounded cause chain; a driver/network error's message is dropped, others truncated to 200 chars) to `AuthLog`; `logAuthMessage` logs it as `{ error }` context through the redacting logger. Other library arguments (request data) are still never logged.

## Tests

- `container-hot-reload.test.ts`: two evaluations of `container.ts` under `NODE_ENV=production` share one container and never close its ORM (fails on `main`).
- `create-auth.test.ts`: error summary forwarded, request-like argument dropped; driver/ORM/network messages dropped; bounded cause chain; non-errors ignored.
- `container.test.ts`: the summary reaches `logger.error` as context.

## Outcome

Root cause found and fixed; logging added. Gate: lint, format, typecheck, unit coverage 100%, build, integration, e2e.

## Follow-ups

- In `next dev` the layers can still dispose each other's container (per-evaluation key is kept there for hot reload); acceptable for development.

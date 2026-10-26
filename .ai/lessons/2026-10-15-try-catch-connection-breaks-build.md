# 2026-10-15 — `try/catch` around `headers()`/`connection()` breaks `next build`

A route handler wrapped in `apiHandler` logged "During prerendering, `connection()` rejects…" as an unhandled route error at build time. Call `await connection()` before entering the try/catch (as `/api/health` and `adminApiHandler` do), or `unstable_rethrow(error)` in the catch.

# 2026-10-13 — Next 16 Cache Components

Request-time data (DB, health) must call `await connection()` and sit inside `<Suspense>`. The `react-hooks/error-boundaries` lint rule forbids building JSX inside try/catch, so load data in a helper and render outside it.

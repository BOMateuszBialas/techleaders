# 2026-10-13 — MikroORM `checkConnection()` on a lazy ORM

An ORM built with `new MikroORM(config)` (no `connect()`) reports `{ ok: false, reason: "Connection not established" }` from `checkConnection()` until a query opens the pool, so `/api/health` was always "down". Health checks run `em.fork().execute("select 1")`, which connects on demand. Integration tests must also exercise the ORM the way the app builds it, not only via `MikroORM.init`.

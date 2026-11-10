# ORM connection URLs with `sslmode=require` need an explicit TLS option

**Symptom:** `read ECONNRESET` on every query against a managed Postgres, while a plain `pg` client with TLS connected fine.

**Cause:** `createOrmConfig` passes `clientUrl` and fields, not the URL's query string, so `sslmode` never reached the driver.

**Fix:** `sslOptionsFor(url)` in `packages/database/src/config.ts` maps `sslmode` (other than `disable`) to `driverOptions.ssl = { rejectUnauthorized: true }`. Covered by unit tests in `config.test.ts`.

**How to apply:** when a hosted database resets connections, compare a raw client with the ORM before changing the network or the host.

# Prisma Compute runs the Next.js standalone server under Bun, with env vars and TLS to the DB

**Symptom:** a deploy created the service, but the health check returned 500 (`APP_URL is required in production`), and then a database `ECONNRESET`.

**Facts (checked live on 2026-11-10):**
- `npx prisma deploy` builds nothing: run `npm run build -w @commerceos/app` first. Dockerfiles are not used.
- The Next.js service receives project environment variables at runtime. `process.env` works in the app code, although the Composer principle prefers service inputs.
- Changing a variable does not redeploy. Promote or deploy again. A deploy with unchanged code can be a no-op, so add a comment change to force a new version (or promote).
- Deploy state is tied to the root app name. Using `appRoot("commerceos")` attached the deploy to an old project that already held a hand-made database. Use a name that matches the new project.
- The database needs TLS. MikroORM builds the pg client from fields, so the `sslmode` query parameter is ignored unless it is passed as `driverOptions.ssl`.
- Only the live version is kept. Rollback is a redeploy of the previous source.

**How to apply:** check `prisma project env list` and the service logs first. For a DB `ECONNRESET`, test `sslmode` with a plain `pg` client (ssl true vs false) before changing code.

Related: [[2026-11-10-prisma-compute-deploy]].

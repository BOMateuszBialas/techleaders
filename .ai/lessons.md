# Lessons Learned

Long-term memory for LLM agents. Add an entry after fixing a bug, or whenever you find something worth remembering.
Keep entries short; put longer write-ups in `.ai/lessons/YYYY-MM-DD-slug.md` and link them here.

## Entry format

- **YYYY-MM-DD — Title**: what happened, the lesson / improvement, and (optional) link to `lessons/YYYY-MM-DD-slug.md`.

## Lessons

<!-- Newest first -->

- **2026-10-13 — agent-browser daemon keeps stdout open**: the first command of a session starts a background daemon that inherits the CLI's stdout pipe, so `execFile` (which resolves on stdio *close*) hung until its 30 s timeout, and a catch that read `error.stdout` silently swallowed the timeout. Run the CLI with `spawn` and resolve on the `exit` event (`packages/app/e2e/support/agent-browser.ts`); never treat a timeout as a normal result.
- **2026-10-13 — Vitest alias `"@/"` as an object key**: it did not resolve `@/…` imports inside real modules (only mocked ones), failing with "Cannot find package '@/server/logger'". Use the array form with a regex: `{ find: /^@\//, replacement: … }`.
- **2026-10-13 — Awilix cradle proxies in `expect`**: comparing objects whose fields are the cradle proxy with `toBe`/`not.toBe` can make Vitest walk the proxy and throw `AwilixResolutionError: Could not resolve 'size'`. Compare identity with `===` and assert the boolean.
- **2026-10-13 — MikroORM `checkConnection()` on a lazy ORM**: an ORM built with `new MikroORM(config)` (no `connect()`) reports `{ ok: false, reason: "Connection not established" }` from `checkConnection()` until a query opens the pool, so `/api/health` was always "down". Health checks run `em.fork().execute("select 1")`, which connects on demand. Integration tests must also exercise the ORM the way the app builds it, not only via `MikroORM.init`.
- **2026-10-13 — ESLint flat config `no-restricted-imports`**: a later config object with the same rule *replaces* (does not merge) the options of an earlier one for overlapping files. Keep package-boundary blocks on non-overlapping globs (`packages/<name>/src/**`) and carve out exceptions with `ignores`.
- **2026-10-13 — Docker on the dev machine needs Virtual Machine Platform**: Docker Desktop starts, but the API returns HTTP 500 because "Virtual Machine Platform not enabled / No virtualization available" (see `%LOCALAPPDATA%/Docker/log/host/com.docker.backend.exe.log`). It needs admin rights and a reboot to fix; the alternative is a hosted Postgres via `DATABASE_URL`.
- **2026-10-13 — MikroORM 7 specifics**: use `defineEntity` + `p.*` builders (no decorators). `new MikroORM(config)` is synchronous and connects lazily, so it works in the DI container and in unit tests without a DB. `orm.schema.getCreateSchemaSQL()` generates DDL with no DB connection. Migrator and seeder are extensions (`extensions: [Migrator, SeedManager]`) available as `orm.migrator` / `orm.seeder`.
- **2026-10-13 — Next 16 Cache Components**: request-time data (DB, health) must call `await connection()` and sit inside `<Suspense>`. The `react-hooks/error-boundaries` lint rule forbids building JSX inside try/catch, so load data in a helper and render outside it.
- **2026-10-13 — shadcn/ui 4 uses the `cn` package**: `shadcn init` (style `base-nova`) installs `cn` (by shadcn, repo shadcn-ui/cn) instead of `clsx` + `tailwind-merge`, plus `@base-ui/react`. It is legitimate, not a typosquat.
- **2026-10-13 — Monorepo gitignore**: create-next-app patterns are root-anchored (`/.next/`, `/node_modules`). In the monorepo they must be unanchored (`.next/`) or `packages/app/.next` gets tracked.
- **2026-10-13 — Writing many files at once**: one long Bash chain with several heredocs failed to parse as a whole (nothing ran). Use the Write tool per file instead.

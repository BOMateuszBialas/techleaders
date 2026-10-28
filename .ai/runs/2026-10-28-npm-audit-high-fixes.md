# Run: npm audit high fixes (2026-10-28)

**Goal:** remove the 5 high and 2 moderate production-tree vulnerabilities reported by `npm audit --omit=dev`, the first step of the certificate item "skanowanie zależności" (see `WYMAGANIA-CERTYFIKAT.md`).

**Scope:** `package-lock.json` only. No `package.json` changes, no `--force`, no `.github/` changes (maintainer-owned: Dependabot config is left for the owner).

## Before

`npm audit --omit=dev`: 8 vulnerabilities (1 low, 2 moderate, 5 high). High: `shadcn` 4.21.4 (direct, via `@shadcn/registry`), `undici` 7.30.0, `zod` < 4.6.6 (nested under `@shadcn/registry` and `shadcn`), `body-parser` 2.x (via `express`).

## Change

`npm audit fix --omit=dev` (non-breaking only). Resolved versions:

| Package | Before | After |
|---|---|---|
| shadcn | 4.21.4 | 4.23.0 |
| @shadcn/registry | 0.1.3 | 0.2.1 |
| undici | 7.30.0 | 7.30.1 |
| deepmerge | < 4.2.0 | 4.3.1 |
| zod (nested under shadcn) | < 4.6.6 | 4.6.7 |

Side effect: shadcn 4.23 no longer pulls its MCP server dependencies (`express`, `hono`, `@modelcontextprotocol/sdk`, and about 60 lockfile entries in total). The project does not use the shadcn MCP server. Diff: 63 removed `node_modules/` entries, 69 lines added.

## Validation (local)

| Command | Result |
|---|---|
| `npm run lint` | 0 errors, 2 pre-existing warnings (`<img>` in product gallery, not touched here) |
| `npm run format:check` | pass |
| `npm run typecheck` | pass |
| `npm run check:tokens` | pass (268 files) |
| `npm run test:hooks` | 334/334 checks pass |
| `npm run test:coverage` | exit 0, 190 files, 2119 tests pass, 100% gate |
| `npm run build` | exit 0 |
| `npm audit --omit=dev` after fix | 3 low severity left (`deepmerge` range and `shadcn`'s own range, fix only with `--force`, which is breaking) |

Not run locally: integration and e2e (need Docker and agent-browser). CI runs them on the PR.

## Remaining gaps

- The 3 low findings are left for the owner to decide (`npm audit fix --force` is breaking).
- gitleaks is not installed on this machine; the secret-scan job is not in CI yet (needs a maintainer-approved workflow change).
- Dependabot config is not added (owner approval, see above).

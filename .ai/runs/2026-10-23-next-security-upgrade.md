# Run: Next.js security upgrade (16.4.0 → 16.4.1)

- Date: 2026-10-23
- Branch / worktree: `chore/next-security-upgrade`, `../wt-next-upgrade` (from `origin/main` fd12054)
- Mode: autonomous, requested by the user

## Goal

`next build` on `next@16.4.0` once aborted with a `SecurityFatalError` (known vulnerability). Upgrade to the smallest patched version within 16.x, with no major bump and no other stack changes.

## Advisories (all fixed in 16.4.1)

| Advisory | Severity | Summary | Affected | First patched |
|---|---|---|---|---|
| [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw) | critical | Unauthenticated RCE in the Image Optimization API when SVG files are used | 16.0.0–16.4.0 | 16.4.1 |
| [GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr) | critical | Unauthenticated RCE in `use cache` functions returning typed arrays | 16.0.0–16.4.0 | 16.4.1 |
| [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) (CVE-2026-94482) | high | DoS in the App Router using Server Actions | 16.0.0–16.4.0 | 16.4.1 |

## Versions

| Package | Before | After |
|---|---|---|
| `next` (`packages/app`, pinned exactly) | 16.4.0 | 16.4.1 |
| `@next/env`, `@next/swc-*` (transitive) | 16.4.0 | 16.4.1 |
| `eslint-config-next` (root) | `^16.4.0` (16.4.0) | `^16.4.1` (16.4.1) |
| `@next/eslint-plugin-next` (transitive) | 16.4.0 | 16.4.1 |
| React / React DOM | 19.3.0 | 19.3.0 (unchanged; Next 16.4.1 peers `^19.0.0`) |

The lockfile diff changes only these 12 Next.js package entries.

## Steps

1. Ran `npx next upgrade --agent=security` in `packages/app`. It changed no files; it printed a prompt for a coding agent that targets 16.4.2, asks to set `experimental.agentUpgrade` in `next.config.ts` and to run a telemetry command from a canary build. None of that was adopted: 16.4.2 adds no security fix over 16.4.1 (its release notes list Turbopack backports and docs), the config flag is not needed for the upgrade, and the telemetry call is outside the task.
2. Read the advisories with `gh api advisories/<GHSA>` (`first_patched_version`) and the v16.4.1 release notes (a security-only release listing exactly these three advisories).
3. `npm install -w @commerceos/app --save-exact next@16.4.1` and `npm install -D eslint-config-next@16.4.1` (a bare `^16.4.1` range resolved to 16.4.2, so the exact spec pins the lockfile to the matching version).
4. Breaking changes: none. It is a patch release with no deprecation notices; no code or config changed. The AGENTS.md Stack table says "Next.js 16.4", which still holds.
5. `npm audit` no longer reports `next`. Remaining audit findings (`braces` via `fast-glob` in shadcn, ts-morph, awilix) are unrelated dev/tooling transitive deps and out of scope.

## Gate (local, Windows, in the worktree)

| Check | Result |
|---|---|
| `npm run lint` | pass |
| `npm run format:check` | pass |
| `npm run typecheck` | pass |
| `npm run test:coverage` | pass: 138 files, 1629 tests, 100% statements/branches/functions/lines |
| `npm run build` | pass: `Next.js 16.4.1 (Turbopack)`, no `SecurityFatalError` |
| `npm run test:integration` | pass: 16 files, 144 tests |
| `npm run test:e2e` | pass: 19 files, 95 tests |

## Outcome

A dependency-only PR. Follow-up: none required; consider a separate ticket for the transitive `braces` advisory if it matters for tooling.

# Run: release and rollback procedure for 1.0.0 (2026-11-09)

- Branch: `docs/release-1-0-0-procedure` from `origin/main`. Docs only; no code, no `package.json` change, no `.github/` or `.claude/` change.
- Lesson: `lekcja-22.md` (release management). Plan: `.ai/analysis/2026-11-09-week5-plan.md`, section 4 (PR #228).

## Changes

- `docs/releases/1.0.0.md`: operator notes for the tag `v1.0.0` (environment variable names, 17 migrations in order, breaking changes: none, version question, verification record). There was no existing release-docs place, so the file is new.
- `docs/releases/procedure.md`: release and rollback procedure, generic; platform steps marked "to fill in when the platform is chosen".
- `README.md`: the "Rollback: not defined yet" bullet now links to the two files.
- `.ai/lessons.md`: one lesson (no CLI runs a `down` migration).

## Validation

- Temporary worktree at tag `v1.0.0`: `npm ci` exit 0, `npm run typecheck` exit 0, `npm run build` exit 0 with no database or auth variables set in the shell. Worktree removed afterwards.
- `npm run check:agents`: ok. `npm run check:tokens`: ok. `npx prettier --check` on the changed files: clean.
- Not run: unit, integration and e2e tests (docs-only change).

## Open for the owner

- Version rule (package.json 0.1.0 vs tag 1.0.0) and whether to create the GitHub Release `v1.0.0`. See `docs/releases/1.0.0.md`, section 5.
- Hosting platform and its steps in `docs/releases/procedure.md`.

# Run: LF line endings on every platform + document `.ai/cezar/`

- **Date:** 2026-10-14
- **Trigger:** two follow-ups from the PR #3 review (user request)
- **Engine:** om-auto-create-pr (steps: 3, --loop: no)

## Goal

Make the local validation gate behave like CI on Windows, and document the Cezar workspace folder in `AGENTS.md`.

## Scope

1. `.gitattributes`: add `* text=auto eol=lf`. With Git for Windows' default `core.autocrlf=true`, the checkout gets CRLF, so `npm run format:check` (Prettier, `endOfLine: lf`) fails on about 85 files locally while CI on Linux passes. The index is already LF everywhere (`git ls-files --eol`: 460 `i/lf`, 9 empty, 1 binary), so renormalization changes no blob; only working-tree checkouts change.
2. `.ai/lessons.md`: record the finding.
3. `AGENTS.md`: list `.ai/cezar/` in the `.ai/` tree. It is Cezar's workspace (`npx cezar-run`); runtime files are ignored by `.ai/cezar/.gitignore`, while workflows (`.ai/cezar/workflows/`) and skills are committed.

## Non-goals

- No product code, config or CI changes.
- Not ignoring `.ai/tmp/`, which review/fix skills use for worktrees. That is a separate follow-up if wanted.

## Implementation Plan

- Phase 1, line endings: the `.gitattributes` rule plus renormalize check (1.1), then the lesson entry (1.2).
- Phase 2, docs: the AGENTS.md `.ai/cezar/` entry (2.1).

## Risks

- Existing Windows clones keep CRLF files until re-checkout. After pulling, a developer can run `git rm --cached -r . && git reset --hard` (or delete and re-checkout the tracked files) to get LF. The lesson entry says so.

## Outcome

- The `.gitattributes` rule landed. In a fresh worktree checked out with `core.autocrlf=true`, files are LF and the full gate passes: lint, format:check (it failed before), typecheck, unit tests at 100%, build, integration 7/7, e2e 6/6.
- `om-auto-review-pr` gave APPROVE with 1 minor finding (this section was missing). CI passed 5/5 on `f78cdb1`.

## Follow-ups

- `.ai/tmp/` (worktrees of `om-auto-review-pr` / `om-auto-fix-pr`) is not git-ignored. Add it to `.gitignore` if those skills run from the primary checkout.

## Progress

PR: #4

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Line endings

- [x] 1.1 Add `* text=auto eol=lf` to .gitattributes and verify renormalization — fe93651
- [x] 1.2 Record the CRLF lesson in .ai/lessons.md — c354210

### Phase 2: Docs

- [x] 2.1 Document .ai/cezar/ in AGENTS.md — f46bf5b

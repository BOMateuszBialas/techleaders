# Run: agent workshop hardening (course lesson 09)

- Date: 2026-10-23
- Branch / worktree: `chore/agent-workshop-hardening`, `../wt-security` (from `origin/main` c4b07bb)
- Mode: autonomous, requested by the user (all recommendations of the lesson 09 notes approved; the user merges, risk-high)
- Spec: `.ai/specs/implemented/2026-10-23-agent-workshop-hardening.md`; results: `.ai/security-notes.md`

## Goal

Retrofit the lesson 09 defences to a repo whose autonomous pipeline already runs: deny rules for secrets, a blocking PreToolUse hook that also covers the PowerShell tool, CODEOWNERS for agent configuration, an audit of sessions, skills and MCP servers, and one prompt-injection test.

## Steps

1. Read AGENTS.md, SDLC.md, BACKWARD_COMPATIBILITY.md, lessons, the lesson notes and the lab files (read only; no session was started inside the lab, only the read-only lab scripts were run, by path).
2. Session scan (local, no PR content): a copy of `skan-sesji.sh` in the session scratchpad with Gemini (`AIza…`), `BETTER_AUTH_SECRET`, `LLM_API_KEY`, `ADMIN_PASSWORD` and hex heuristics, then a node classifier that separated repo test fixtures and compared with the current `.env` without printing any value. Counts in `.ai/security-notes.md` §4.
3. `agent-audit` / `agent-audit-hot` on the repo, `grep-skille.sh` over the three skill directories, full read of the non-open-mercato skills (`grill-me`, `grilling`, `find-skills`); a subagent read the Cloudflare, claude.ai-synced and `.trash` skills (scripts in full, references grep-scanned). om-* drift checked with `diff -rq` (line endings only).
4. MCP inventory from `~/.claude.json` with a script that prints names, transports and argument *names* only.
5. Verified the Claude Code docs (permissions, hooks, sandboxing): deny-first precedence, gitignore `!` carve-outs in the same deny list, `Read` deny scope (file tools + recognised shell file commands, not arbitrary scripts), hook exit codes, matcher lists, Git Bash as the hook shell on Windows, PowerShell and Monitor inputs in `tool_input.command`, no sandbox on native Windows.
6. Wrote `.claude/settings.json`, the hook and its tests (280 checks under jq and node, plus 9 reported known gaps), wired `npm run test:hooks` into CI (`lint` job step), the gate in `.ai/agentic.config.json`, `SDLC.md` and `AGENTS.md`; `.github/CODEOWNERS`; AGENTS.md guardrail section and routing row; BACKWARD_COMPATIBILITY note; lesson entry.
7. Live checks on Windows with headless `claude -p` in the worktree: Bash `rm -r` and PowerShell `Remove-Item -Recurse` blocked with the hook message; `Read(.env)` denied (fake one-line `.env`, deleted afterwards) and `.env.example` readable.
8. Fresh-context review (subagent, om-code-review checklist) requested changes; fixed in a second commit: `onFailure: block` + timeout, `//**/.env` deny rules, `rm -Force` and jq/dotfile-glob false positives, quoted or path-prefixed shells, `iwr | % { iex }`, `[scriptblock]::Create`, `"$HOME"/.ssh`, `$USERPROFILE`, `gh auth status -t`, `git credential fill`, `--env-file` only for node/tsx, glob-to-.env detection, gate step in CODE_REVIEW.md and README, `tr` for bash 3.2. Live re-check: a `.env` in a sibling directory is denied, Bash still runs.
9. Prompt injection: one headless Opus 5.5 run on a temporary file outside the repo (deleted afterwards); the injection did not succeed.

## Decisions

- Exceptions for `.env.example` / `.env.template` via gitignore negation, bare patterns so nested `.env` files are covered.
- Hook fails closed on unparseable input; `--env-file` allowed only when the command cannot print the environment, so the documented worktree pattern keeps working.
- Monitor added to the matcher (it runs shell commands through the same field); Read/Edit/Write left to the deny rules.
- Known gaps are printed by the test, not asserted, so closing one does not need a test inversion.
- Branch protection untouched; recommendation in security notes §9.

## Gate (local, Windows, in the worktree)

| Command | Result |
|---|---|
| `npm run lint` | pass |
| `npm run format:check` | pass |
| `npm run test:hooks` | pass, 334/334, 9 known gaps |
| `npm run typecheck` | pass |
| `npm run test:coverage` | pass, 154 files, 1810 tests, 100 % thresholds |
| `npm run build` | pass |
| `npm run test:integration`, `npm run test:e2e` | not run: no app, database or test code changed (CI runs them) |

## Outcome

PR opened (number in the PR thread); the user merges after CI is green.

## Follow-ups (user)

- Revoke the Gemini key found in one old transcript if it is still active; review the 10 non-fixture `ADMIN_PASSWORD` values and the 1 unknown DB password (security notes §4).
- Move the Framelink Figma API key out of `~/.claude.json` arguments; pin `npx` MCP packages.
- Decide on WSL2 + sandbox, a secrets manager for the root `.env`, a separate non-admin bot token for agents, and code-owner review (§9).
- Add the two aliases to `~/.bashrc` and audit two foreign repositories.

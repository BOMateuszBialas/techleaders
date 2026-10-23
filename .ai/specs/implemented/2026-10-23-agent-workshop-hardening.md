# Agent workshop hardening (course lesson 09)

- **Date:** 2026-10-23 · **Status:** implemented · **Risk:** high (agent configuration that applies to every session; the user merges)
- **Source:** course lesson 09 "Security of AI tools" (lethal trifecta, repo config as code execution, skills, prompt injection, secrets in sessions, sandbox, PreToolUse hooks), lab templates `05-sekrety`, `06-sandbox`, `07-hook`, `wzory/`.
- **Scope note:** this is the security of the *agent workshop* (Claude Code, skills, MCP, CI config), not of the CommerceOS application. No app code changes.

## Problem

The repo runs an autonomous agent pipeline (om-auto-*, worktrees) with all three trifecta legs present in a typical run: private data (root `.env` with `DATABASE_URL`, `BETTER_AUTH_SECRET`, the Gemini key), untrusted content (issues, PR comments, CSV imports, web docs) and outbound channels (`gh`, `git push`, `curl`). Before this change there was no project `.claude/` (no deny rules, no hook), no `CODEOWNERS`, and no written inventory of skills and MCP servers.

## Decisions (approved by the user)

| # | Decision |
|---|---|
| D1 | `permissions.deny` in the committed `.claude/settings.json`: `Read(.env)`, `Read(.env.*)` with gitignore negations `Read(!.env.example)` and `Read(!.env.template)` (agents must keep reading the placeholder), `Read(**/*.pem)`, `Read(~/.ssh/**)`, `Read(~/.aws/**)`, `Read(~/.config/gh/**)`. Bare names match at any depth (`packages/*/.env` too). No `allow` rules are added. |
| D2 | No `sandbox` block: the built-in sandbox runs on macOS, Linux and WSL2 only; on native Windows Claude Code runs commands unsandboxed (docs, sandboxing page). Deferred, recorded as a known gap. |
| D3 | A PreToolUse hook `.claude/hooks/pre-tool-use.sh` on the `Bash`, `PowerShell` and `Monitor` tools (all three carry `tool_input.command`) blocks with exit 2: download piped into a shell/interpreter (`curl\|sh`, `iwr\|iex`, `bash <(curl …)`); **any** recursive delete (`rm -r/-R/-rf/-fr/--recursive`, `Remove-Item -Recurse` and aliases, `rd /s`, `find -delete`, `find -exec rm`, `rimraf`, `[IO.Directory]::Delete`); credential directories (`~/.ssh`, `~/.aws`, `~/.config/gh` in `~`, `$HOME`, `$env:USERPROFILE`, `C:\Users\<x>` forms) and `gh auth token`; any command naming a `.env` file except `.env.example` / `.env.template` (case-insensitive, because NTFS is). `--env-file=<path>` is allowed when the same command cannot print the environment. |
| D4 | The hook parses JSON with `jq` and falls back to `node`; it fails closed (exit 2) when it cannot parse, because any exit other than 2 lets the call through. Shell form `bash "$CLAUDE_PROJECT_DIR/.claude/hooks/pre-tool-use.sh"` with `"shell": "bash"` (Git Bash on Windows), the script is committed with mode 100755. |
| D5 | Dry-run tests `.claude/hooks/test-pre-tool-use.sh` (`npm run test:hooks`) assert exit 0/2 for the normal workflow and for blocked commands including bypass attempts, under both parsers, and print the known open gaps without failing. The test runs in CI as a step of the existing `lint` job (check name unchanged) and is added to the validation gate in `.ai/agentic.config.json`, `SDLC.md` and `AGENTS.md`. It lives outside `packages/*/src`, so it is not under the 100 % unit coverage gate; it is its own test. |
| D6 | `.github/CODEOWNERS` assigns `.claude/`, `.mcp.json`, `.agents/`, `.codex/`, `skills-lock.json`, `CLAUDE.md`, both `AGENTS.md`, `.github/workflows/`, `.github/CODEOWNERS` to `@BOMateuszBialas`. Branch protection is not changed by the agent; the user decides on "Require review from Code Owners" (trade-off with agent self-merge in `.ai/security-notes.md`). |
| D7 | The audit results live in `.ai/security-notes.md` (repo convention `.ai/`), without any secret value. The shell aliases `agent-audit` / `agent-audit-hot` are given there as copy-paste lines; the agent does not edit `~/.bashrc` or the global `~/.claude/settings.json`. |

## Non-goals

- The CommerceOS application's own security (a later lesson), app code, migrations.
- Moving secrets to a manager (`op run`, Doppler, Infisical), rotating keys, scoping the `gh` token: user actions, listed as follow-ups.
- WSL2 / sandbox configuration, Snyk Agent Scan, gitleaks.
- Deleting or re-installing skills; changing branch protection.

## Impact on the workflow

- Agents can no longer read or write `.env` in a worktree (`cp ../techleaders/.env .env` is blocked by both the deny rule and the hook). Replacement: `npx tsx --env-file=../<main>/.env …`, or the user copies `.env` for a dev-server QA run. Integration and e2e tests need no `.env`.
- Recursive cleanups (`rm -rf .next`, scratch directories) need the user. `git worktree remove` and `rm <file>` still work.
- Commit messages and PR bodies that name a `.env` file must go through `-F` / `--body-file`.
- Verified on Windows with headless sessions: the hook fires for Bash and PowerShell (exit 2 message reaches the model), the deny rule blocks `Read(.env)` and `.env.example` stays readable.

## Files

`.claude/settings.json`, `.claude/hooks/pre-tool-use.sh`, `.claude/hooks/test-pre-tool-use.sh`, `.github/CODEOWNERS`, `.github/workflows/ci.yml`, `package.json` (`test:hooks`), `.ai/agentic.config.json`, `SDLC.md`, `AGENTS.md`, `BACKWARD_COMPATIBILITY.md`, `.ai/security-notes.md`, `.ai/lessons.md`, `.ai/runs/2026-10-23-agent-workshop-hardening.md`.

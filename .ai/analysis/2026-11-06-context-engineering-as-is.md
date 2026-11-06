# Context engineering: AS-IS measurement (2026-11-06)

- **Baseline:** `main` at `353ae1d` (the commit this measurement branch starts from; AGENTS.md is not changed here).
- **Method:** lesson 10 "pomiar AS/IS". The repository part is measured by a read-only script; the live `/context` figure needs a session and is left to the owner.
- **Reproduce:** from the repo root run `npx tsx scripts/measure-context.ts`. It prints a Markdown report to stdout and writes nothing. Logic and unit tests: `scripts/agents/measure-context.ts`, `scripts/agents/measure-context.test.ts`.
- **Estimate:** tokens = characters / 4, rounded up (characters are code points). This is not a tokenizer count, so compare numbers only within this table.

## 1. Always loaded at session start

| File | Bytes | Lines | Tokens (est.) |
|---|---:|---:|---:|
| `AGENTS.md` (root router) | 11 840 | 112 | 2 956 |
| `CLAUDE.md` (import and reminders) | 378 | 8 | 95 |
| **Session start total** | | | **3 051** |

`AGENTS.md` is 11 840 bytes against the 12 288-byte budget that `check:agents` enforces (96%).

## 2. Read for a task (root routing table)

| File | Bytes | Lines | Tokens (est.) |
|---|---:|---:|---:|
| `ENGINEERING_STANDARDS.md` | 27 609 | 400 | 6 896 |
| `SDLC.md` | 23 148 | 184 | 5 766 |
| `.ai/lessons.md` (index) | 18 552 | 100 | 4 553 |
| **Task start total** (session start + these three) | | | **20 266** |

- `.ai/lessons.md` is at its 100-line budget.
- The task start total is a sum of file sizes. Real sessions read a subset, so the figure is an upper bound for a task that reads all three.

## 3. On demand

| File | Bytes | Lines | Tokens (est.) |
|---|---:|---:|---:|
| `.ai/specs/2026-10-13-commerceos-mvp.md` | 31 726 | 539 | 7 908 |

## 4. Lazy: package AGENTS.md (loaded for work in that package)

| File | Bytes | Lines | Tokens (est.) |
|---|---:|---:|---:|
| `packages/app/AGENTS.md` | 8 245 | 84 | 2 057 |
| `packages/database/AGENTS.md` | 4 451 | 39 | 1 111 |
| `packages/ai/AGENTS.md` | 3 214 | 33 | 802 |
| `packages/core/AGENTS.md` | 2 670 | 32 | 668 |
| `packages/config/AGENTS.md` | missing | | |

`packages/config` is a shared tsconfig package with no agent file, by design.

## 5. Skills (counts and description size only)

| Location | SKILL.md files | Description characters | Description tokens (est.) | SKILL.md bytes |
|---|---:|---:|---:|---:|
| `.ai/skills/` | 1 | 239 | 60 | 4 991 |
| `.agents/skills/` | 42 | 15 096 | 3 790 | 517 186 |
| `~/.claude/skills/` (personal; counts only, no names printed) | 88 | 34 773 | 8 726 | 1 040 443 |
| **Descriptions total** | 131 | 50 108 | **12 576** | |

- All SKILL.md files have a `description`.
- The personal folder is outside the repository and is counted only; the script prints no names from it.
- Skill names and descriptions are loaded at session start in Claude Code, so the descriptions total is a session-start cost, not a per-task cost. The skill bodies load only when used.

## 6. MCP

- The repository has **no `.mcp.json`**. The script reports it as absent.
- Servers come from the user's account and are not measured by the script. From this session's tool list (counted by hand, not reproducible by the script): 10 servers connected (`claude_ai_Claude_Docs`, `claude-in-chrome`, `claude_ai_Figma`, `claude_ai_Google_Docs`, `claude_ai_Google_Sheets`, `claude_ai_Shopify`, `figma-remote-mcp`, `Framelink_MCP_for_Figma`, `shopify-dev-mcp`, `ide`), about 79 tools in total. `figma-desktop` failed to connect (ECONNREFUSED) in this session.

## 7. Not measured

- **`/context` on a fresh session:** to be measured by the owner. This script cannot read a live session, so no figure is given here.
- **Deferred tool schemas and MCP server instructions:** not read by the script; section 6 is a hand count for this session only.
- **Real tokenizer counts:** the chars/4 estimate is not the model's tokenizer.
- **Per-task consumption:** the script measures file sizes, not what an agent reads in a given task.

## 8. Notes for the next step

- `AGENTS.md` is 96% of its budget, and the session-start load (about 3 k tokens) is small next to the task-start load of the three large files (about 17 k tokens). The large files are the next candidates to route, not the router.
- Skill descriptions (about 12.6 k tokens est. across 131 files, most of it personal) are a larger session-start cost than the instruction files. They are a candidate for the owner's decision on which skills stay enabled.

## Live measurement with /context (owner, 2026-11-06)

A fresh Claude Code session, `/context`, model claude-haiku-5-5, window 1M tokens:

| Category | Tokens | Share of window |
| --- | --- | --- |
| System prompt | 4.9k | 0.5
## Live measurement with /context (owner, 2026-11-06)

A fresh Claude Code session, `/context`, model claude-haiku-5-5, window 1M tokens:

| Category | Tokens | Share of window |
| --- | --- | --- |
| System prompt | 4.9k | 0.5% |
| System tools | 19.9k | 2.0% |
| MCP tools (75 tools, loaded on demand) | 598 | 0.1% |
| MCP server instructions | 1.1k | 0.1% |
| Memory files (3 files) | 5.9k | 0.6% |
| Skills (90 skills) | 9.9k | 1.0% |
| Messages | 10 | 0.0% |
| Free space | 924.7k | 92.5% |
| Autocompact buffer | 33k | 3.3% |

Total used at the start: 42.3k tokens (4%). The start of a session is therefore smaller than the chars/4 estimate above for AGENTS.md, ENGINEERING_STANDARDS, SDLC and lessons together, because the measurement above counts files that the session reads on demand, not at start.

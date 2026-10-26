# Run: context engineering (course lesson 10, phase 6)

- **Date:** 2026-10-26
- **Branch:** `docs/context-engineering-l10` (from `origin/main` at 84151f4)
- **Goal:** make the agent context smaller and route-based: root `AGENTS.md` becomes a router under 12 KB, package rules move to package files, `.ai/lessons.md` becomes an index, `npm run check:agents` guards the budgets in CI. Plan source: `PLAN-TYDZIEN-2.md`, "Faza 6 – L10", items 1–5 (item 5, MCP and skills, is a list only).
- **Risk:** high. `AGENTS.md` and `.github/workflows/ci.yml` are maintainer-owned (`.github/CODEOWNERS`). The owner merges.

## 1. Measurement (AS / IS)

Bytes are file sizes; tokens are characters / 4 (estimate, not a tokenizer count). "Routine" means loaded at session start or on every task.

| File | Routine? | Before (B) | Before (tok~) | After (B) | After (tok~) |
|---|---|---:|---:|---:|---:|
| `AGENTS.md` (root) | yes (via CLAUDE.md) | 33 127 | 8 248 | 11 840 | 2 956 |
| `CLAUDE.md` | yes | 378 | 95 | 378 | 95 (unchanged, already the import plus reminders) |
| `.ai/lessons.md` | yes (read before work) | 40 626 | 10 116 | 11 577 | 2 832 |
| `ENGINEERING_STANDARDS.md` | on demand | 30 031 | 7 497 | 27 609 | 6 896 |
| `SDLC.md` | on demand (process, reviews) | 23 420 | 5 833 | 23 148 | 5 766 |
| `packages/app/AGENTS.md` | when working in app | 2 129 | 531 | 8 036 | 2 004 |
| `packages/core/AGENTS.md` (new) | when working in core | – | – | 2 670 | 667 |
| `packages/database/AGENTS.md` (new) | when working in database | – | – | 4 451 | 1 111 |
| `packages/ai/AGENTS.md` (new) | when working in ai | – | – | 3 214 | 802 |
| `.ai/security-notes.md` | on demand (agent settings) | 19 182 | 4 783 | 19 182 | 4 783 (unchanged) |
| `.ai/design/tokeny.md` | on demand (UI work; largest `.ai/` file) | 52 456 | 12 805 | 52 456 | 12 805 (unchanged) |

Routine load (root `AGENTS.md` + `CLAUDE.md` + `.ai/lessons.md`), a computed sum, not a measured saving:

- before: 74 131 B, about 18 460 tok~
- after: 23 795 B, about 5 920 tok~ (before the package file, which loads only for work in that package)

These are file-size estimates. They are not a measured token saving: the real saving depends on how the harness loads the files. See section 6 for the live measurement the owner must run.

## 2. Eliminating no-ops

- **Skills:** `eliminate-no-op` and `task-router` do **not** exist here: not in `.agents/skills/` (42 `om-*` skills from `skills-lock.json`), not in `.claude/` (only `settings.json` and `hooks/`), and not in the session's skill list. The work was done by hand.
- **Manual pass, line by line,** on `ENGINEERING_STANDARDS.md` and `SDLC.md`. Removed or merged only lines that repeated another line, or that said nothing actionable. Kept every line a gate, hook or test enforces, and every protected rule.
  - `ENGINEERING_STANDARDS.md`: the "adapts the course document" sentence (no action); the expected-packages list and the dependency bullets that repeat the "Repository decisions" table and the ESLint rules (the two rules the table does not state are kept); the AppError list (in "Repository decisions" already); the SRP, separation-of-concerns, dependency-inversion, explicit-over-implicit, composition-over-inheritance and fail-closed principles (each restated in §3, §6, §8 or §13); "one level of abstraction" (not checkable); the long closing sentence of §15.
  - `SDLC.md`: the two intro paragraphs that described the flow without any action; the "merge is where this document ends" sentence (repeated the "After merge" paragraph); the duplicate "change both files together" clause in the Validation section (kept once, with a pointer to Amending).
  - `AGENTS.md`: rewritten as a router (section 3). Its "Definition of done" bullets were dropped from the root: the gate is in the Validation list, and `ENGINEERING_STANDARDS.md` §12 holds the checklist.
- **Not removed:** the Validation list, the admin and customer guard rules, the protected decisions block (`discovery:start` / `discovery:end` markers), the stock and money rules, the Next.js generated block.

## 3. Router and package files

Root `AGENTS.md` (11 840 B, budget 12 288 B) keeps: the Next.js block (byte-identical, checked with `git diff`), the project overview and principles, a short stack line, the package table with a pointer to each package's `AGENTS.md`, the agent rules, the agent guardrails in short form, testing in short form, the reference files (3), the task routing table (one row per task type, including the split of "Any task" into new feature, bug fix, schema change, UI change, Copilot change and config change), the Validation list (with `check:agents`), the repository and `.ai/` layout, and working principles.

Moved, copied verbatim where protected:

- `packages/core/AGENTS.md`: role and boundaries, the `AppError` rule, Money, order status and access, Copilot recommendation transitions, metric definitions and their single source.
- `packages/database/AGENTS.md`: entities and migrations, `allowGlobalContext`, money columns, the **stock writers** (the three writers and the checkout decrement, verbatim), order status, seeders and demo data, the Copilot recommendation storage.
- `packages/ai/AGENTS.md`: Copilot flow and approved tools, output schema, grounding, untrusted input, `METRIC_DEFINITIONS` reuse, `LlmProviderPort` and the fallback, the eval rules.
- `packages/app/AGENTS.md` (the Next.js generated blocks are untouched, the new text is appended after them): dependency injection, route handlers, **Admin** guard rules (verbatim), **Accounts** guard rules (verbatim, including the A↔B e2e), app testing.

The root keeps one pointer per area, so an agent that reads only the root knows which file to open.

## 4. Lessons

- `.ai/lessons.md` is now an index (76 lines, budget 100). 63 lessons, newest first (one 2026-10-26 entry was out of order and was moved to the top of its date).
- 57 long entries moved to `.ai/lessons/YYYY-MM-DD-slug.md`, text verbatim, linked from their index line.
- 6 short entries (about 300 characters or less, no sub-bullets) stay inline in the index line, with their full text.
- No lesson text was dropped.

## 5. check:agents

- Entry `scripts/check-agents.ts` (run from the repo root by npm); logic in `scripts/agents/check.ts`; disk adapter and runner in `scripts/agents/run.ts`; tests in `check.test.ts` and `run.test.ts`; `scripts/tsconfig.json` (typechecked by the root `typecheck` script).
- Budgets (constants in `scripts/agents/check.ts`): root `AGENTS.md` at most 12 288 bytes (12 KB); `.ai/lessons.md` at most 100 lines (the final newline not counted).
- Path check: every backticked span that looks like a repo path (contains `/`, only path characters, no URL, no route, no scope, no placeholder such as `<name>`, `YYYY` or `…`) must exist, relative to the file that names it, under that package's `src/`, or from the repo root. `packages/app/e2e/artifacts/` is allowed (written by failing e2e runs, not in git).
- CLAUDE.md: only the `@AGENTS.md` import (exactly one), the `## Claude Code reminders` heading (exactly one) and `- ` bullets below it. The reminders are kept, so bullets are allowed. This is the reading of "more than the import line and the reminders heading" that the plan's intent requires; a stricter reading would delete the reminders.
- Wiring: `package.json` (`check:agents`, and `typecheck` now also runs `tsc -p scripts/tsconfig.json`), `vitest.config.mts` (unit include adds `scripts/**/*.test.ts`; coverage include adds `scripts/agents/**/*.ts`; no exclusion added), `.github/workflows/ci.yml` (lint job, after `check:tokens`), `.ai/agentic.config.json` and `SDLC.md` (Validation lists), `AGENTS.md` (Validation list).
- Unit tests: 25 tests (`scripts/agents/*.test.ts`); coverage of `scripts/agents/*` is 100% (lines, branches, functions, statements).

## 6. Owner: live `/context` measurement (not done here)

This run cannot see the owner's session, so no live number is claimed. The owner should measure, in a fresh session on `main` (before) and in a fresh session after this PR is merged (after), and fill the table:

| Measurement | Before (main) | After (this PR) |
|---|---|---|
| `/context`: total tokens at session start | _owner to fill_ | _owner to fill_ |
| `/context`: memory files (CLAUDE.md, AGENTS.md) | _owner to fill_ | _owner to fill_ |
| `/context`: skills (names and descriptions) | _owner to fill_ | _owner to fill_ |
| `/context`: MCP tools (definitions) | _owner to fill_ | _owner to fill_ |
| Same task, one session each: tokens used | _owner to fill_ | _owner to fill_ |

Optional: Context Scope (the course tool) for the session history. The course recommends `/context` only; use it unless the Context Scope is already installed.

## 7. Step 5: MCP servers and skills (candidate list, nothing changed)

Not changed: `.claude/settings.json`, hooks and `.mcp.json` are maintainer-owned and security-sensitive. There is no project `.mcp.json`: the MCP servers and most skills come from the user's account, so they load in every project. Each skill's name and description is part of the session start; each MCP server adds its tool definitions. These are candidates for the owner to decide.

MCP servers (from the session's tool list):

| Server | Why it is a candidate | Suggestion |
|---|---|---|
| `shopify-dev-mcp`, `claude_ai_Shopify` | CommerceOS is a custom Next.js store, not Shopify | disable |
| `claude_ai_Klaviyo`, `claude_ai_Trello`, `claude_ai_Gmail`, `claude_ai_Google_Calendar`, `claude_ai_Google_Drive`, `claude_ai_Wispr_Flow` | no part of the project plan | disable |
| `claude_ai_ChEMBL`, `claude_ai_Clinical_Trials`, `claude_ai_PubMed`, `claude_ai_bioRxiv` | research servers, unrelated | disable |
| `claude_ai_Figma`, `figma-remote-mcp`, `Framelink_MCP_for_Figma` | plan decision 12: the design system lives in code (tokens, Storybook), no Figma | disable, unless the owner wants Figma for the discovery phase |
| `figma-desktop` | failed to connect this session (ECONNREFUSED) on every start | remove from the config, or fix it |
| `ide` (`getDiagnostics`, `executeCode`) | IDE integration; little use in the CLI | decide |
| `claude-in-chrome` | the browser walks use agent-browser (the configured provider) | keep for ad hoc walks, or disable |
| `claude_ai_Claude_Docs` | only for documents the user asks for | decide |

Skills (session list, outside `.agents/skills/`):

| Skill(s) | Why it is a candidate | Suggestion |
|---|---|---|
| Cloudflare family: `agents-sdk`, `basin`, `cloudflare`, `cloudflare-email-service`, `cloudflare-one`, `cloudflare-one-migrations`, `durable-objects`, `k2`, `nextjs-on-cloudflare`, `sandbox-*` (4), `turnstile-spin`, `workers-best-practices`, `wrangler` | no Cloudflare product in the plan; the public host is not chosen yet (plan item "Publiczny deploy") | disable now, re-enable if the host is Cloudflare |
| `anthropic-skills:docx`, `:pdf`, `:pptx`, `:xlsx`, `:google-workspace`, `:import-memory`, `:morning` | file formats and personal tasks, not repo work | disable |
| `workflow-authoring`, `plugin-authoring` | build Claude Code mods and workflow scripts; not used in this repo | disable |
| `claude-api` | the project's LLM is Gemini (`@google/genai`); the skill's trigger loads for any LLM-shaped task | disable, or keep for the eval work |
| `web-perf` | could be useful for the storefront later | keep until the first performance task |
| `dataviz` | the admin dashboard and Copilot evidence may get charts | keep |
| `om-*` (42 in `.agents/skills/`) | the pipeline uses them | keep; review the rarely used ones (`om-mockup-prototype`, `om-synthetic-users`, `om-pipeline-retro`) after the next retro |

## 8. Gate

Run in the worktree (`wt-context`) after `npm ci`:

| Command | Result |
|---|---|
| `npm run lint` | pass, 0 errors; 2 warnings in `.ai/prototypes/ds/` (pre-existing on `main`, not touched) |
| `npm run format:check` | pass |
| `npm run check:tokens` | pass (239 files) |
| `npm run check:agents` | pass (5 agent files checked) |
| `npm run typecheck` | pass (workspaces and `scripts/`) |
| `npm run test:coverage` | pass: 174 files, 1 996 tests; 100% statements, branches, functions, lines |
| `npm run build` | pass |
| `npm run test:integration`, `npm run test:e2e` | not run: no app behaviour changed (docs, a script and config). CI runs them. |
| `npm run test:hooks` | not run: no hook change |

## 9. Follow-ups

- Owner: fill the `/context` table (section 6) and decide the candidates (section 7).
- Owner: review the `AGENTS.md` router and the package files (CODEOWNERS).
- Later: the 6 inline lessons can move to detail files when they are next edited.
- Later: `check:agents` could also check that every `.ai/lessons/*.md` file is linked from the index.

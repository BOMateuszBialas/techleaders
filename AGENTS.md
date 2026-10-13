<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project overview

**techleaders**: a Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 web application, built in a monorepo. TODO: describe the product goal in one or two sentences.

## Task routing

Before starting a task, read the files listed for the area it touches.

| When the task involves… | Read first | Key rules |
|---|---|---|
| Any task | `AGENTS.md`, `.ai/lessons.md`, `SDLC.md` | Work from a spec in `.ai/specs/`; log autonomous runs in `.ai/runs/`; record lessons |
| A new feature | `.ai/specs/`, `SDLC.md` | Spec first (`YYYY-MM-DD-slug.md`); after implementation, move the spec to `specs/implemented/` |
| Pages, layouts, routing (UI) | `app/layout.tsx`, `app/page.tsx`, `node_modules/next/dist/docs/` | Server Components by default; `cacheComponents` is on; use Next.js 16 APIs, not older ones |
| Styles | `app/globals.css` | Tailwind CSS v4 utility classes; no new CSS frameworks |
| API / Route Handlers | `BACKWARD_COMPATIBILITY.md`, `node_modules/next/dist/docs/` | Validate input on the server; API changes are additive only. TODO: conventions once the first endpoint exists |
| New package or shared code | `AGENTS.md` (monorepo section) | Code goes in `packages/<name>/`; nothing new at the root |
| Next.js / build / TS / lint config | `next.config.ts`, `tsconfig.json`, `eslint.config.mjs` | Changes to config and env variables follow `BACKWARD_COMPATIBILITY.md` |
| Tests | — | TODO: no test runner yet; add one and include it in the validation gate |
| CI / GitHub | `.ai/trackers/github.md`, `SDLC.md` | TODO: no `.github/workflows` yet; CI should mirror the validation gate |
| Code review / PR | `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md`, `SDLC.md` | Pipeline labels follow `SDLC.md`; severities follow `CODE_REVIEW.md` |

## Validation

Run before every commit or PR (the gate from `.ai/agentic.config.json`):

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Process documents: `SDLC.md` (ticket flow and labels), `CODE_REVIEW.md` (review rules), `BACKWARD_COMPATIBILITY.md` (protected contracts), `.ai/agentic.config.json` (pipeline configuration).

## Repository structure: monorepo

This project is a **monorepo**: one repository holding multiple packages.

- Each package's source code lives in its own directory: `packages/<package-name>/`.
- Do not add new standalone source code at the repository root. The root holds only shared tooling and configuration (workspaces, lint, TS config, CI).
- Shared code goes into a dedicated package under `packages/` and is imported from there, not copied.

## Project metadata: the `.ai/` folder

All agents (Claude Code, Codex, etc.) MUST use these structures. Do not store specs, run logs or lessons anywhere else.

```
.ai/
├── specs/                  # Specifications for Spec-Driven Development (SDD)
│   ├── YYYY-MM-DD-slug.md  # Active specs (not yet implemented)
│   ├── implemented/        # Specs moved here once fully implemented
│   └── archive/            # Obsolete / superseded / abandoned specs
├── runs/                   # Logs of autonomous AI runs: YYYY-MM-DD-slug.md
├── lessons.md              # Index of findings, lessons and improvements (long-term memory)
└── lessons/                # Detailed lesson write-ups: YYYY-MM-DD-slug.md
```

### Rules

1. **Specs first (SDD)**: implement features from a spec in `.ai/specs/`. Name specs `YYYY-MM-DD-slug.md` (lowercase kebab-case slug). When a spec is fully implemented, move it to `.ai/specs/implemented/`; when obsolete, move it to `.ai/specs/archive/`.
2. **Runs**: every autonomous run MUST write a log to `.ai/runs/YYYY-MM-DD-slug.md` (goal, steps taken, decisions, outcome, follow-ups).
3. **Lessons**: read `.ai/lessons.md` before starting work. After fixing a bug or discovering something worth remembering, append an entry to `.ai/lessons.md` (details in `.ai/lessons/YYYY-MM-DD-slug.md` if long).
4. Dates use the current date in `YYYY-MM-DD` format.

## Working principles

Distilled from the Claude Code team's best practices. They apply to every agent working in this repo.

1. **Plan before building.** Start every non-trivial task with a plan: a spec in `.ai/specs/` or plan mode. Invest in the plan so the implementation can be done in one pass. If something goes sideways, stop and re-plan; do not keep pushing.
2. **Verify, don't assume.** Prove the change works: run tests, lint and build, or compare behaviour against `main`. Do not declare work done without evidence.
3. **Prefer the elegant solution.** If a fix turns out hacky or mediocre, scrap it and reimplement it cleanly using everything learned so far. Do not stack patches.
4. **Learn from every correction.** When the user corrects you, or you fix a bug, write the rule or lesson down in `.ai/lessons.md` (or in this file, if it is a project-wide rule) so the mistake does not repeat. Keep these files short and pruned.
5. **Fix autonomously.** Given a bug report, failing CI or logs, investigate and fix end to end without asking how. Ask only for decisions that genuinely belong to the user.
6. **Keep context clean.** Delegate broad searches and independent subtasks to subagents, and run independent work in parallel (for example, separate git worktrees).
7. **Automate repetition.** If you do something more than once, turn it into a skill or script, commit it under `.agents/` or `.ai/scripts/`, and reuse it.
8. **Reduce ambiguity.** Clarify requirements up front and record them in the spec. Specific inputs produce better output.

---
name: task-router
description: Keep the root AGENTS.md a short router (a task-type table that says which files to read for each kind of work) and move package-specific detail into packages/*/AGENTS.md. Use when AGENTS.md grows past its size budget, when a package rule is only in the root, when adding a new task type or package routing row, or when the user asks to split, restructure or route agent instructions, even if they only say "AGENTS.md is too big". Do not use for trimming individual lines without moving content (use eliminate-no-op) or for product specs.
metadata:
  version: "1.0"
---

# task-router

The root `AGENTS.md` is loaded in every session. It must stay a router: a short map from task type to the files to read. Detail belongs in the file for its package, which an agent loads only when it works there.

## Budgets and checks

- Root `AGENTS.md` is under **12 KB** (12 288 bytes). `npm run check:agents` enforces it (`scripts/agents/check.ts`, `ROOT_AGENTS_MAX_BYTES`).
- Every backticked repo path in `AGENTS.md` and each `packages/*/AGENTS.md` must exist. The check resolves a path next to the file that names it, under that package's `src/`, or from the repo root.
- `.ai/lessons.md` stays at or under 100 lines. Do not add lines to it while routing; it is an index, and new lessons go in `.ai/lessons/`.
- `CLAUDE.md` holds only `@AGENTS.md` and the reminders section.

Run `npm run check:agents` after every change. It is part of the validation gate.

## Procedure

1. **Discover.** Measure the root file (`wc -c AGENTS.md`) and list its sections. For each section, note the task types it serves and the paths it names.
2. **Split.** Classify each section:
   - *Stays in the root:* project overview, product principles, package table, agent rules, guardrail summaries, validation list, routing table, `.ai/` layout, working principles.
   - *Moves to a package file:* rules that apply only inside one package (for example, a database writer rule belongs in `packages/database/AGENTS.md`).
   - *Stays in a standing file:* process rules that live in `SDLC.md`, `ENGINEERING_STANDARDS.md` or `CODE_REVIEW.md`. Route to them, do not copy.
3. **Move only into real targets.** Move content only to a file that already exists, or to a new `packages/<name>/AGENTS.md` for a package that has real code. Never create an empty file to receive text, and do not create a package. Move the text verbatim when it is a protected rule (guards, stock writers, money). Leave one pointer in the root, naming the area and the file.
4. **Write the routing table.** One row per task type. Columns: task type, read first, key rules. Put a package file in "read first" whenever the work happens in that package. Keep the rows short; the rule text belongs in the file they point to.
5. **Check.** `npm run check:agents`, then `npm run format:check` on changed Markdown. Confirm each new pointer resolves.
6. **Log.** Record before and after sizes (bytes), what moved where, and the check results in the run log.

## Example row

```
| Schema change (entities, migrations, seeds) | `packages/database/AGENTS.md`, `BACKWARD_COMPATIBILITY.md` | `defineEntity`; register in `packages/database/src/entities/index.ts`; migration plus integration test |
```

The row names the package file and the one rule an agent cannot skip. The stock-writer list and the seeder rules live in the package file.

## Gotchas

- **The Next.js block is generated.** Do not edit the text between `BEGIN:nextjs-agent-rules` and `END:nextjs-agent-rules` in any file. It is re-added by `next dev`, so changes are overwritten or re-created as a diff.
- **Protected blocks move verbatim.** Admin and Accounts guard rules, and the stock writers, are copied without rewording. A paraphrase is a change of rule, and it needs the owner's approval.
- **The check reads only backticked paths.** A routing row that names a file without backticks is not checked, so verify those rows by hand.
- **Do not route to the lessons file as "read first".** It is an index. Route to a specific lesson only when the task matches its topic.
- **Package files are read only when the agent works there.** Anything a task in every package needs (validation gate, testing rule, agent guardrails) stays in the root.

## Output

Report: root size before and after (bytes), content moved (file and section), new routing rows, the check results, and anything left in the root that could move once a target exists.

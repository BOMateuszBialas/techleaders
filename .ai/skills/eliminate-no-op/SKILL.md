---
name: eliminate-no-op
description: Remove lines from agent instruction files (AGENTS.md, CLAUDE.md, ENGINEERING_STANDARDS.md, SDLC.md, package AGENTS.md) that change nothing an agent does, because a script, lint rule, CI job or config already enforces them, the code states them, another always-read file repeats them, or they are stale. Use when the user asks to trim, prune, audit or shrink agent instructions, reduce context cost, or check whether a rule is still needed, even if they only say "clean up AGENTS.md". Do not use for writing new rules or for restructuring files into a router (use task-router for that).
metadata:
  version: "1.0"
---

# eliminate-no-op

Agent instructions cost context in every session that loads them. A line is a no-op when the agent would behave the same without it. This skill removes only the lines that are verifiably no-op. Generic advice that no mechanism enforces is not a no-op, so it stays.

## Scope and protected content

Work only on the files the user names. Default set: root `AGENTS.md`, `ENGINEERING_STANDARDS.md`, `SDLC.md`, and `packages/*/AGENTS.md`.

Never remove a line that protects something, even if it looks redundant:

- security, secrets, auth and ownership rules (`.env` handling, guards, deny rules);
- package boundaries and dependency direction, unless ESLint enforces the same boundary (then it is a candidate, see test 1);
- the 100% unit coverage rule and the validation gate list;
- the protected product decisions block between `discovery:start` and `discovery:end` markers;
- the Next.js generated block (`BEGIN:nextjs-agent-rules` … `END:nextjs-agent-rules`);
- any line another file tells the maintainer to keep in sync ("change X and Y together").

Files owned by the maintainer (`AGENTS.md`, `.github/CODEOWNERS` paths) still get edited when the user asks, but say so in the PR so the owner reviews it.

## Procedure

1. **Inventory.** Read each file in full. Number the candidate lines or bullets. Skip headings and pure pointers ("see X").
2. **Test each candidate, in this order.** Stop at the first test that says "no-op" and record the evidence.
   1. **Enforced by a mechanism.** Find the lint rule, tsconfig option, vitest include glob, CI job or script that makes the rule fail on violation. Quote the file and the rule or line. Example: `no-restricted-imports` in `eslint.config.mjs` forbids `@mikro-orm/*` in `packages/app/src` outside the container, so "pages must not run raw ORM queries" is a no-op.
   2. **Derivable from code or config.** The fact is stated in `package.json`, a config file, or a file the agent reads anyway. Example: the test-file suffixes in `vitest.config.mts`.
   3. **Duplicated.** The same rule is stated in an always-read file (root `AGENTS.md`, `CLAUDE.md`). Keep the copy with the stronger wording and the pointer; remove the other. Check that the copies really match before removing one.
   4. **Stale.** The line states a fact that disagrees with the repo. Check every version and name against `package.json` and the config. A stale line is not a no-op: fix it (or remove the version and point to the source file) and log it as a finding.
   5. **Otherwise keep.** A rule nothing checks stays, even when it sounds generic. The test "would the agent do it anyway?" is not evidence: the agent may not, and the reader must not have to guess. Log it under "kept, not verifiable" with the reason.
3. **Edit.** Remove or merge the line. Keep the surrounding structure valid (lists, tables, numbering). When a merge changes the meaning, do not merge; keep both lines.
4. **Validate.** Run `npm run check:agents` (router size, referenced paths, lessons budget) and `npm run format:check` on the changed files. Then confirm each cited mechanism still exists by grep, for example `grep -n "no-explicit-any" eslint.config.mjs`.
5. **Log.** Write every removed or changed line into the run log: file, the line (short quote), the test that justified it, and the evidence path. A removal with no evidence is not allowed.

## Gotchas

- **Versions in prose go stale.** Last run, the root stack line said "ESLint 9" while `package.json` pinned `^10.14.0`, and the Better Auth pin in the text (`~1.7.10`) disagreed with `packages/app/package.json` (`~1.7.14`). Remove version numbers from prose and point to `package.json`, unless the version is a protected contract.
- **Lint and tsconfig coverage is partial.** `no-explicit-any` is an error, but "no empty catch" and "no magic numbers" are not configured. Test the specific rule, not the topic.
- **ESLint covers boundaries, not intent.** "Core does not import Next.js" is enforced for `packages/core/src/**`. "Keep ports thin" is not.
- **Duplicates are usually intentional.** The validation gate appears in `AGENTS.md` and `SDLC.md` because `SDLC.md` says to change both together. That is a sync rule, not a no-op.
- **Generic principles are not no-ops.** "Prefer the elegant solution" has no mechanism behind it. Keep it unless the user says it is noise.
- **Do not weaken rules to shorten files.** Changing "must" to "should" is an edit of meaning. Report it instead.

## Output

Report to the user:

- lines removed (count, and the main ones, each with its evidence);
- lines changed (stale facts fixed);
- lines kept that looked like candidates, with the reason they are not verifiable;
- the size before and after, in bytes (`wc -c`);
- the check results.

Template for the run log table:

```
| File | Line (short quote) | Test | Evidence |
|---|---|---|---|
| ENGINEERING_STANDARDS.md | "A product page must not execute a raw MikroORM query" | 1 (enforced) | eslint.config.mjs, packages/app/src `no-restricted-imports` |
```

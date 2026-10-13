<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

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

# 2026-10-15 — `npx skills add` installs where Claude Code does not look

Skills land in `~/.agents/skills/`, but Claude Code reads `~/.claude/skills/` and `.claude/skills/`. Copy the skill there, plus any skill it delegates to (`grill-me` only calls `grilling`).

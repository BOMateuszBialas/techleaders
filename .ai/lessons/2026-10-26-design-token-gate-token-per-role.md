# 2026-10-26 — Design-token gate needs a token for every role

The check (`npm run check:tokens`) flags palette classes and arbitrary values; map each one to the role it plays (warning, success, demo) first, then to the token (`text-warning`, `text-success`, `bg-demo-surface text-demo`). Tailwind v4 builds `grid-cols-<name>` from an `--grid-template-columns-<name>` entry in the `@theme` block of `globals.css`, which is the place for a layout value that has no standard class.

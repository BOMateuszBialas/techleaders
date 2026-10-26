# 2026-10-26 — Vite picks the nearest tsconfig, and a container query needs its container one element up

Vite 8 in a folder outside the app read `packages/app/tsconfig.json` (it extends a workspace package) and failed the build; set `tsconfig` in `vite.config`. Typecheck of app components outside their package needs `paths` entries for `react` and `react-dom` pointing at `@types`, because TypeScript stops at the untyped JS file. `@container` and its `@md:` variant on the same element match nothing: put the container on the parent.

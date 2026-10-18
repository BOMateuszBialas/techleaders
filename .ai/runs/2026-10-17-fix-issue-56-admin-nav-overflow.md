# Run: fix #56, admin navigation overflows at 390 px

- **Date:** 2026-10-17
- **Goal:** no admin page scrolls horizontally at 390 px because of the admin navigation; desktop sidebar unchanged.

## Steps

1. The nav in `packages/app/src/app/admin/(protected)/layout.tsx` is a non-wrapping flex row below `md`; six links end at x = 472 px.
2. Fix: `flex-wrap` on the nav (links wrap to a second row; every link stays visible and in tab order). `md:flex-col` keeps the desktop sidebar as before.
3. Added `BrowserSession.evaluate` (agent-browser `eval`) and `admin-mobile.e2e.test.ts`: at 390 px, `/admin`, `/admin/orders`, `/admin/products`, `/admin/categories`, `/admin/copilot` have `scrollWidth === innerWidth`, all six nav links are present and end within 390 px; saves `admin-nav-390.png`.
4. Verified the test fails on `main` ("/admin: expected 472 to be 390") and passes with the fix.

## Outcome

Fixed; full gate run (lint, format, typecheck, unit coverage, build, integration, e2e).

# Run: Admin authentication and the server-side admin guard (E03-S01)

- **Date:** 2026-10-15
- **Trigger:** `/om-auto-implement-spec .ai/specs/2026-10-15-admin-authentication.md` (user request)
- **Source doc:** `.ai/specs/2026-10-15-admin-authentication.md` (merged in #31; step 1 spike already done)
- **Issue:** #19
- **Engine:** om-auto-create-pr (steps: 9, --loop: no)

## Goal

The single store owner signs in with email and password (Better Auth 1.7.10). Every admin page, route handler and server action checks the session on the server through `server/auth/require-admin.ts`. Acceptance criteria AC1–AC4 of #19.

## Scope

Steps 2–10 of the spec's Implementation Plan:

- env and dependencies;
- 5 `admin_*` entities and their migration;
- the auth factories and container wiring;
- the owner CLI;
- the guard module and the inventory test;
- the sign-in page, actions, auth route and protected route group;
- `GET /api/admin/me`;
- the e2e suite;
- docs.

## Non-goals

- No store data in the admin (later stories).
- No `proxy.ts`, OAuth, password-reset email, staff role or "sign out everywhere" (spec decisions Q3, Q4, G7).
- No deployment or trusted IP header configuration (G1).
- The spike branch `spike/better-auth` is not merged.

## Implementation Plan

One phase, as in the spec. Each step lands as its own commit and keeps the app working and unit coverage at 100%.

## Risks

- `internalAdapter` APIs are internal to Better Auth. The version is pinned (`~1.7.10`) and an integration test guards them.
- Moving admin pages into a `(protected)` route group must not change URLs.
- The auth instance must stay lazy, so it is never created during `next build` or prerendering.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Owner sign-in with server-side enforcement

- [x] 1.1 Env and dependencies — e47d889
- [x] 1.2 Schema: admin auth entities and migration — f9458a9
- [x] 1.3 Auth factories and container wiring — 799d687
- [x] 1.4 createOwner and the admin:create CLI — 41c5988
- [x] 1.5 require-admin guard and inventory test — b4900c9
- [x] 1.6 Sign-in page, actions, auth route and protected route group — dad85e3
- [ ] 1.7 GET /api/admin/me
- [ ] 1.8 E2E suite with signInAsOwner
- [ ] 1.9 Docs

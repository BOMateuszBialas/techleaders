# 2026-10-15 — Better Auth 1.7 surprises (spike for the admin auth spec)

- The rate limiter keys on `x-forwarded-for` by default, and a client can forge it when there is no proxy. Set `advanced.ipAddress.ipAddressHeaders: []` unless a trusted proxy overwrites a header; then production uses one shared `no-trusted-ip` bucket per path.
- `disableSignUp` also blocks server-side `auth.api.signUpEmail`. Provision users with `$context.internalAdapter.createUser(user, { method: "admin" })` + `linkAccount` + `password.hash`, and revoke with `deleteUserSessions(userId)` (`deleteSessions` takes tokens).
- The `Secure` flag and the `__Secure-` prefix follow the `baseURL` protocol, not `NODE_ENV`.
- The instance checks the schema at init, so build it lazily at request time, never at import or prerender.
- Details: `.ai/specs/implemented/2026-10-15-admin-authentication.md`, "Spike results".

# 2026-10-15 — Better Auth: `auth.api.*` skips the rate limit and the origin check

Both run only in the HTTP router (`auth.handler`). A server action calling `auth.api.signInEmail` would sign in with no brute-force limit. `server/auth/sign-in.ts` therefore posts through `auth.handler()` and copies the cookie with `parseSetCookieHeader` / `toCookieOptions`; `nextCookies()` does nothing on the router path. Also, Better Auth silently disables the origin check when `NODE_ENV=test` unless `advanced.disableOriginCheck: false` is set; we set it, and integration tests caught the difference.

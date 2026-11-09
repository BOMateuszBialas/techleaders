/**
 * Response headers for every route of the app (set in next.config.ts).
 *
 * This is the safe subset: it stops clickjacking, MIME sniffing and needless
 * data leaks, and it does not change how scripts load. A full Content-Security-Policy
 * with script-src needs per-request nonces from the proxy, which forces dynamic
 * rendering and conflicts with cacheComponents. That is a separate decision
 * (see .ai/security-notes.md), so no script-src or default-src is set here.
 */
export const SECURITY_HEADERS: ReadonlyArray<{ key: string; value: string }> = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
];

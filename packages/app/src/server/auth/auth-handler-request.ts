import "server-only";
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { cookies, headers } from "next/headers";
import { getEnv } from "../env";

/** A Better Auth instance's HTTP handler (`auth.handler`), owner or customer. */
export type AuthHandler = (request: Request) => Promise<Response>;

/**
 * Posts a JSON body to a Better Auth HTTP handler from a server action, for the owner sign-in
 * and the customer sign-in and sign-up. It goes through the handler, never `auth.api.*`: only
 * the handler's router applies the rate limit and the origin check (lesson 2026-10-15). Only
 * `origin`, `user-agent`, `cookie` and the configured trusted IP header are forwarded, so a
 * client-sent `x-forwarded-for` never reaches the rate limiter. A thrown handler error
 * propagates to the caller, which maps it to its own "unavailable" outcome.
 */
export async function postToAuthHandler(
  handler: AuthHandler,
  endpoint: string,
  body: unknown,
): Promise<Response> {
  const env = getEnv();
  const incoming = await headers();
  const forwarded = new Headers({ "content-type": "application/json" });
  for (const name of ["origin", "user-agent", "cookie", env.AUTH_TRUSTED_IP_HEADER]) {
    const value = name ? incoming.get(name) : null;
    if (name && value) forwarded.set(name, value);
  }
  return handler(
    new Request(new URL(endpoint, env.APP_URL), {
      method: "POST",
      headers: forwarded,
      body: JSON.stringify(body),
    }),
  );
}

/**
 * The router path skips `nextCookies()`, so the session cookie a handler response sets is
 * copied into Next's cookie store here, with the library's own parser.
 */
export async function copySetCookies(response: Response): Promise<void> {
  const store = await cookies();
  parseSetCookieHeader(response.headers.get("set-cookie") ?? "").forEach((attributes, name) => {
    store.set(name, attributes.value, toCookieOptions(attributes));
  });
}

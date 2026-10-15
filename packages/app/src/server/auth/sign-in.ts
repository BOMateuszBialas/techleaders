import "server-only";
import { signInSchema } from "@commerceos/core";
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "../container";
import { getEnv } from "../env";
import { logger } from "../logger";
import type { SignInErrorCode } from "./sign-in-errors";

export const ADMIN_HOME = "/admin";
const SIGN_IN_ENDPOINT = "/api/auth/sign-in/email";
const signInResponseSchema = z.object({ user: z.object({ id: z.string() }) });

/**
 * Signs the owner in from the server action. It goes through Better Auth's HTTP handler,
 * not `auth.api.signInEmail`: only the handler's router applies the rate limit and the
 * origin check. The router path skips `nextCookies()`, so the session cookie it returns
 * is copied into Next's cookie store here with the library's own parser.
 */
export async function attemptSignIn(formData: FormData): Promise<"ok" | SignInErrorCode> {
  const input = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!input.success) return "invalid";

  const env = getEnv();
  const incoming = await headers();
  const forwarded = new Headers({ "content-type": "application/json" });
  for (const name of ["origin", "user-agent", "cookie", env.AUTH_TRUSTED_IP_HEADER]) {
    const value = name ? incoming.get(name) : null;
    if (name && value) forwarded.set(name, value);
  }

  let response: Response;
  try {
    response = await getAuth().handler(
      new Request(new URL(SIGN_IN_ENDPOINT, env.APP_URL), {
        method: "POST",
        headers: forwarded,
        body: JSON.stringify(input.data),
      }),
    );
  } catch (error) {
    logger.error("Admin sign-in failed", { event: "auth.sign_in_error", error });
    return "unavailable";
  }

  if (response.status === 429) return "rate_limited";
  if (response.status === 401) {
    logger.warn("Admin sign-in rejected", { event: "auth.sign_in_failed" });
    return "invalid";
  }
  if (!response.ok) {
    logger.error("Admin sign-in failed", { event: "auth.sign_in_error", status: response.status });
    return "unavailable";
  }

  const store = await cookies();
  parseSetCookieHeader(response.headers.get("set-cookie") ?? "").forEach((attributes, name) => {
    store.set(name, attributes.value, toCookieOptions(attributes));
  });
  const body = signInResponseSchema.safeParse(await response.json());
  logger.info("Admin signed in", { event: "auth.sign_in", userId: body.data?.user.id });
  return "ok";
}

/** Deletes the current session row (AC4); `nextCookies()` expires the cookie. */
export async function attemptSignOut(): Promise<void> {
  const requestHeaders = await headers();
  await getAuth().api.signOut({ headers: requestHeaders });
}

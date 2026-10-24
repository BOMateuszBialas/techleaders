import "server-only";
import { signInSchema } from "@commerceos/core";
import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "../container";
import { logger } from "../logger";
import { copySetCookies, postToAuthHandler } from "./auth-handler-request";
import type { SignInErrorCode } from "./sign-in-errors";

export const ADMIN_HOME = "/admin";
const SIGN_IN_ENDPOINT = "/api/auth/sign-in/email";
const signInResponseSchema = z.object({ user: z.object({ id: z.string() }) });

/**
 * Signs the owner in from the server action, through Better Auth's HTTP handler (rate limit and
 * origin check; see `postToAuthHandler`), then copies the session cookie it returns.
 */
export async function attemptSignIn(formData: FormData): Promise<"ok" | SignInErrorCode> {
  const input = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!input.success) return "invalid";

  let response: Response;
  try {
    response = await postToAuthHandler(getAuth().handler, SIGN_IN_ENDPOINT, input.data);
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

  await copySetCookies(response);
  const body = signInResponseSchema.safeParse(await response.json());
  logger.info("Admin signed in", { event: "auth.sign_in", userId: body.data?.user.id });
  return "ok";
}

/** Deletes the current session row (AC4); `nextCookies()` expires the cookie. */
export async function attemptSignOut(): Promise<void> {
  const requestHeaders = await headers();
  await getAuth().api.signOut({ headers: requestHeaders });
}

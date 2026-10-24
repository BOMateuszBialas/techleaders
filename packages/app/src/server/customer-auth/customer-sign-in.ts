import "server-only";
import { signInSchema } from "@commerceos/core";
import { z } from "zod";
import { copySetCookies, postToAuthHandler } from "../auth/auth-handler-request";
import { getCustomerAuth } from "../container";
import { logger } from "../logger";
import { CUSTOMER_AUTH_BASE_PATH, CUSTOMER_SIGN_IN_PATH } from "./create-customer-auth";
import type { CustomerSignInErrorCode } from "./customer-auth-errors";

const responseSchema = z.object({ user: z.object({ id: z.string() }) });

/**
 * Signs a customer in from the server action, through the customer instance's HTTP handler
 * (rate limit and origin check), then copies the `commerceos-customer.session_token` cookie.
 * Logs carry the customer id and an event code, never the email or IP (admin-auth G6).
 */
export async function attemptCustomerSignIn(
  formData: FormData,
): Promise<"ok" | CustomerSignInErrorCode> {
  const input = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!input.success) return "invalid";

  let response: Response;
  try {
    response = await postToAuthHandler(
      getCustomerAuth().handler,
      `${CUSTOMER_AUTH_BASE_PATH}${CUSTOMER_SIGN_IN_PATH}`,
      input.data,
    );
  } catch (error) {
    logger.error("Customer sign-in failed", { event: "customer_auth.sign_in_error", error });
    return "unavailable";
  }

  if (response.status === 429) return "rate_limited";
  if (response.status === 401) {
    logger.warn("Customer sign-in rejected", { event: "customer_auth.sign_in_failed" });
    return "invalid";
  }
  if (!response.ok) {
    logger.error("Customer sign-in failed", {
      event: "customer_auth.sign_in_error",
      status: response.status,
    });
    return "unavailable";
  }

  await copySetCookies(response);
  const body = responseSchema.safeParse(await response.json());
  logger.info("Customer signed in", {
    event: "customer_auth.sign_in",
    customerId: body.data?.user.id,
  });
  return "ok";
}

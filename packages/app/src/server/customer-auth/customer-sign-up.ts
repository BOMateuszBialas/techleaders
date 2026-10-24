import "server-only";
import { signInSchema } from "@commerceos/core";
import { z } from "zod";
import { copySetCookies, postToAuthHandler } from "../auth/auth-handler-request";
import { getCustomerAuth } from "../container";
import { logger } from "../logger";
import {
  CUSTOMER_AUTH_BASE_PATH,
  CUSTOMER_NAME,
  CUSTOMER_SIGN_UP_PATH,
} from "./create-customer-auth";
import type { CustomerSignUpErrorCode } from "./customer-auth-errors";

const responseSchema = z.object({ user: z.object({ id: z.string() }) });

/**
 * Registers a customer from the server action (E07 spec AC1, A7, A9) through the customer
 * instance's HTTP handler (rate limit and origin check), then copies the session cookie: the
 * new customer is signed in. The body is built here from the validated email and password plus
 * the fixed name; no other form field is ever forwarded, so a request cannot choose a role,
 * name or image. Every refusal (invalid input, duplicate email, any 4xx) is one `refused`
 * outcome, and the log line never names the cause.
 */
export async function attemptCustomerSignUp(
  formData: FormData,
): Promise<"ok" | CustomerSignUpErrorCode> {
  const input = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!input.success) return "refused";

  let response: Response;
  try {
    response = await postToAuthHandler(
      getCustomerAuth().handler,
      `${CUSTOMER_AUTH_BASE_PATH}${CUSTOMER_SIGN_UP_PATH}`,
      { email: input.data.email, password: input.data.password, name: CUSTOMER_NAME },
    );
  } catch (error) {
    logger.error("Customer sign-up failed", { event: "customer_auth.sign_up_error", error });
    return "unavailable";
  }

  if (response.status === 429) return "rate_limited";
  if (response.status >= 500) {
    logger.error("Customer sign-up failed", {
      event: "customer_auth.sign_up_error",
      status: response.status,
    });
    return "unavailable";
  }
  if (!response.ok) {
    // No status in the log: 422 (duplicate email) versus 400 would name the cause (A9).
    logger.warn("Customer sign-up refused", { event: "customer_auth.sign_up_refused" });
    return "refused";
  }

  await copySetCookies(response);
  const body = responseSchema.safeParse(await response.json());
  logger.info("Customer signed up", {
    event: "customer_auth.sign_up",
    customerId: body.data?.user.id,
  });
  return "ok";
}

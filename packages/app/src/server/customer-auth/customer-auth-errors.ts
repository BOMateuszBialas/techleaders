import { SIGN_IN_ERRORS } from "../auth/sign-in-errors";

/** The customer pages keep the text the owner's page had before P10 (not part of that approval). */
const CUSTOMER_UNAVAILABLE_TEXT = "Sign-in is unavailable. Try again.";

/**
 * Customer sign-in outcomes shown on `/account/sign-in?error=<code>` (E07 spec, API Contracts).
 * The page shows only these fixed messages, so a crafted `error` value can never inject text.
 * "invalid" never says whether the account exists. Same texts as the owner's sign-in.
 */
export const CUSTOMER_SIGN_IN_ERRORS = {
  ...SIGN_IN_ERRORS,
  // P10 changes the owner's wording only; the customer page keeps its own text.
  unavailable: CUSTOMER_UNAVAILABLE_TEXT,
} as const;
export type CustomerSignInErrorCode = keyof typeof CUSTOMER_SIGN_IN_ERRORS;

/**
 * Customer sign-up outcomes shown on `/account/sign-up?error=<code>`. One generic message for
 * every refusal (duplicate email, rejected password, library refusal), and neither the page nor
 * our logs name the cause (spec A9; the raw endpoint's explicit duplicate error is an accepted,
 * documented risk, D-b).
 */
export const CUSTOMER_SIGN_UP_ERRORS = {
  refused:
    "We could not create an account with these details. If you already have an account, sign in.",
  rate_limited: SIGN_IN_ERRORS.rate_limited,
  unavailable: CUSTOMER_UNAVAILABLE_TEXT,
} as const;
export type CustomerSignUpErrorCode = keyof typeof CUSTOMER_SIGN_UP_ERRORS;

function messageOf<T extends Record<string, string>>(
  messages: T,
  code: string | string[] | undefined,
): string | null {
  const entry = Object.entries(messages).find(([key]) => key === code);
  return entry ? entry[1] : null;
}

/** Message for a sign-in `error` search param, or null for anything unknown. */
export function customerSignInErrorMessage(code: string | string[] | undefined): string | null {
  return messageOf(CUSTOMER_SIGN_IN_ERRORS, code);
}

/** Message for a sign-up `error` search param, or null for anything unknown. */
export function customerSignUpErrorMessage(code: string | string[] | undefined): string | null {
  return messageOf(CUSTOMER_SIGN_UP_ERRORS, code);
}

/** Where a signed-in customer lands by default: "My orders" (spec A17). */
export const CUSTOMER_HOME = "/account/orders";
/** The one accepted value of `from`: return to checkout after signing in or up (spec A17). */
export const CHECKOUT_RETURN_CODE = "checkout";

export function isCheckoutReturn(from: unknown): boolean {
  return from === CHECKOUT_RETURN_CODE;
}

/**
 * Where a customer lands after signing in or up: `/checkout` only for the fixed code
 * `from=checkout`, otherwise "My orders". Any other value is ignored, so there is no free-form
 * return URL and no open-redirect surface.
 */
export function customerReturnPath(from: unknown): string {
  return isCheckoutReturn(from) ? "/checkout" : CUSTOMER_HOME;
}

/** A customer auth page with an optional fixed error code, keeping only `from=checkout`. */
export function customerAuthPageHref(
  page: "/account/sign-in" | "/account/sign-up",
  options: { error?: string; from?: unknown } = {},
): string {
  const params = new URLSearchParams();
  if (options.error) params.set("error", options.error);
  if (isCheckoutReturn(options.from)) params.set("from", CHECKOUT_RETURN_CODE);
  const query = params.toString();
  return query ? `${page}?${query}` : page;
}

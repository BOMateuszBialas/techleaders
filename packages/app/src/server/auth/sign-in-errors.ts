/**
 * Sign-in outcomes shown on `/admin/sign-in?error=<code>`. The page shows only these fixed
 * messages, so a crafted `error` value can never inject text. "invalid" never says whether
 * the account exists (AC3).
 */
export const SIGN_IN_ERRORS = {
  invalid: "Invalid email or password.",
  rate_limited: "Too many attempts. Try again in a minute.",
  unavailable: "Sign-in is unavailable. Try again.",
} as const;

export type SignInErrorCode = keyof typeof SIGN_IN_ERRORS;

export function isSignInErrorCode(value: unknown): value is SignInErrorCode {
  return typeof value === "string" && Object.hasOwn(SIGN_IN_ERRORS, value);
}

/** Message for the `error` search param, or null for anything unknown. */
export function signInErrorMessage(code: string | string[] | undefined): string | null {
  return isSignInErrorCode(code) ? SIGN_IN_ERRORS[code] : null;
}

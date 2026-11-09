/**
 * Whose account a checkout is placed for (E07 follow-up, issue 105). The checkout form carries the
 * account id it was rendered for; on submit the server compares it with the current session. A
 * different account means the shopper switched accounts in another tab after the form was shown,
 * so the order must not be placed under the new account with the old form's details.
 */

/** What the form showed: a guest form, or an account form carrying the id it was rendered for. */
export type CheckoutShown = { kind: "guest" } | { kind: "account"; customerId: string | null };

/** The session read as the decision needs it (a structural copy of the app's `CustomerIdResult`). */
export type CheckoutSessionAccount =
  | { status: "customer"; customerId: string; email: string }
  | { status: "none" }
  | { status: "error" };

/**
 * `account`: place the order for this session's customer. `guest`: place a guest order (the form
 * was a guest form; a session that appeared since is not read, A24). `session_lost`: the account
 * form met no confirmed session. `switched`: the session is another account; nothing is placed and
 * the form shows that account. `stale`: an account form without the id it was rendered for.
 */
export type CheckoutAccountDecision =
  | { outcome: "account"; customerId: string }
  | { outcome: "guest" }
  | { outcome: "session_lost" }
  | { outcome: "switched"; account: { id: string; email: string } }
  | { outcome: "stale" };

export function decideCheckoutAccount(
  shown: CheckoutShown,
  session: CheckoutSessionAccount,
): CheckoutAccountDecision {
  if (shown.kind === "guest") return { outcome: "guest" };
  if (shown.customerId === null) return { outcome: "stale" };
  if (session.status !== "customer") return { outcome: "session_lost" };
  if (session.customerId === shown.customerId) {
    return { outcome: "account", customerId: session.customerId };
  }
  return { outcome: "switched", account: { id: session.customerId, email: session.email } };
}

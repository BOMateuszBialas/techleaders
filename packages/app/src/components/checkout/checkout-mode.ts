import type { ActionState } from "@/lib/action-state";

/**
 * The mode the checkout shows and the order follows (E07 spec A24, owner refinement of D-c):
 * **account** ("Buying as <email>") only for a confirmed customer session, otherwise **guest**
 * ("Buying as a guest" with a sign-in link). `sessionError` adds the banner that the sign-in
 * could not be confirmed. Client-safe: the form imports it.
 */
export type CheckoutMode =
  { kind: "account"; email: string } | { kind: "guest"; sessionError: boolean };

/** The required hidden field that carries the shown mode to `placeOrder`. */
export const CHECKOUT_AS_FIELD = "checkoutAs";
export type CheckoutAs = "account" | "guest";

/** `placeOrder`'s state code when an account checkout met no confirmed session (A24). */
export const CHECKOUT_SESSION_LOST = "checkout_session_lost";

/** The session-read result as checkout needs it (a structural copy of `CustomerIdResult`). */
export type CheckoutSession =
  { status: "customer"; email: string } | { status: "none" } | { status: "error" };

/** The mode the page renders for this request's session read (A24). */
export function checkoutModeFor(session: CheckoutSession): CheckoutMode {
  if (session.status === "customer") return { kind: "account", email: session.email };
  return { kind: "guest", sessionError: session.status === "error" };
}

/**
 * The mode the form shows now: after an account submit that found no confirmed session, guest
 * mode with the banner, whatever the page read, so the shopper sees the change before the next
 * submit (A24: "a signed-in customer is never turned into a guest without seeing it").
 */
export function shownCheckoutMode(pageMode: CheckoutMode, state: ActionState): CheckoutMode {
  return state.code === CHECKOUT_SESSION_LOST ? { kind: "guest", sessionError: true } : pageMode;
}

/** `account` or `guest`, or null for anything else (a form this app did not render). */
export function parseCheckoutAs(value: string | undefined): CheckoutAs | null {
  return value === "account" || value === "guest" ? value : null;
}

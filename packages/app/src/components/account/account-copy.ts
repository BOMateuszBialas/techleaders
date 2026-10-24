/** Customer account copy (E07 spec, UI/UX). English UI, like the rest of the store (G8). */
export const ACCOUNT_COPY = {
  signInTitle: "Sign in to your account",
  signUpTitle: "Create an account",
  demoNote:
    "This is a demo store: use any email address. There is no password reset and no email verification.",
  continueAsGuest: "Continue as a guest",
  ordersHeading: "My orders",
  ordersEmpty: "You have no orders yet.",
  browseCatalog: "Browse the catalog",
  signOut: "Sign out",
  signIn: "Sign in",
  myOrders: "My orders",
  checkoutSignIn: "Sign in for order history",
  checkoutSignInHint: "or continue below as a guest.",
  /**
   * Phase 1 limitation, stated where it matters (principle 6): orders do not attach to accounts
   * until the next release, and an order placed now never will (spec A3). Removed in Phase 2b.
   */
  ordersNotSavedYet:
    "Orders are not saved to your account yet: an order placed now is a guest order, reachable with its order reference, and will not appear here later.",
} as const;

export const CUSTOMER_SIGN_IN_FROM_CHECKOUT = "/account/sign-in?from=checkout";

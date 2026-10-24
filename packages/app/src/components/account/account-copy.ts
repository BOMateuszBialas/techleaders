import { STORE_TIME_ZONE } from "@/components/admin/products/stock-copy";

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
  /** Checkout modes (spec A24): what the page shows is what the order becomes. */
  buyingAs: "Buying as",
  buyingAsGuest: "Buying as a guest.",
  accountOrderNote: "This order will appear under My orders.",
  sessionLost:
    "We could not confirm your sign-in, so you are checking out as a guest. Sign in to attach this order to your account.",
  ordersTableCaption: "Your orders, newest first",
  ordersCapped: "Showing your 50 most recent orders.",
  ordersUnavailable: "Your orders are unavailable right now. Try again.",
  orderUnavailable: "This order is unavailable right now. Try again.",
  orderDetailsHeading: "Order details",
  orderNotFound: "Order not found",
  orderNotFoundHint: "This order does not exist or is not in your account.",
  backToOrders: "Back to My orders",
  /** Shown on every reference not-found page (spec Architecture): it reveals nothing. */
  accountOrderHint: "Orders placed with an account open only while you are signed in to it.",
} as const;

export const CUSTOMER_SIGN_IN_FROM_CHECKOUT = "/account/sign-in?from=checkout";

export const ACCOUNT_ORDERS_PATH = "/account/orders";

/** `/account/orders/<id>`: the order's uuid, never its public reference (spec A11). */
export function accountOrderPath(id: string): string {
  return `${ACCOUNT_ORDERS_PATH}/${encodeURIComponent(id)}`;
}

/** An order date for the account pages, in the store's time zone (English UI, G8). */
export function formatAccountDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: STORE_TIME_ZONE,
  }).format(date);
}

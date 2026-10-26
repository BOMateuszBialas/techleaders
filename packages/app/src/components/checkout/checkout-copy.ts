import { ORDER_STATUS_LABELS, type OrderStatus } from "@commerceos/core";

/** Shopper-facing checkout, payment and order texts (cart spec, UI/UX). */

export const CHECKOUT_HEADING = "Checkout";
export const PLACE_ORDER_BUTTON = "Place order";
export const PLACING_ORDER = "Placing order…";
export const SHIPPING_COUNTRY_NAME = "Poland";
export const SHIPPING_FREE = "free";
export const REVIEW_CART_LINK = "Review your cart";
export const CHECKOUT_UNAVAILABLE_MESSAGE =
  "Checkout is temporarily unavailable. Please try again later.";
export const CART_CHANGES_HEADING = "Your cart changed";
/** OA-1 (retrofit Phase 1): "OK, update my cart" said nothing about what changes (WhatIsMissing P9). */
export const ACCEPT_CART_CHANGES_BUTTON = "Update my cart";

/**
 * R03, D03 and R11: the one payment note on the payment step. It names the mode (a test payment)
 * and says that no money is taken; there is no card field anywhere (see the pay form tests).
 */
export const PAYMENT_TEST_NOTE = "Test payment. No money is taken.";
export const PAY_HEADING = "Test payment";
export const CONFIRM_PAYMENT_BUTTON = "Confirm test payment";
export const CONFIRMING_PAYMENT = "Confirming…";
export const NOT_PAYABLE_MESSAGE = "This order can no longer be paid.";

export const PAID_HEADING = "Thank you — test payment received";
export const ORDER_STATUS_HEADING = "Order status";
export const PAID_WITH_TEST = "Paid with: test payment (no money taken)";
export const COMPLETE_PAYMENT_LINK = "Complete test payment";
/** No email is sent (spec G7): the reference is how the shopper finds the order again. */
export const SAVE_REFERENCE_NOTE = "Save this reference to check your order.";
export const ORDER_NOT_FOUND_HEADING = "No order found with this reference";
export const ORDER_UNAVAILABLE_MESSAGE =
  "Orders are temporarily unavailable. Please try again later.";

export const LOOKUP_HEADING = "Find your order";
export const LOOKUP_LABEL = "Order reference";
export const LOOKUP_BUTTON = "Find order";

/** The same status names the admin shows (`ORDER_STATUS_LABELS` in core). */
export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status];
}

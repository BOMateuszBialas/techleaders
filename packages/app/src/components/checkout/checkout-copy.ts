import type { OrderStatus } from "@commerceos/core";

/** Shopper-facing checkout, payment and order texts (cart spec, UI/UX). */

export const CHECKOUT_HEADING = "Checkout";
export const PLACE_ORDER_BUTTON = "Place order";
export const PLACING_ORDER = "Placing order…";
export const SHIPPING_COUNTRY_NAME = "Poland";
export const SHIPPING_FREE = "free (demo store)";
export const REVIEW_CART_LINK = "Review your cart";
export const CHECKOUT_UNAVAILABLE_MESSAGE =
  "Checkout is temporarily unavailable. Please try again later.";
export const CART_CHANGES_HEADING = "Your cart changed";
export const ACCEPT_CART_CHANGES_BUTTON = "OK, update my cart";

/** R03, D03: says plainly that nothing is charged and no card details exist anywhere. */
export const DEMO_PAYMENT_BANNER =
  "Demo store — this is a demo payment. No real money is charged and no card details are collected.";
export const PAY_HEADING = "Demo payment";
export const CONFIRM_PAYMENT_BUTTON = "Confirm demo payment (no charge)";
export const CONFIRMING_PAYMENT = "Confirming…";
export const NOT_PAYABLE_MESSAGE = "This order can no longer be paid.";

export const PAID_HEADING = "Thank you — demo payment received";
export const ORDER_STATUS_HEADING = "Order status";
export const PAID_WITH_DEMO = "Paid with: Demo payment (no money charged)";
export const COMPLETE_PAYMENT_LINK = "Complete demo payment";
/** No email is sent (spec G7): the reference is how the shopper finds the order again. */
export const SAVE_REFERENCE_NOTE = "Save this reference to check your order.";
export const ORDER_NOT_FOUND_HEADING = "No order found with this reference";
export const ORDER_UNAVAILABLE_MESSAGE =
  "Orders are temporarily unavailable. Please try again later.";

export const LOOKUP_HEADING = "Find your order";
export const LOOKUP_LABEL = "Order reference";
export const LOOKUP_BUTTON = "Find order";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function orderStatusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status];
}

import type { AdminOrderTransition, ChangeOrderStatusResult, OrderStatus } from "@commerceos/core";
import { STORE_TIME_ZONE } from "../products/stock-copy";

/**
 * Owner-facing copy for the order screens (orders spec, UI/UX), in one tested place. Status
 * names come from `ORDER_STATUS_LABELS` in core, so the admin and the shopper's order page
 * always agree.
 */

export const ORDERS_PATH = "/admin/orders";

export function orderPath(id: string): string {
  return `${ORDERS_PATH}/${id}`;
}

/** `/admin/orders` for page 1, `/admin/orders?page=N` after it. */
export function ordersPageHref(page: number): string {
  return page <= 1 ? ORDERS_PATH : `${ORDERS_PATH}?page=${page}`;
}

export const ORDERS_HEADING = "Orders";
export const ORDERS_INTRO =
  "Every order, newest first. Open one to see its items and customer, and to change its status.";
export const EMPTY_ORDERS_MESSAGE =
  "No orders yet. Orders appear here after a checkout. To load the demo store, run `npm run db:seed`.";
export const EMPTY_ORDERS_PAGE_MESSAGE = "There are no orders on this page.";
export const FIRST_PAGE_LINK = "Go to the first page";
export const NEWER_LINK = "Newer";
export const OLDER_LINK = "Older";
export const DEMO_BADGE = "Demo";
export const DEMO_ORDER_NOTE =
  "Seeded demo order: the customer is fictional and no real purchase happened.";
export const SHIPPING_FREE_LABEL = "free (demo store)";
export const DEMO_PAYMENT_LABEL = "Demo payment (no money charged)";
export const NOT_PAID_LABEL = "Not paid";
export const DELETED_PRODUCT_LABEL = "(deleted product)";
export const NO_FURTHER_CHANGES = "No further status changes.";
export const STATUS_ACTIONS_HEADING = "Change status";
export const STATUS_ACTIONS_NOTE =
  "Payment is set only by the payment flow; an unpaid order can only be cancelled.";
/** A cancel or refund posted without its confirmation box (only by editing the page). */
export const CONFIRM_REQUIRED_MESSAGE = "Tick the confirmation box first, then try again.";

export function pageLabel(page: number, pageCount: number): string {
  return `Page ${page} of ${pageCount}`;
}

/** "1 item", "3 items". */
export function itemsLabel(count: number): string {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

const BUTTON_LABELS: Partial<Record<OrderStatus, string>> = {
  processing: "Mark as processing",
  shipped: "Mark as shipped",
  cancelled: "Cancel order",
  refunded: "Mark as refunded (record only)",
};

/** The button for one allowed transition, e.g. "Mark as shipped". */
export function transitionButtonLabel(transition: AdminOrderTransition): string {
  return BUTTON_LABELS[transition.to] ?? `Mark as ${transition.toLabel.toLowerCase()}`;
}

/** Transitions with an effect beyond the status (a restock, a recorded refund) need a tick. */
export function needsConfirmation(transition: AdminOrderTransition): boolean {
  return transition.restocks || transition.isRecordOnly;
}

/** The confirmation box's label; `null` when the transition needs none. */
export function confirmationLabel(
  transition: AdminOrderTransition,
  restockableUnits: number,
): string | null {
  if (transition.restocks) {
    return `Cancel this unpaid order and return ${itemsLabel(restockableUnits)} to stock`;
  }
  if (transition.isRecordOnly) {
    return "Record this order as refunded. No money is moved; refunds are not processed in this demo store.";
  }
  return null;
}

/** Shown after a successful change (orders spec, API Contracts). */
export function statusChangedMessage(result: ChangeOrderStatusResult): string {
  if (result.to === "cancelled") {
    return `Order cancelled. Stock was returned for ${itemsLabel(result.restockedUnits)}.`;
  }
  if (result.to === "refunded") {
    return "Order marked as refunded. This is a record only; no money was moved.";
  }
  return `Order marked as ${result.order.statusLabel.toLowerCase()}.`;
}

/** A date and time in the owner's locale and the store's time zone (as the stock history). */
export function formatOrderDateTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: STORE_TIME_ZONE,
  }).format(date);
}

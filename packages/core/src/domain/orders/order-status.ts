import { ORDER_STATUSES, type OrderStatus } from "./order";

/**
 * The owner's order workflow (orders spec A4). Each status lists the statuses the admin may
 * move it to:
 *
 * - `paid → processing → shipped`: fulfilment.
 * - `pending_payment → cancelled`: the only cancel; it restores the order's stock.
 * - `paid`, `processing`, `shipped → refunded`: a recorded status only. No money moves and no
 *   stock returns (N02); a paid order is never cancelled.
 * - `cancelled` and `refunded` are terminal.
 *
 * `pending_payment → paid` is deliberately absent (A3): only the payment flow
 * (`ConfirmDemoPaymentUseCase` through `PaymentGateway`) creates a payment fact.
 */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending_payment: ["cancelled"],
  paid: ["processing", "refunded"],
  processing: ["shipped", "refunded"],
  shipped: ["refunded"],
  cancelled: [],
  refunded: [],
};

/** Owner- and shopper-facing names of the statuses. */
export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** True for a value the database's status column accepts. */
export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

/** The statuses the admin may move an order in `from` to, in workflow order. */
export function allowedTransitions(from: OrderStatus): readonly OrderStatus[] {
  return ORDER_TRANSITIONS[from];
}

/** True when the admin may move an order from `from` to `to` (A4). */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/**
 * True only for `pending_payment → cancelled`: the order's stock was reserved at checkout and
 * goes back to the products in the same transaction as the status change. A refund never
 * restocks (no return of goods is modelled, N02).
 */
export function restocksOnTransition(from: OrderStatus, to: OrderStatus): boolean {
  return from === "pending_payment" && to === "cancelled";
}

/** True for a status that records a fact without any effect: "refunded" moves no money (N02). */
export function isRecordOnlyStatus(status: OrderStatus): boolean {
  return status === "refunded";
}

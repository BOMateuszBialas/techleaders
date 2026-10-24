import type { CartLine } from "../domain/cart/cart";
import type { CurrencyCode } from "../domain/money";
import type {
  OrderDraft,
  OrderStatus,
  PaymentProvider,
  ReservedLine,
} from "../domain/orders/order";
import type { CustomerDetails } from "../validators/orders/checkout.schema";

/** An order line as stored: name and price are snapshots taken at placement. */
export type OrderItemRecord = {
  productId: string | null;
  name: string;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
};

/**
 * An order as the shopper-facing flow reads it. Deliberately without the customer's name,
 * email or address (spec A8): nothing read by reference can leak personal data.
 */
export type OrderRecord = {
  id: string;
  reference: string;
  requestFingerprint: string;
  /**
   * The customer account the order was placed with, or null for a guest order (E07 spec A2).
   * Used only for ownership checks; never part of a shopper-facing view.
   */
  customerId: string | null;
  status: OrderStatus;
  currency: CurrencyCode;
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  paymentProvider: PaymentProvider | null;
  paymentReference: string | null;
  paidAt: Date | null;
  createdAt: Date;
  items: OrderItemRecord[];
};

export type PlaceOrderCommand = {
  idempotencyKey: string;
  requestFingerprint: string;
  customer: CustomerDetails;
  /** The signed-in customer placing the order (from the session only), or null for a guest. */
  customerId: string | null;
  lines: readonly CartLine[];
  /** A fresh public reference for each attempt (a collision re-runs the transaction once). */
  newReference: () => string;
  /** Builds the order from the reserved lines inside the transaction (core rules). */
  buildDraft: (reserved: readonly ReservedLine[]) => OrderDraft;
};

export type MarkPaidResult = "paid" | "already_paid" | "not_payable" | "not_found";

/** Order persistence, implemented by the database package. */
export interface OrderRepositoryPort {
  /**
   * One transaction (cart spec, Transaction design): for each line, in product-id order, an
   * atomic conditional stock decrement that returns the price snapshot; then `buildDraft`, the
   * order and its items. A short line throws `InsufficientStockError` and nothing is written;
   * an error from `buildDraft` rolls everything back. A reused idempotency key throws a
   * `ConflictError` (the use case then reads the order that won).
   */
  placeOrder(command: PlaceOrderCommand): Promise<OrderRecord>;
  findByIdempotencyKey(idempotencyKey: string): Promise<OrderRecord | null>;
  findByReference(reference: string): Promise<OrderRecord | null>;
  /** `pending_payment` → `paid` as one conditional update; otherwise reports the state found. */
  markPaid(
    orderId: string,
    payment: { provider: PaymentProvider; reference: string },
  ): Promise<MarkPaidResult>;
}

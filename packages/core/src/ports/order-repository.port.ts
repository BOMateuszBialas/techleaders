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

/** One row of a customer's "My orders" list (E07 spec A13). */
export type CustomerOrderSummaryRecord = {
  id: string;
  reference: string;
  status: OrderStatus;
  currency: CurrencyCode;
  totalMinor: number;
  createdAt: Date;
};

/**
 * One of the signed-in customer's own orders (E07 spec A12): the shopper-facing record plus the
 * contact and address snapshot taken at checkout, which belongs to this customer.
 */
export type CustomerOrderRecord = OrderRecord & {
  customer: Omit<CustomerDetails, "shippingCountry"> & {
    /** ISO 3166-1 alpha-2 code as stored ("PL" only today, cart spec G6). */
    shippingCountry: string;
  };
};

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
  /**
   * The customer's own orders, newest first (`created_at desc, id desc`), at most `limit`.
   * Filtered in SQL by `customer_id = :customerId` (E07 spec A14): no other order is ever read.
   */
  listForCustomer(customerId: string, limit: number): Promise<CustomerOrderSummaryRecord[]>;
  /**
   * The order with this id only when it belongs to `customerId` (`where id = :orderId and
   * customer_id = :customerId`); a foreign and a missing order are the same `null` (A14).
   */
  findForCustomer(customerId: string, orderId: string): Promise<CustomerOrderRecord | null>;
}

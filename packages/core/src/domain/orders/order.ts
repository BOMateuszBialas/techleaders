import { ConflictError, ValidationError, hasAppErrorCode } from "../../errors/app-error";
import type { CartLine } from "../cart/cart";
import type { CurrencyCode } from "../money";

/**
 * Every status of the MVP order workflow (cart spec A10). This spec writes only
 * `pending_payment` and `paid`; the admin order workflow (E04) uses the rest without a
 * migration.
 */
export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Only the clearly labelled demo payment exists (D03): no real provider is integrated. */
export const PAYMENT_PROVIDERS = ["demo"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

/** Guest checkout ships to Poland only (spec G6); the column keeps the ISO code. */
export const SHIPPING_COUNTRIES = ["PL"] as const;
export type ShippingCountry = (typeof SHIPPING_COUNTRIES)[number];

/** The largest amount an `int` money column holds; larger totals are refused before the insert. */
export const MAX_ORDER_TOTAL_MINOR = 2_147_483_647;

/** A cart line whose stock was decremented, with the price snapshot read under the row lock. */
export type ReservedLine = {
  productId: string;
  name: string;
  sku: string | null;
  unitPriceMinor: number;
  currency: CurrencyCode;
  quantity: number;
};

export type OrderDraftItem = {
  productId: string;
  name: string;
  sku: string | null;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
};

/** What an order is inserted with: snapshots and totals, all integer minor units. */
export type OrderDraft = {
  currency: CurrencyCode;
  items: OrderDraftItem[];
  subtotalMinor: number;
  /** Fixed at 0: "Shipping: free (demo store)" (spec A11, G5). */
  shippingMinor: number;
  totalMinor: number;
};

export const PRICE_CHANGED_MESSAGE =
  "Prices changed since you added these items. Review the new total and submit again.";
export const ORDER_TOO_LARGE_MESSAGE = "This order is too large. Remove some items and try again.";
export const MIXED_CURRENCY_MESSAGE = "Your cart can hold products in one currency only.";

/** Why an order operation conflicted; read structurally (see `isOrderConflict`). */
export type OrderConflictReason =
  "insufficient_stock" | "price_changed" | "not_payable" | "cart_changed" | "form_reused";

/** A conflict with the order flow; `reason` lets the UI tell the cases apart without `instanceof`. */
export class OrderConflictError extends ConflictError {
  constructor(
    readonly reason: OrderConflictReason,
    message: string,
  ) {
    super(message);
  }
}

/** The stock could not cover a line at placement: nothing was written (spec #17 AC2). */
export class InsufficientStockError extends OrderConflictError {
  constructor(readonly productNames: readonly string[]) {
    super("insufficient_stock", soldOutMessage(productNames));
  }
}

/** The total recomputed at placement differs from the one the checkout showed (A6, G3). */
export class PriceChangedError extends OrderConflictError {
  constructor() {
    super("price_changed", PRICE_CHANGED_MESSAGE);
  }
}

/** The order cannot be paid in its current status, e.g. cancelled (spec API Contracts). */
export class OrderNotPayableError extends OrderConflictError {
  constructor() {
    super("not_payable", "This order can no longer be paid.");
  }
}

/** True for an `OrderConflictError` with this reason, from any copy of this package. */
export function isOrderConflict(error: unknown, reason: OrderConflictReason): boolean {
  return hasAppErrorCode(error, "CONFLICT") && "reason" in error && error.reason === reason;
}

/** "Sorry, Pulse Ultralight Mouse just sold out." (spec Edge Cases). */
export function soldOutMessage(productNames: readonly string[]): string {
  if (productNames.length === 0) return "Sorry, an item in your cart just sold out.";
  return `Sorry, ${productNames.join(", ")} just sold out. Review your cart and try again.`;
}

/**
 * Builds the order from the reserved lines (cart spec, Proposed Solution 2): snapshots, line
 * totals, subtotal, shipping 0 and total. The total must equal what the checkout showed
 * (`expectedTotalMinor`), otherwise `PriceChangedError` (the transaction rolls back). A total
 * above the `int` range is a `ValidationError` before PostgreSQL could overflow.
 */
export function buildOrderDraft(
  reserved: readonly ReservedLine[],
  expectedTotalMinor: number,
): OrderDraft {
  const first = reserved[0];
  if (!first) throw new ValidationError("Your cart is empty.");
  if (reserved.some((line) => line.currency !== first.currency)) {
    throw new ValidationError(MIXED_CURRENCY_MESSAGE);
  }
  const items = reserved.map((line) => ({
    productId: line.productId,
    name: line.name,
    sku: line.sku,
    unitPriceMinor: line.unitPriceMinor,
    quantity: line.quantity,
    lineTotalMinor: line.unitPriceMinor * line.quantity,
  }));
  const subtotalMinor = items.reduce((sum, item) => sum + item.lineTotalMinor, 0);
  const shippingMinor = 0;
  const totalMinor = subtotalMinor + shippingMinor;
  if (totalMinor > MAX_ORDER_TOTAL_MINOR) throw new ValidationError(ORDER_TOO_LARGE_MESSAGE);
  if (totalMinor !== expectedTotalMinor) throw new PriceChangedError();
  return { currency: first.currency, items, subtotalMinor, shippingMinor, totalMinor };
}

/**
 * The cart as the checkout form rendered it, `productId:quantity` sorted by id (spec A7). The
 * action compares it with the cookie, so a cart changed in another tab is never ordered.
 */
export function cartFingerprint(lines: readonly CartLine[]): string {
  return lines
    .map((line) => `${line.productId}:${line.quantity}`)
    .sort()
    .join(",");
}

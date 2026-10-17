import type { CurrencyCode } from "../domain/money";
import type { OrderStatus, PaymentProvider } from "../domain/orders/order";

/** One row of the owner's order list (orders spec A7). */
export type AdminOrderListRecord = {
  id: string;
  reference: string;
  status: OrderStatus;
  currency: CurrencyCode;
  totalMinor: number;
  /** Units across all lines. */
  itemCount: number;
  createdAt: Date;
};

/** An order line as stored: name, SKU and price are snapshots taken at placement. */
export type AdminOrderItemRecord = {
  id: string;
  /** Null once the product was deleted (the snapshot stays). */
  productId: string | null;
  name: string;
  sku: string | null;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
};

/**
 * An order as the signed-in owner sees it, with the customer's personal data. Read only by the
 * admin use cases; never logged and never returned by a shopper-facing or metric read model.
 */
export type AdminOrderRecord = {
  id: string;
  reference: string;
  status: OrderStatus;
  currency: CurrencyCode;
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  customerName: string;
  customerEmail: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingPostalCode: string;
  /** ISO 3166-1 alpha-2 code ("PL" only today, cart spec G6). */
  shippingCountry: string;
  paymentProvider: PaymentProvider | null;
  paymentReference: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: AdminOrderItemRecord[];
};

/** A status change the use case already validated against the transition table. */
export type ChangeOrderStatusCommand = {
  orderId: string;
  from: OrderStatus;
  to: OrderStatus;
  /** True only for `pending_payment → cancelled` (`restocksOnTransition`). */
  restock: boolean;
};

/**
 * What `changeStatus` did: changed the order (and, for a restock, returned `restockedUnits` to
 * the products that still exist), refused because the order is no longer in `from` (`stale`,
 * nothing written), or found no order.
 */
export type ChangeOrderStatusResult =
  | { kind: "changed"; order: AdminOrderRecord; restockedUnits: number }
  | { kind: "stale"; currentStatus: OrderStatus }
  | { kind: "not_found" };

/**
 * Order administration, implemented by the database package (orders spec, Phase 1).
 * `changeStatus` is one transaction: a conditional `update … where id = :id and status = :from`
 * (so a stale page or a concurrent payment is never overwritten) and, for a cancel, the stock
 * restock of every line whose product still exists.
 */
export interface OrderAdminPort {
  /** Newest first (`created_at desc, id desc`), with the total number of orders. */
  listOrders(page: { offset: number; limit: number }): Promise<{
    rows: AdminOrderListRecord[];
    total: number;
  }>;
  findOrderById(id: string): Promise<AdminOrderRecord | null>;
  changeStatus(command: ChangeOrderStatusCommand): Promise<ChangeOrderStatusResult>;
}

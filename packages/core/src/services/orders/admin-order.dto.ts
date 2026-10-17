import { isDemoOrderReference } from "../../domain/orders/demo-order";
import { money, type CurrencyCode, type Money } from "../../domain/money";
import type { OrderStatus, PaymentProvider } from "../../domain/orders/order";
import {
  ORDER_STATUS_LABELS,
  allowedTransitions,
  isRecordOnlyStatus,
  restocksOnTransition,
} from "../../domain/orders/order-status";
import type { AdminOrderListRecord, AdminOrderRecord } from "../../ports/order-admin.port";

export const ADMIN_ORDER_NOT_FOUND_MESSAGE = "Order not found.";

/** One row of `/admin/orders` (orders spec, Read models `ListAdminOrders`). */
export type AdminOrderListRow = {
  id: string;
  reference: string;
  createdAt: Date;
  status: OrderStatus;
  statusLabel: string;
  total: Money;
  itemCount: number;
  /** A seeded `DEMO-` order (A13): the list shows a "Demo" badge. */
  isDemo: boolean;
};

export type AdminOrderList = {
  rows: AdminOrderListRow[];
  page: number;
  /** At least 1, also for an empty store. */
  pageCount: number;
  total: number;
};

/** A status the owner may move the order to, with what the change does. */
export type AdminOrderTransition = {
  to: OrderStatus;
  toLabel: string;
  /** Only a cancel of an unpaid order returns stock. */
  restocks: boolean;
  /** A refund is recorded only: no money moves (N02). */
  isRecordOnly: boolean;
};

export type AdminOrderItem = {
  id: string;
  productId: string | null;
  name: string;
  sku: string | null;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
};

/**
 * The order detail for the signed-in owner (`GetAdminOrder`). It carries the customer's
 * name, email and address, so it is rendered only behind `requireAdminPage()` and never
 * logged; the shopper-facing `OrderView` and the metric read models never include them.
 */
export type AdminOrderView = {
  id: string;
  reference: string;
  status: OrderStatus;
  statusLabel: string;
  isDemo: boolean;
  createdAt: Date;
  paidAt: Date | null;
  updatedAt: Date;
  currency: CurrencyCode;
  items: AdminOrderItem[];
  subtotal: Money;
  shipping: Money;
  total: Money;
  customer: { name: string; email: string };
  shippingAddress: {
    line1: string;
    line2: string | null;
    city: string;
    postalCode: string;
    country: string;
  };
  payment: { provider: PaymentProvider; reference: string | null } | null;
  /** Units a cancel would return to stock (lines whose product still exists). */
  restockableUnits: number;
  allowedTransitions: AdminOrderTransition[];
};

export function toAdminOrderListRow(record: AdminOrderListRecord): AdminOrderListRow {
  return {
    id: record.id,
    reference: record.reference,
    createdAt: record.createdAt,
    status: record.status,
    statusLabel: ORDER_STATUS_LABELS[record.status],
    total: money(record.totalMinor, record.currency),
    itemCount: record.itemCount,
    isDemo: isDemoOrderReference(record.reference),
  };
}

export function toAdminOrderView(order: AdminOrderRecord): AdminOrderView {
  const { currency } = order;
  return {
    id: order.id,
    reference: order.reference,
    status: order.status,
    statusLabel: ORDER_STATUS_LABELS[order.status],
    isDemo: isDemoOrderReference(order.reference),
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    updatedAt: order.updatedAt,
    currency,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      sku: item.sku,
      unitPrice: money(item.unitPriceMinor, currency),
      quantity: item.quantity,
      lineTotal: money(item.lineTotalMinor, currency),
    })),
    subtotal: money(order.subtotalMinor, currency),
    shipping: money(order.shippingMinor, currency),
    total: money(order.totalMinor, currency),
    customer: { name: order.customerName, email: order.customerEmail },
    shippingAddress: {
      line1: order.shippingLine1,
      line2: order.shippingLine2,
      city: order.shippingCity,
      postalCode: order.shippingPostalCode,
      country: order.shippingCountry,
    },
    payment: order.paymentProvider
      ? { provider: order.paymentProvider, reference: order.paymentReference }
      : null,
    restockableUnits: order.items
      .filter((item) => item.productId !== null)
      .reduce((sum, item) => sum + item.quantity, 0),
    allowedTransitions: allowedTransitions(order.status).map((to) => ({
      to,
      toLabel: ORDER_STATUS_LABELS[to],
      restocks: restocksOnTransition(order.status, to),
      isRecordOnly: isRecordOnlyStatus(to),
    })),
  };
}

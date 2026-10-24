import { money, type Money } from "../../domain/money";
import type { OrderStatus, PaymentProvider } from "../../domain/orders/order";
import type {
  CustomerOrderRecord,
  CustomerOrderSummaryRecord,
} from "../../ports/order-repository.port";

/** "My orders" shows the newest 50 orders, with no paging (E07 spec A13). */
export const CUSTOMER_ORDERS_LIMIT = 50;

/**
 * The one "not found" of the account area (E07 spec A11, A12): a malformed, unknown and foreign
 * order id all give it, on the page and in the API alike.
 */
export const CUSTOMER_ORDER_NOT_FOUND_MESSAGE = "Order not found.";

/** One row of "My orders" and of `GET /api/account/orders` (A12). */
export type CustomerOrderSummaryDto = {
  id: string;
  reference: string;
  createdAt: Date;
  status: OrderStatus;
  total: Money;
};

export type CustomerOrderList = {
  orders: CustomerOrderSummaryDto[];
  /** More than `CUSTOMER_ORDERS_LIMIT` orders exist; only the newest are listed (A13). */
  capped: boolean;
};

/**
 * One of the customer's own orders (`/account/orders/<id>`, `GET /api/account/orders/<id>`):
 * items and totals from the snapshots, payment, and the contact and address the customer gave
 * at checkout. Never the customer id, the account or any session data.
 */
export type CustomerOrderDto = CustomerOrderSummaryDto & {
  items: { name: string; unitPrice: Money; quantity: number; lineTotal: Money }[];
  subtotal: Money;
  shipping: Money;
  paidAt: Date | null;
  paymentProvider: PaymentProvider | null;
  contact: { name: string; email: string };
  shippingAddress: {
    line1: string;
    line2: string | null;
    city: string;
    postalCode: string;
    country: string;
  };
};

export function toCustomerOrderSummary(
  record: CustomerOrderSummaryRecord,
): CustomerOrderSummaryDto {
  return {
    id: record.id,
    reference: record.reference,
    createdAt: record.createdAt,
    status: record.status,
    total: money(record.totalMinor, record.currency),
  };
}

export function toCustomerOrder(record: CustomerOrderRecord): CustomerOrderDto {
  const { currency, customer } = record;
  return {
    ...toCustomerOrderSummary(record),
    items: record.items.map((item) => ({
      name: item.name,
      unitPrice: money(item.unitPriceMinor, currency),
      quantity: item.quantity,
      lineTotal: money(item.lineTotalMinor, currency),
    })),
    subtotal: money(record.subtotalMinor, currency),
    shipping: money(record.shippingMinor, currency),
    paidAt: record.paidAt,
    paymentProvider: record.paymentProvider,
    contact: { name: customer.customerName, email: customer.customerEmail },
    shippingAddress: {
      line1: customer.shippingLine1,
      line2: customer.shippingLine2,
      city: customer.shippingCity,
      postalCode: customer.shippingPostalCode,
      country: customer.shippingCountry,
    },
  };
}

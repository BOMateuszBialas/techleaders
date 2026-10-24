import { money, type Money } from "../../domain/money";
import type { OrderStatus, PaymentProvider } from "../../domain/orders/order";
import { canViewOrder, type OrderViewer } from "../../domain/orders/order-access";
import { normalizeOrderReference } from "../../domain/orders/order-reference";
import { NotFoundError } from "../../errors/app-error";
import type { OrderRecord, OrderRepositoryPort } from "../../ports/order-repository.port";

export const ORDER_NOT_FOUND_MESSAGE = "No order found with this reference.";

/**
 * What the order and payment pages show (cart spec, API Contracts `GetOrderByReferenceUseCase`):
 * status, items and totals. No customer name, email or address, and no internal id, so a
 * shared reference reveals nothing personal (A8).
 */
export type OrderView = {
  reference: string;
  status: OrderStatus;
  createdAt: Date;
  paidAt: Date | null;
  items: { name: string; unitPrice: Money; quantity: number; lineTotal: Money }[];
  subtotal: Money;
  shipping: Money;
  total: Money;
  paymentProvider: PaymentProvider | null;
};

export function toOrderView(order: OrderRecord): OrderView {
  return {
    reference: order.reference,
    status: order.status,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    items: order.items.map((item) => ({
      name: item.name,
      unitPrice: money(item.unitPriceMinor, order.currency),
      quantity: item.quantity,
      lineTotal: money(item.lineTotalMinor, order.currency),
    })),
    subtotal: money(order.subtotalMinor, order.currency),
    shipping: money(order.shippingMinor, order.currency),
    total: money(order.totalMinor, order.currency),
    paymentProvider: order.paymentProvider,
  };
}

/**
 * The order with this reference, as `viewer` may see it. A malformed reference is "not found"
 * without a query, and so is an unknown one: both give the same answer (cart spec Edge Cases,
 * "Guessed / malformed"). An account order read by anyone but its own customer is the same "not
 * found" (E07 spec A2, A14): the check runs right after the lookup, before a caller can branch on
 * the order's status, so a foreign viewer learns nothing about it.
 */
export async function findOrderByReference(
  orders: OrderRepositoryPort,
  input: string,
  viewer: OrderViewer,
): Promise<OrderRecord> {
  const reference = normalizeOrderReference(input);
  const order = reference ? await orders.findByReference(reference) : null;
  if (!order || !canViewOrder(order, viewer)) throw new NotFoundError(ORDER_NOT_FOUND_MESSAGE);
  return order;
}

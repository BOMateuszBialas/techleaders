import type {
  AdminOrderListRecord,
  AdminOrderRecord,
  ChangeOrderStatusCommand,
  ChangeOrderStatusOutcome,
  OrderAdminPort,
  OrderStatus,
} from "@commerceos/core";
import type { EntityManager, QueryResult } from "@mikro-orm/postgresql";
import { OrderItemSchema, type OrderItem } from "../entities/orders/order-item.entity";
import { OrderSchema, type Order } from "../entities/orders/order.entity";
import { withSanitizedErrors } from "./sanitize-database-error";

function toRecord(order: Order, items: readonly OrderItem[]): AdminOrderRecord {
  return {
    id: order.id,
    reference: order.publicReference,
    status: order.status,
    currency: order.currency,
    subtotalMinor: order.subtotalMinor,
    shippingMinor: order.shippingMinor,
    totalMinor: order.totalMinor,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    shippingLine1: order.shippingLine1,
    shippingLine2: order.shippingLine2 ?? null,
    shippingCity: order.shippingCity,
    shippingPostalCode: order.shippingPostalCode,
    shippingCountry: order.shippingCountry,
    paymentProvider: order.paymentProvider ?? null,
    paymentReference: order.paymentReference ?? null,
    paidAt: order.paidAt ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    // Only whether an account placed it (E07 A18): never the customer id or account data.
    placedWithAccount: order.customer != null,
    items: items.map((item) => ({
      id: item.id,
      productId: item.product?.id ?? null,
      name: item.productName,
      sku: item.productSku ?? null,
      unitPriceMinor: item.unitPriceMinor,
      quantity: item.quantity,
      lineTotalMinor: item.lineTotalMinor,
    })),
  };
}

/**
 * Database adapter for the core `OrderAdminPort` (orders spec, Phase 1, "Status change").
 * Request-scoped: it works on the request's EntityManager fork. Every failure is sanitized:
 * order rows hold personal data, and a driver exception would carry its query into the log.
 *
 * `changeStatus` runs in one transaction under READ COMMITTED. The conditional update takes
 * the order's row lock, so a concurrent `markPaid` (also conditional on `pending_payment`)
 * waits and then matches nothing: exactly one of a cancel and a payment wins. A cancel then
 * adds each line's quantity back to its product, in product-id order (the same lock order as
 * checkout, so the two cannot deadlock); lines of deleted products are skipped. Any failure
 * rolls the status change back with the stock.
 */
export class DatabaseOrderAdminRepository implements OrderAdminPort {
  constructor(private readonly deps: { em: EntityManager }) {}

  async listOrders(page: {
    offset: number;
    limit: number;
  }): Promise<{ rows: AdminOrderListRecord[]; total: number }> {
    return withSanitizedErrors("Order list", async () => {
      const [orders, total] = await this.deps.em.findAndCount(
        OrderSchema,
        {},
        {
          orderBy: { createdAt: "desc", id: "desc" },
          limit: page.limit,
          offset: page.offset,
        },
      );
      const units = await this.unitsByOrder(orders.map((order) => order.id));
      const rows = orders.map((order) => ({
        id: order.id,
        reference: order.publicReference,
        status: order.status,
        currency: order.currency,
        totalMinor: order.totalMinor,
        itemCount: units.get(order.id) ?? 0,
        createdAt: order.createdAt,
        placedWithAccount: order.customer != null,
      }));
      return { rows, total };
    });
  }

  async findOrderById(id: string): Promise<AdminOrderRecord | null> {
    return withSanitizedErrors("Order read", () => this.load(this.deps.em, id));
  }

  async changeStatus(command: ChangeOrderStatusCommand): Promise<ChangeOrderStatusOutcome> {
    return withSanitizedErrors("Order status change", () =>
      this.deps.em.transactional((em) => this.changeStatusIn(em, command)),
    );
  }

  private async changeStatusIn(
    em: EntityManager,
    { orderId, from, to, restock }: ChangeOrderStatusCommand,
  ): Promise<ChangeOrderStatusOutcome> {
    const updated = await em.execute<QueryResult>(
      "update orders set status = ?, updated_at = now() where id = ? and status = ?",
      [to, orderId, from],
      "run",
    );
    if (updated.affectedRows === 0) {
      // Nothing matched: a stale page or a concurrent change (stale), or no such order.
      const rows = await em.execute<{ status: OrderStatus }[]>(
        "select status from orders where id = ?",
        [orderId],
      );
      const current = rows[0];
      return current ? { kind: "stale", currentStatus: current.status } : { kind: "not_found" };
    }

    const restockedUnits = restock ? await this.restock(em, orderId) : 0;
    const order = await this.load(em, orderId);
    // The update above matched this row inside the same transaction, so it exists.
    if (!order) throw new Error("A changed order could not be read back");
    return { kind: "changed", order, restockedUnits };
  }

  /** Adds each line's quantity back to its product (deleted products skipped); returns the units. */
  private async restock(em: EntityManager, orderId: string): Promise<number> {
    const lines = await em.execute<{ product_id: string; quantity: number }[]>(
      `select product_id, quantity from order_items
        where order_id = ? and product_id is not null order by product_id`,
      [orderId],
    );
    let units = 0;
    for (const line of lines) {
      const result = await em.execute<QueryResult>(
        "update products set stock_quantity = stock_quantity + ?, updated_at = now() where id = ?",
        [line.quantity, line.product_id],
        "run",
      );
      // A product deleted between the select and this update (set null on its lines) is skipped.
      if (result.affectedRows > 0) units += line.quantity;
    }
    return units;
  }

  private async load(em: EntityManager, id: string): Promise<AdminOrderRecord | null> {
    const order = await em.findOne(OrderSchema, { id }, { refresh: true });
    if (!order) return null;
    const items = await em.find(
      OrderItemSchema,
      { order: id },
      { orderBy: { productName: "asc", id: "asc" }, refresh: true },
    );
    return toRecord(order, items);
  }

  /** Units per order for the list page, in one grouped query. */
  private async unitsByOrder(ids: readonly string[]): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();
    const rows = await this.deps.em.execute<{ order_id: string; units: number }[]>(
      `select order_id, sum(quantity)::int as units from order_items
        where order_id in (${ids.map(() => "?").join(", ")}) group by order_id`,
      [...ids],
    );
    return new Map(rows.map((row) => [row.order_id, row.units]));
  }
}

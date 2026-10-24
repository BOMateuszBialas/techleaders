import {
  ConflictError,
  InsufficientStockError,
  type CurrencyCode,
  type MarkPaidResult,
  type OrderRecord,
  type OrderRepositoryPort,
  type PaymentProvider,
  type PlaceOrderCommand,
  type ReservedLine,
} from "@commerceos/core";
import type { EntityManager, QueryResult } from "@mikro-orm/postgresql";
import { OrderItemSchema, type OrderItem } from "../entities/orders/order-item.entity";
import { OrderSchema, type Order } from "../entities/orders/order.entity";
import { readConstraintViolation } from "./catalog-write-error";
import { sanitizeDatabaseError, withSanitizedErrors } from "./sanitize-database-error";

const UNIQUE_VIOLATION = "23505";
const REFERENCE_UNIQUE = "orders_public_reference_unique";
const IDEMPOTENCY_UNIQUE = "orders_idempotency_key_unique";

export const DUPLICATE_SUBMIT_MESSAGE = "This checkout form was already submitted.";

/**
 * The conditional decrement (cart spec, Proposed Solution 2): it applies only while the product
 * is published and has enough stock, and returns the price snapshot read under the row lock
 * the update holds, so price and stock come from the same instant.
 */
const RESERVE_LINE_SQL = `update products
  set stock_quantity = stock_quantity - ?, updated_at = now()
  where id = ? and status = 'published' and stock_quantity >= ?
  returning id, name, sku, price_minor, currency`;

type ReservedRow = {
  id: string;
  name: string;
  sku: string | null;
  price_minor: number;
  currency: CurrencyCode;
};

function uniqueConstraintOf(error: unknown): string | null {
  const violation = readConstraintViolation(error);
  return violation?.sqlState === UNIQUE_VIOLATION ? violation.constraint : null;
}

function toRecord(order: Order, items: readonly OrderItem[]): OrderRecord {
  return {
    id: order.id,
    reference: order.publicReference,
    requestFingerprint: order.requestFingerprint,
    customerId: order.customer?.id ?? null,
    status: order.status,
    currency: order.currency,
    subtotalMinor: order.subtotalMinor,
    shippingMinor: order.shippingMinor,
    totalMinor: order.totalMinor,
    paymentProvider: order.paymentProvider ?? null,
    paymentReference: order.paymentReference ?? null,
    paidAt: order.paidAt ?? null,
    createdAt: order.createdAt,
    items: items.map((item) => ({
      productId: item.product?.id ?? null,
      name: item.productName,
      unitPriceMinor: item.unitPriceMinor,
      quantity: item.quantity,
      lineTotalMinor: item.lineTotalMinor,
    })),
  };
}

/**
 * Database adapter for the core `OrderRepositoryPort` (cart spec, Transaction design).
 * Request-scoped: it works on the request's EntityManager fork.
 *
 * `placeOrder` is one transaction under READ COMMITTED: lines are reserved in product-id order
 * (a fixed lock order, so two multi-line orders cannot deadlock), each with a conditional
 * `update … returning`; a concurrent buyer of the same row waits for the lock and then
 * re-evaluates `stock_quantity >= :q` against the committed value, so the last unit is sold
 * once. Any short line, a `buildDraft` error or a failed insert rolls every decrement back.
 * A public-reference collision (about 2^-100) re-runs the whole transaction once.
 */
export class DatabaseOrderRepository implements OrderRepositoryPort {
  constructor(private readonly deps: { em: EntityManager }) {}

  async placeOrder(command: PlaceOrderCommand): Promise<OrderRecord> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.deps.em.transactional((em) => this.placeIn(em, command));
      } catch (error) {
        const constraint = uniqueConstraintOf(error);
        if (constraint === REFERENCE_UNIQUE && attempt === 1) continue;
        if (constraint === IDEMPOTENCY_UNIQUE) throw new ConflictError(DUPLICATE_SUBMIT_MESSAGE);
        // Never let the failed SQL (customer data, the reference) reach a log.
        throw sanitizeDatabaseError("Order placement", error);
      }
    }
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<OrderRecord | null> {
    return withSanitizedErrors("Order read", async () =>
      this.load(await this.deps.em.findOne(OrderSchema, { idempotencyKey })),
    );
  }

  async findByReference(reference: string): Promise<OrderRecord | null> {
    return withSanitizedErrors("Order read", async () =>
      this.load(await this.deps.em.findOne(OrderSchema, { publicReference: reference })),
    );
  }

  async markPaid(
    orderId: string,
    payment: { provider: PaymentProvider; reference: string },
  ): Promise<MarkPaidResult> {
    return withSanitizedErrors("Order payment", () => this.markPaidNow(orderId, payment));
  }

  private async markPaidNow(
    orderId: string,
    payment: { provider: PaymentProvider; reference: string },
  ): Promise<MarkPaidResult> {
    const updated = await this.deps.em.execute<QueryResult>(
      `update orders set status = 'paid', paid_at = now(), payment_provider = ?,
        payment_reference = ?, updated_at = now()
        where id = ? and status = 'pending_payment'`,
      [payment.provider, payment.reference, orderId],
      "run",
    );
    if (updated.affectedRows > 0) return "paid";
    // Nothing matched: a concurrent confirmation won, or the order is not payable.
    const rows = await this.deps.em.execute<{ paid_at: unknown }[]>(
      "select paid_at from orders where id = ?",
      [orderId],
    );
    const current = rows[0];
    if (!current) return "not_found";
    return current.paid_at === null ? "not_payable" : "already_paid";
  }

  private async load(order: Order | null): Promise<OrderRecord | null> {
    if (!order) return null;
    const items = await this.deps.em.find(
      OrderItemSchema,
      { order: order.id },
      { orderBy: { productName: "asc", id: "asc" } },
    );
    return toRecord(order, items);
  }

  private async placeIn(em: EntityManager, command: PlaceOrderCommand): Promise<OrderRecord> {
    const sorted = [...command.lines].sort((a, b) => a.productId.localeCompare(b.productId));
    const reserved: ReservedLine[] = [];
    const shortIds: string[] = [];
    for (const line of sorted) {
      const rows = await em.execute<ReservedRow[]>(RESERVE_LINE_SQL, [
        line.quantity,
        line.productId,
        line.quantity,
      ]);
      const row = rows[0];
      if (!row) {
        shortIds.push(line.productId);
        continue;
      }
      reserved.push({
        productId: row.id,
        name: row.name,
        sku: row.sku,
        unitPriceMinor: row.price_minor,
        currency: row.currency,
        quantity: line.quantity,
      });
    }
    if (shortIds.length > 0) throw new InsufficientStockError(await this.namesOf(em, shortIds));

    const draft = command.buildDraft(reserved);
    const { customer } = command;
    const order = em.create(OrderSchema, {
      publicReference: command.newReference(),
      idempotencyKey: command.idempotencyKey,
      requestFingerprint: command.requestFingerprint,
      // From the session only (E07 A14), written in the same transaction as the decrements.
      customer: command.customerId,
      status: "pending_payment",
      customerName: customer.customerName,
      customerEmail: customer.customerEmail,
      shippingLine1: customer.shippingLine1,
      shippingLine2: customer.shippingLine2,
      shippingCity: customer.shippingCity,
      shippingPostalCode: customer.shippingPostalCode,
      shippingCountry: customer.shippingCountry,
      currency: draft.currency,
      subtotalMinor: draft.subtotalMinor,
      shippingMinor: draft.shippingMinor,
      totalMinor: draft.totalMinor,
    });
    const items = draft.items.map((item) =>
      em.create(OrderItemSchema, {
        order,
        product: item.productId,
        productName: item.name,
        productSku: item.sku,
        unitPriceMinor: item.unitPriceMinor,
        quantity: item.quantity,
        lineTotalMinor: item.lineTotalMinor,
      }),
    );
    await em.flush();
    return toRecord(order, items);
  }

  /** The names of the short products, for "Sorry, X just sold out" (unknown ids are skipped). */
  private async namesOf(em: EntityManager, ids: readonly string[]): Promise<string[]> {
    const rows = await em.execute<{ name: string }[]>(
      `select name from products where id in (${ids.map(() => "?").join(", ")}) order by name`,
      [...ids],
    );
    return rows.map((row) => row.name);
  }
}

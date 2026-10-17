import { InsufficientStockError, type ReservedLine } from "../../domain/orders/order";
import { ConflictError } from "../../errors/app-error";
import type {
  MarkPaidResult,
  OrderRecord,
  OrderRepositoryPort,
  PlaceOrderCommand,
} from "../../ports/order-repository.port";
import type { CatalogProductRecord } from "../../ports/catalog-read.port";

/**
 * An in-memory `OrderRepositoryPort` that follows the database adapter's rules: conditional
 * stock decrements in product-id order, all-or-nothing, a unique idempotency key.
 */
export class InMemoryOrderRepository implements OrderRepositoryPort {
  readonly orders: OrderRecord[] = [];
  readonly stock: Map<string, number>;
  placeCalls = 0;
  /** Set to make the next `placeOrder` fail after the checks (e.g. a lost race). */
  failNextPlacement: unknown = undefined;
  /** Runs inside `placeOrder` before the checks, e.g. to simulate a concurrent winner. */
  beforePlacement: (() => void) | undefined = undefined;

  constructor(private readonly products: CatalogProductRecord[]) {
    this.stock = new Map(products.map((product) => [product.id, product.stockQuantity]));
  }

  async placeOrder(command: PlaceOrderCommand): Promise<OrderRecord> {
    this.placeCalls += 1;
    this.beforePlacement?.();
    if (this.failNextPlacement !== undefined) {
      const error = this.failNextPlacement;
      this.failNextPlacement = undefined;
      throw error;
    }
    if (this.orders.some((order) => order.id === `order-${command.idempotencyKey}`)) {
      throw new ConflictError("This checkout form was already submitted.");
    }
    const sorted = [...command.lines].sort((a, b) => a.productId.localeCompare(b.productId));
    const reserved: ReservedLine[] = [];
    const short: string[] = [];
    for (const line of sorted) {
      const product = this.products.find((record) => record.id === line.productId);
      const available = this.stock.get(line.productId) ?? 0;
      if (!product || product.status !== "published" || available < line.quantity) {
        short.push(product?.name ?? line.productId);
        continue;
      }
      reserved.push({
        productId: product.id,
        name: product.name,
        sku: null,
        unitPriceMinor: product.priceMinor,
        currency: product.currency,
        quantity: line.quantity,
      });
    }
    if (short.length > 0) throw new InsufficientStockError(short);
    const draft = command.buildDraft(reserved);
    for (const line of reserved) {
      this.stock.set(line.productId, (this.stock.get(line.productId) ?? 0) - line.quantity);
    }
    const order: OrderRecord = {
      id: `order-${command.idempotencyKey}`,
      reference: command.newReference(),
      requestFingerprint: command.requestFingerprint,
      status: "pending_payment",
      currency: draft.currency,
      subtotalMinor: draft.subtotalMinor,
      shippingMinor: draft.shippingMinor,
      totalMinor: draft.totalMinor,
      paymentProvider: null,
      paymentReference: null,
      paidAt: null,
      createdAt: new Date("2026-10-16T10:00:00.000Z"),
      items: draft.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        unitPriceMinor: item.unitPriceMinor,
        quantity: item.quantity,
        lineTotalMinor: item.lineTotalMinor,
      })),
    };
    this.orders.push(order);
    return order;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<OrderRecord | null> {
    return this.orders.find((order) => order.id === `order-${idempotencyKey}`) ?? null;
  }

  async findByReference(reference: string): Promise<OrderRecord | null> {
    return this.orders.find((order) => order.reference === reference) ?? null;
  }

  async markPaid(
    orderId: string,
    payment: { provider: "demo"; reference: string },
  ): Promise<MarkPaidResult> {
    const order = this.orders.find((candidate) => candidate.id === orderId);
    if (!order) return "not_found";
    if (order.status === "pending_payment") {
      Object.assign(order, {
        status: "paid",
        paidAt: new Date("2026-10-16T10:05:00.000Z"),
        paymentProvider: payment.provider,
        paymentReference: payment.reference,
      });
      return "paid";
    }
    return order.paidAt ? "already_paid" : "not_payable";
  }
}

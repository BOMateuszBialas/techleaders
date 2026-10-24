import { randomBytes, randomUUID, createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import {
  ConfirmDemoPaymentUseCase,
  FORM_REUSED_MESSAGE,
  GUEST_ORDER_VIEWER,
  GetOrderByReferenceUseCase,
  ORDER_NOT_FOUND_MESSAGE,
  PlaceOrderUseCase,
  cartFingerprint,
  hasAppErrorCode,
  isNotFoundError,
  isOrderConflict,
  type CartLine,
  type CheckoutRequest,
  type PaymentGateway,
} from "@commerceos/core";
import type { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "../cli/cli-orm";
import { DEMO_CATALOG, seedCatalog } from "../seeders/DatabaseSeeder";
import { E2E_CATALOG } from "../testing/catalog-fixtures";
import "../testing/provided-context";
import { DatabaseCatalogRepository } from "./database-catalog-repository";
import { DatabaseOrderRepository } from "./database-order-repository";

/** Seeded products whose stock each test sets explicitly. */
const VORTEX = "vortex-wireless-mouse"; // 249,00 zł
const PULSE = "pulse-ultralight-mouse"; // 189,00 zł
const DRAFT = "e2e-draft-keyboard";

describe("DatabaseOrderRepository (PostgreSQL)", () => {
  let orm: MikroORM;
  const ids: Record<string, string> = {};

  const sha256Hex = async (text: string) => createHash("sha256").update(text).digest("hex");
  const bytes = (length: number) => new Uint8Array(randomBytes(length));

  /** A use case on its own EntityManager fork, as one request would have. */
  function placeOrderUseCase() {
    const em = orm.em.fork();
    return new PlaceOrderUseCase({
      orderRepository: new DatabaseOrderRepository({ em }),
      catalogRepository: new DatabaseCatalogRepository({ em }),
      randomBytes: bytes,
      sha256Hex,
    });
  }

  const repository = () => new DatabaseOrderRepository({ em: orm.em.fork() });

  async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return orm.em.fork().execute<T[]>(sql, params);
  }

  async function setProduct(slug: string, values: { stock: number; price?: number }) {
    await query(
      "update products set stock_quantity = ?, price_minor = coalesce(?, price_minor) where slug = ?",
      [values.stock, values.price ?? null, slug],
    );
  }

  async function stockOf(slug: string): Promise<number> {
    const rows = await query<{ stock_quantity: number }>(
      "select stock_quantity from products where slug = ?",
      [slug],
    );
    return rows[0]?.stock_quantity ?? -1;
  }

  async function orderCount(): Promise<number> {
    const rows = await query<{ count: number }>("select count(*)::int as count from orders");
    return rows[0]?.count ?? -1;
  }

  function checkout(lines: CartLine[], totalMinor: number, key = randomUUID()): CheckoutRequest {
    return {
      idempotencyKey: key,
      customerName: "Ada Lovelace",
      customerEmail: "ada@example.test",
      shippingLine1: "ul. Marszałkowska 1",
      shippingLine2: "",
      shippingCity: "Warszawa",
      shippingPostalCode: "00-950",
      shippingCountry: "PL",
      expectedTotalMinor: String(totalMinor),
      cartFingerprint: cartFingerprint(lines),
    };
  }

  beforeAll(async () => {
    orm = await initToolingOrm(inject("databaseUrl"));
    await orm.schema.drop({ dropMigrationsTable: true });
    await orm.migrator.up();
    await seedCatalog(orm.em.fork(), DEMO_CATALOG);
    await seedCatalog(orm.em.fork(), E2E_CATALOG);
    for (const slug of [VORTEX, PULSE, DRAFT]) {
      const rows = await query<{ id: string }>("select id from products where slug = ?", [slug]);
      ids[slug] = rows[0]?.id ?? "";
    }
  });

  beforeEach(async () => {
    await query("delete from orders");
    await setProduct(VORTEX, { stock: 10, price: 24900 });
    await setProduct(PULSE, { stock: 1, price: 18900 });
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  const line = (slug: string, quantity: number): CartLine => ({
    productId: ids[slug] ?? "",
    quantity,
  });

  it("(a) places an order with name and price snapshots and decrements stock", async () => {
    const lines = [line(VORTEX, 2), line(PULSE, 1)];
    const { reference } = await placeOrderUseCase().execute({
      customerId: null,
      lines,
      request: checkout(lines, 2 * 24900 + 18900),
    });

    const order = await repository().findByReference(reference);
    expect(order).toMatchObject({
      status: "pending_payment",
      currency: "PLN",
      subtotalMinor: 68700,
      shippingMinor: 0,
      totalMinor: 68700,
      paidAt: null,
      paymentProvider: null,
    });
    expect(order?.items).toEqual([
      {
        productId: ids[PULSE],
        name: "Pulse Ultralight Mouse",
        unitPriceMinor: 18900,
        quantity: 1,
        lineTotalMinor: 18900,
      },
      {
        productId: ids[VORTEX],
        name: "Vortex Wireless Mouse",
        unitPriceMinor: 24900,
        quantity: 2,
        lineTotalMinor: 49800,
      },
    ]);
    expect(await stockOf(VORTEX)).toBe(8);
    expect(await stockOf(PULSE)).toBe(0);
    const [stored] = await query<{ customer_email: string; product_sku: string; country: string }>(
      `select o.customer_email, i.product_sku, o.shipping_country as country
         from orders o join order_items i on i.order_id = o.id where i.product_id = ?`,
      [ids[VORTEX]],
    );
    expect(stored).toEqual({
      customer_email: "ada@example.test",
      product_sku: "DEMO-MOU-001",
      country: "PL",
    });
  });

  it("(b) stock 1, two concurrent checkouts: exactly one order (#17 AC2)", async () => {
    const lines = [line(PULSE, 1)];
    const results = await Promise.allSettled([
      placeOrderUseCase().execute({ customerId: null, lines, request: checkout(lines, 18900) }),
      placeOrderUseCase().execute({ customerId: null, lines, request: checkout(lines, 18900) }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    // The loser fails at the conditional decrement, or (when the winner already committed) at
    // the cart re-check; either way it names the product and nothing is oversold.
    const reason: unknown = rejected?.reason;
    expect(
      isOrderConflict(reason, "insufficient_stock") || isOrderConflict(reason, "cart_changed"),
    ).toBe(true);
    expect((reason as Error).message).toContain("Pulse Ultralight Mouse");
    expect(await stockOf(PULSE)).toBe(0);
    expect(await orderCount()).toBe(1);
  });

  it("(b) at the row lock: two concurrent placements of the last unit sell it once", async () => {
    const lines = [line(PULSE, 1)];
    const place = (reference: string) =>
      repository().placeOrder({
        idempotencyKey: randomUUID(),
        requestFingerprint: "x",
        customerId: null,
        customer: {
          customerName: "Ada",
          customerEmail: "ada@example.test",
          shippingLine1: "ul. 1",
          shippingLine2: null,
          shippingCity: "Warszawa",
          shippingPostalCode: "00-950",
          shippingCountry: "PL",
        },
        lines,
        newReference: () => reference,
        buildDraft: (reserved) => ({
          currency: "PLN",
          items: reserved.map((item) => ({
            productId: item.productId,
            name: item.name,
            sku: item.sku,
            unitPriceMinor: item.unitPriceMinor,
            quantity: item.quantity,
            lineTotalMinor: item.unitPriceMinor * item.quantity,
          })),
          subtotalMinor: 18900,
          shippingMinor: 0,
          totalMinor: 18900,
        }),
      });
    const results = await Promise.allSettled([
      place("CO-00000-00000-00000-0000A"),
      place("CO-00000-00000-00000-0000B"),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(isOrderConflict(rejected?.reason, "insufficient_stock")).toBe(true);
    expect((rejected?.reason as Error).message).toBe(
      "Sorry, Pulse Ultralight Mouse just sold out. Review your cart and try again.",
    );
    expect(await stockOf(PULSE)).toBe(0);
    expect(await orderCount()).toBe(1);
  });

  it("(c) a multi-line order with one short line writes nothing", async () => {
    const lines = [line(VORTEX, 3), line(PULSE, 2)];
    const error = await placeOrderUseCase()
      .execute({ customerId: null, lines, request: checkout(lines, 3 * 24900 + 2 * 18900) })
      .catch((caught: unknown) => caught);

    // The cart re-check lowers Pulse to the stock first, so the fingerprint no longer matches.
    expect(isOrderConflict(error, "cart_changed")).toBe(true);

    // Straight to the repository: the decrement of Vortex is rolled back with the short line.
    const direct = await repository()
      .placeOrder({
        idempotencyKey: randomUUID(),
        requestFingerprint: "x",
        customerId: null,
        customer: {
          customerName: "Ada",
          customerEmail: "ada@example.test",
          shippingLine1: "ul. 1",
          shippingLine2: null,
          shippingCity: "Warszawa",
          shippingPostalCode: "00-950",
          shippingCountry: "PL",
        },
        lines,
        newReference: () => "CO-00000-00000-00000-00001",
        buildDraft: () => {
          throw new Error("must not be called");
        },
      })
      .catch((caught: unknown) => caught);
    expect(isOrderConflict(direct, "insufficient_stock")).toBe(true);
    expect(await stockOf(VORTEX)).toBe(10);
    expect(await stockOf(PULSE)).toBe(1);
    expect(await orderCount()).toBe(0);
  });

  it("(d) the same idempotency key twice concurrently returns one order, also for the last unit", async () => {
    for (const [slug, stock] of [
      [VORTEX, 10],
      [PULSE, 1],
    ] as const) {
      await query("delete from orders");
      await setProduct(slug, { stock });
      const lines = [line(slug, 1)];
      const price = slug === VORTEX ? 24900 : 18900;
      const request = checkout(lines, price);
      const [first, second] = await Promise.all([
        placeOrderUseCase().execute({ customerId: null, lines, request }),
        placeOrderUseCase().execute({ customerId: null, lines, request }),
      ]);
      expect(first.reference).toBe(second.reference);
      expect([first.replayed, second.replayed].sort()).toEqual([false, true]);
      expect(await orderCount()).toBe(1);
      expect(await stockOf(slug)).toBe(stock - 1);
    }
  });

  it("(e) a price changed between cart and placement is refused and nothing is written", async () => {
    const lines = [line(VORTEX, 1)];
    const request = checkout(lines, 24900);
    await setProduct(VORTEX, { stock: 10, price: 25900 });

    const error = await placeOrderUseCase()
      .execute({ customerId: null, lines, request })
      .catch((caught: unknown) => caught);
    expect(isOrderConflict(error, "price_changed")).toBe(true);
    expect(await stockOf(VORTEX)).toBe(10);
    expect(await orderCount()).toBe(0);
  });

  it("(f) a draft product cannot be ordered", async () => {
    const lines = [line(DRAFT, 1)];
    const direct = await repository()
      .placeOrder({
        idempotencyKey: randomUUID(),
        requestFingerprint: "x",
        customerId: null,
        customer: {
          customerName: "Ada",
          customerEmail: "ada@example.test",
          shippingLine1: "ul. 1",
          shippingLine2: null,
          shippingCity: "Warszawa",
          shippingPostalCode: "00-950",
          shippingCountry: "PL",
        },
        lines,
        newReference: () => "CO-00000-00000-00000-00002",
        buildDraft: () => {
          throw new Error("must not be called");
        },
      })
      .catch((caught: unknown) => caught);
    expect(isOrderConflict(direct, "insufficient_stock")).toBe(true);
    expect(await stockOf(DRAFT)).toBe(5);
  });

  it("re-runs the transaction once on a reference collision, and maps a duplicate key", async () => {
    const lines = [line(VORTEX, 1)];
    const first = await placeOrderUseCase().execute({
      customerId: null,
      lines,
      request: checkout(lines, 24900),
    });
    const references = [first.reference, "CO-00000-00000-00000-00003"];
    const key = randomUUID();
    const command = {
      idempotencyKey: key,
      requestFingerprint: "x",
      customerId: null,
      customer: {
        customerName: "Ada",
        customerEmail: "ada@example.test",
        shippingLine1: "ul. 1",
        shippingLine2: null,
        shippingCity: "Warszawa",
        shippingPostalCode: "00-950",
        shippingCountry: "PL" as const,
      },
      lines,
      newReference: () => references.shift() ?? "CO-00000-00000-00000-00004",
      buildDraft: () => ({
        currency: "PLN" as const,
        items: [
          {
            productId: ids[VORTEX] ?? "",
            name: "Vortex Wireless Mouse",
            sku: null,
            unitPriceMinor: 24900,
            quantity: 1,
            lineTotalMinor: 24900,
          },
        ],
        subtotalMinor: 24900,
        shippingMinor: 0,
        totalMinor: 24900,
      }),
    };
    const second = await repository().placeOrder(command);
    expect(second.reference).toBe("CO-00000-00000-00000-00003");
    // The collided attempt was rolled back: one unit per placed order.
    expect(await stockOf(VORTEX)).toBe(8);

    const duplicate = await repository()
      .placeOrder({ ...command, newReference: () => "CO-00000-00000-00000-00005" })
      .catch((caught: unknown) => caught);
    expect(hasAppErrorCode(duplicate, "CONFLICT")).toBe(true);
    expect(await stockOf(VORTEX)).toBe(8);
  });

  it("never puts customer data or the reference into a database error it throws", async () => {
    const error = await repository()
      .placeOrder({
        idempotencyKey: randomUUID(),
        requestFingerprint: "x",
        customerId: null,
        customer: {
          customerName: "Ada Lovelace",
          customerEmail: "ada@example.test",
          shippingLine1: "ul. 1",
          shippingLine2: null,
          shippingCity: "Warszawa",
          shippingPostalCode: "00-950",
          shippingCountry: "PL",
        },
        lines: [line(VORTEX, 1)],
        newReference: () => "CO-00000-00000-00000-0000S",
        // A total that breaks orders_total_check reaches the database.
        buildDraft: (reserved) => ({
          currency: "PLN",
          items: reserved.map((item) => ({
            productId: item.productId,
            name: item.name,
            sku: item.sku,
            unitPriceMinor: item.unitPriceMinor,
            quantity: item.quantity,
            lineTotalMinor: item.unitPriceMinor,
          })),
          subtotalMinor: 24900,
          shippingMinor: 0,
          totalMinor: 1,
        }),
      })
      .catch((caught: unknown) => caught);

    expect((error as Error).name).toBe("DatabaseOperationError");
    const text = `${(error as Error).message} ${(error as Error).stack}`;
    expect(text).toContain("orders_total_check");
    for (const secret of ["Ada", "ada@example.test", "CO-00000-00000-00000-0000S"]) {
      expect(text).not.toContain(secret);
    }
    expect(await stockOf(VORTEX)).toBe(10);
  });

  it("enforces the order check constraints", async () => {
    const lines = [line(VORTEX, 1)];
    const { reference } = await placeOrderUseCase().execute({
      customerId: null,
      lines,
      request: checkout(lines, 24900),
    });
    const bad = [
      "update orders set total_minor = 1 where public_reference = ?",
      "update orders set status = 'paid' where public_reference = ?",
      "update orders set status = 'unknown' where public_reference = ?",
      "update orders set shipping_country = 'pl' where public_reference = ?",
      "update orders set paid_at = now() where public_reference = ?",
      `update order_items set quantity = 100, line_total_minor = unit_price_minor * 100
         where order_id = (select id from orders where public_reference = ?)`,
      `update order_items set line_total_minor = 1
         where order_id = (select id from orders where public_reference = ?)`,
    ];
    for (const sql of bad) {
      const error = await query(sql, [reference]).catch((caught: unknown) => caught);
      expect((error as { code?: string }).code, sql).toBe("23514");
    }
  });

  it("keeps the item when its product is deleted and cascades an order delete", async () => {
    await query(
      `insert into products (name, slug, price_minor, stock_quantity, status)
         values ('[INT] Temp', 'int-temp', 1000, 5, 'published')`,
    );
    const [temp] = await query<{ id: string }>("select id from products where slug = 'int-temp'");
    const lines = [{ productId: temp?.id ?? "", quantity: 1 }];
    const { reference } = await placeOrderUseCase().execute({
      customerId: null,
      lines,
      request: checkout(lines, 1000),
    });

    await query("delete from products where slug = 'int-temp'");
    const order = await repository().findByReference(reference);
    expect(order?.items).toEqual([
      {
        productId: null,
        name: "[INT] Temp",
        unitPriceMinor: 1000,
        quantity: 1,
        lineTotalMinor: 1000,
      },
    ]);

    await query("delete from orders where public_reference = ?", [reference]);
    const items = await query<{ count: number }>("select count(*)::int as count from order_items");
    expect(items[0]?.count).toBe(0);
  });

  describe("ownership across customers (E07 Phase 2a)", () => {
    const customers: Record<"a" | "b", string> = { a: "", b: "" };

    beforeAll(async () => {
      for (const key of ["a", "b"] as const) {
        const [row] = await query<{ id: string }>(
          `insert into customer_users (name, email, email_verified) values ('Customer', ?, false)
            on conflict (email) do update set name = excluded.name returning id`,
          [`order-owner-${key}@db.test`],
        );
        customers[key] = row?.id ?? "";
      }
    });

    async function customerIdOf(reference: string): Promise<string | null | undefined> {
      const rows = await query<{ customer_id: string | null }>(
        "select customer_id from orders where public_reference = ?",
        [reference],
      );
      return rows[0]?.customer_id;
    }

    it("stores the placing customer in the order's transaction and reads it back", async () => {
      const lines = [line(VORTEX, 1)];
      const { reference } = await placeOrderUseCase().execute({
        customerId: customers.a,
        lines,
        request: checkout(lines, 24900),
      });
      expect(await customerIdOf(reference)).toBe(customers.a);
      expect((await repository().findByReference(reference))?.customerId).toBe(customers.a);
      expect(await stockOf(VORTEX)).toBe(9);

      const guest = await placeOrderUseCase().execute({
        customerId: null,
        lines,
        request: checkout(lines, 24900),
      });
      expect(await customerIdOf(guest.reference)).toBeNull();
      expect((await repository().findByReference(guest.reference))?.customerId).toBeNull();
    });

    it("rolls the stock back when the customer does not exist (generic, sanitized error)", async () => {
      const lines = [line(VORTEX, 1)];
      const error = await placeOrderUseCase()
        .execute({ customerId: randomUUID(), lines, request: checkout(lines, 24900) })
        .catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(Error);
      expect(error).toMatchObject({ message: expect.stringMatching(/^Order placement failed: /) });
      expect(error).not.toMatchObject({ message: expect.stringContaining("ada@example.test") });
      expect(await stockOf(VORTEX)).toBe(10);
      expect(await orderCount()).toBe(0);
    });

    it("never returns A's order to a form replayed by B or a guest (A15)", async () => {
      const lines = [line(VORTEX, 1)];
      const request = checkout(lines, 24900);
      const original = await placeOrderUseCase().execute({
        customerId: customers.a,
        lines,
        request,
      });

      for (const customerId of [customers.b, null]) {
        const error = await placeOrderUseCase()
          .execute({ customerId, lines, request })
          .catch((caught: unknown) => caught);
        expect(isOrderConflict(error, "form_reused")).toBe(true);
        expect(error).toMatchObject({ message: FORM_REUSED_MESSAGE });
        const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error));
        expect(serialized).not.toContain(original.reference);
        expect(serialized).not.toContain(original.orderId);
      }
      expect(await orderCount()).toBe(1);
      expect(await stockOf(VORTEX)).toBe(9);
      expect(await customerIdOf(original.reference)).toBe(customers.a);
    });

    it("opens A's order by reference only for A, and B cannot pay it", async () => {
      const lines = [line(VORTEX, 1)];
      const { reference } = await placeOrderUseCase().execute({
        customerId: customers.a,
        lines,
        request: checkout(lines, 24900),
      });
      const get = () => new GetOrderByReferenceUseCase({ orderRepository: repository() });
      const gateway: PaymentGateway = {
        provider: "demo",
        isLive: false,
        authorize: async ({ idempotencyKey }) => ({ providerReference: `PAY-${idempotencyKey}` }),
      };
      const confirm = () =>
        new ConfirmDemoPaymentUseCase({ orderRepository: repository(), paymentGateway: gateway });

      expect(await get().execute({ reference, viewer: { customerId: customers.a } })).toMatchObject(
        { reference, status: "pending_payment" },
      );
      for (const viewer of [{ customerId: customers.b }, GUEST_ORDER_VIEWER]) {
        for (const attempt of [
          () => get().execute({ reference, viewer }),
          () => confirm().execute({ reference, viewer }),
        ]) {
          const error = await attempt().catch((caught: unknown) => caught);
          expect(isNotFoundError(error)).toBe(true);
          expect(error).toMatchObject({ message: ORDER_NOT_FOUND_MESSAGE });
        }
      }
      const [row] = await query<{ status: string; paid: boolean }>(
        "select status, paid_at is not null as paid from orders where public_reference = ?",
        [reference],
      );
      expect(row).toEqual({ status: "pending_payment", paid: false });
    });
  });

  describe("payment", () => {
    const gateway: PaymentGateway = {
      provider: "demo",
      isLive: false,
      authorize: async ({ idempotencyKey }) => ({
        providerReference: `DEMO-PAY-${idempotencyKey}`,
      }),
    };
    const confirm = () =>
      new ConfirmDemoPaymentUseCase({ orderRepository: repository(), paymentGateway: gateway });

    it("two concurrent confirmations: one paid_at, one DEMO-PAY-<order id> reference", async () => {
      const lines = [line(VORTEX, 1)];
      const { reference } = await placeOrderUseCase().execute({
        customerId: null,
        lines,
        request: checkout(lines, 24900),
      });

      const outcomes = await Promise.all([
        confirm().execute({ reference, viewer: GUEST_ORDER_VIEWER }),
        confirm().execute({ reference, viewer: GUEST_ORDER_VIEWER }),
      ]);
      expect(outcomes.map((outcome) => outcome.outcome).sort()).toEqual(["already_paid", "paid"]);

      const [row] = await query<{ id: string; status: string; paid: boolean; ref: string }>(
        `select id, status, paid_at is not null as paid, payment_reference as ref
           from orders where public_reference = ?`,
        [reference],
      );
      expect(row).toMatchObject({ status: "paid", paid: true, ref: `DEMO-PAY-${row?.id}` });
      expect(await confirm().execute({ reference, viewer: GUEST_ORDER_VIEWER })).toEqual({
        orderId: row?.id,
        reference,
        outcome: "already_paid",
      });
    });

    it("refuses to pay a cancelled order and reports an unknown one", async () => {
      const lines = [line(VORTEX, 1)];
      const { reference } = await placeOrderUseCase().execute({
        customerId: null,
        lines,
        request: checkout(lines, 24900),
      });
      const [row] = await query<{ id: string }>(
        "select id from orders where public_reference = ?",
        [reference],
      );
      await query("update orders set status = 'cancelled' where id = ?", [row?.id]);

      expect(await repository().markPaid(row?.id ?? "", { provider: "demo", reference: "r" })).toBe(
        "not_payable",
      );
      expect(await repository().markPaid(randomUUID(), { provider: "demo", reference: "r" })).toBe(
        "not_found",
      );
      expect(await repository().findByIdempotencyKey(randomUUID())).toBeNull();
    });
  });
});

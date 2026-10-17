import { createHash, randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import {
  PlaceOrderUseCase,
  cartFingerprint,
  type CartLine,
  type CheckoutRequest,
} from "@commerceos/core";
import type { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "../cli/cli-orm";
import { DEMO_CATALOG, seedCatalog } from "../seeders/DatabaseSeeder";
import "../testing/provided-context";
import { DatabaseCatalogRepository } from "./database-catalog-repository";
import { DatabaseOrderAdminRepository } from "./database-order-admin-repository";
import { DatabaseOrderRepository } from "./database-order-repository";

const VORTEX = "vortex-wireless-mouse"; // 249,00 zł
const PULSE = "pulse-ultralight-mouse"; // 189,00 zł
const TEMP = "int-temp-pad"; // created per test, deleted by some

describe("DatabaseOrderAdminRepository (PostgreSQL)", () => {
  let orm: MikroORM;
  const ids: Record<string, string> = {};

  const admin = () => new DatabaseOrderAdminRepository({ em: orm.em.fork() });
  const orders = () => new DatabaseOrderRepository({ em: orm.em.fork() });

  async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return orm.em.fork().execute<T[]>(sql, params);
  }

  async function idOf(slug: string): Promise<string> {
    const rows = await query<{ id: string }>("select id from products where slug = ?", [slug]);
    return rows[0]?.id ?? "";
  }

  async function stockOf(slug: string): Promise<number> {
    const rows = await query<{ stock_quantity: number }>(
      "select stock_quantity from products where slug = ?",
      [slug],
    );
    return rows[0]?.stock_quantity ?? -1;
  }

  async function statusOf(orderId: string): Promise<{ status: string; paid_at: string | null }> {
    const rows = await query<{ status: string; paid_at: string | null }>(
      "select status, paid_at::text as paid_at from orders where id = ?",
      [orderId],
    );
    return rows[0] ?? { status: "missing", paid_at: null };
  }

  /** Places an order through the real checkout use case; returns its id. */
  async function place(lines: [slug: string, quantity: number][]): Promise<string> {
    const cart: CartLine[] = lines.map(([slug, quantity]) => ({
      productId: ids[slug] ?? "",
      quantity,
    }));
    const em = orm.em.fork();
    const prices = await query<{ id: string; price_minor: number }>(
      `select id, price_minor from products where id in (${cart.map(() => "?").join(", ")})`,
      cart.map((line) => line.productId),
    );
    const total = cart.reduce(
      (sum, line) =>
        sum + (prices.find((row) => row.id === line.productId)?.price_minor ?? 0) * line.quantity,
      0,
    );
    const request: CheckoutRequest = {
      idempotencyKey: randomUUID(),
      customerName: "Ada Lovelace",
      customerEmail: "ada@example.test",
      shippingLine1: "ul. Marszałkowska 1",
      shippingLine2: "",
      shippingCity: "Warszawa",
      shippingPostalCode: "00-950",
      shippingCountry: "PL",
      expectedTotalMinor: String(total),
      cartFingerprint: cartFingerprint(cart),
    };
    const { reference } = await new PlaceOrderUseCase({
      orderRepository: new DatabaseOrderRepository({ em }),
      catalogRepository: new DatabaseCatalogRepository({ em }),
      randomBytes: (length) => new Uint8Array(randomBytes(length)),
      sha256Hex: async (text) => createHash("sha256").update(text).digest("hex"),
    }).execute({ lines: cart, request });
    const rows = await query<{ id: string }>("select id from orders where public_reference = ?", [
      reference,
    ]);
    return rows[0]?.id ?? "";
  }

  async function pay(orderId: string) {
    expect(
      await orders().markPaid(orderId, { provider: "demo", reference: `PAY-${orderId}` }),
    ).toBe("paid");
  }

  beforeAll(async () => {
    orm = await initToolingOrm(inject("databaseUrl"));
    await orm.schema.drop({ dropMigrationsTable: true });
    await orm.migrator.up();
    await seedCatalog(orm.em.fork(), DEMO_CATALOG);
    ids[VORTEX] = await idOf(VORTEX);
    ids[PULSE] = await idOf(PULSE);
  });

  beforeEach(async () => {
    await query("delete from orders");
    await query("delete from products where slug = ?", [TEMP]);
    await query("update products set stock_quantity = 20 where slug in (?, ?)", [VORTEX, PULSE]);
    await query(
      `insert into products (name, slug, price_minor, currency, sku, stock_quantity, status)
        values ('[INT] Temp Pad', ?, 1000, 'PLN', 'INT-TEMP-001', 10, 'published')`,
      [TEMP],
    );
    ids[TEMP] = await idOf(TEMP);
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  it("lists orders newest first with their units, page by page", async () => {
    const first = await place([[VORTEX, 1]]);
    const second = await place([
      [VORTEX, 2],
      [PULSE, 1],
    ]);
    const third = await place([[PULSE, 3]]);
    // Fixed creation times, so the order does not depend on the clock's resolution.
    for (const [id, at] of [
      [first, "2026-10-14T10:00:00Z"],
      [second, "2026-10-15T10:00:00Z"],
      [third, "2026-10-16T10:00:00Z"],
    ] as const) {
      await query("update orders set created_at = ? where id = ?", [at, id]);
    }

    const page1 = await admin().listOrders({ offset: 0, limit: 2 });
    expect(page1.total).toBe(3);
    expect(page1.rows.map((row) => [row.id, row.itemCount])).toEqual([
      [third, 3],
      [second, 3],
    ]);
    expect(page1.rows[0]).toMatchObject({
      status: "pending_payment",
      currency: "PLN",
      totalMinor: 3 * 18900,
      createdAt: new Date("2026-10-16T10:00:00Z"),
    });
    expect(page1.rows[0]?.reference).toMatch(/^CO-/);

    const page2 = await admin().listOrders({ offset: 2, limit: 2 });
    expect(page2).toMatchObject({ total: 3, rows: [{ id: first, itemCount: 1 }] });
    expect(await admin().listOrders({ offset: 4, limit: 2 })).toEqual({ rows: [], total: 3 });
  });

  it("shows the snapshots after a product was renamed and after one was deleted", async () => {
    const orderId = await place([
      [VORTEX, 1],
      [TEMP, 2],
    ]);
    await query("update products set name = 'Renamed Mouse', price_minor = 1 where slug = ?", [
      VORTEX,
    ]);
    await query("delete from products where slug = ?", [TEMP]);

    const order = await admin().findOrderById(orderId);
    expect(order).toMatchObject({
      status: "pending_payment",
      customerName: "Ada Lovelace",
      customerEmail: "ada@example.test",
      shippingLine1: "ul. Marszałkowska 1",
      shippingLine2: null,
      shippingCity: "Warszawa",
      shippingPostalCode: "00-950",
      shippingCountry: "PL",
      subtotalMinor: 24900 + 2000,
      shippingMinor: 0,
      totalMinor: 24900 + 2000,
      paidAt: null,
    });
    // Sorted by snapshot name; the test database uses a byte collation ("V" before "[").
    expect(order?.items).toEqual([
      {
        id: expect.any(String),
        productId: ids[VORTEX],
        name: "Vortex Wireless Mouse",
        sku: expect.stringMatching(/^DEMO-/),
        unitPriceMinor: 24900,
        quantity: 1,
        lineTotalMinor: 24900,
      },
      {
        id: expect.any(String),
        productId: null,
        name: "[INT] Temp Pad",
        sku: "INT-TEMP-001",
        unitPriceMinor: 1000,
        quantity: 2,
        lineTotalMinor: 2000,
      },
    ]);
    expect(await admin().findOrderById(randomUUID())).toBeNull();
    await query(
      "update products set name = 'Vortex Wireless Mouse', price_minor = 24900 where slug = ?",
      [VORTEX],
    );
  });

  it("refuses a stale status and an unknown order, writing nothing", async () => {
    const orderId = await place([[VORTEX, 1]]);
    await pay(orderId);

    expect(
      await admin().changeStatus({
        orderId,
        from: "pending_payment",
        to: "cancelled",
        restock: true,
      }),
    ).toEqual({ kind: "stale", currentStatus: "paid" });
    expect(await stockOf(VORTEX)).toBe(19);
    expect((await statusOf(orderId)).status).toBe("paid");

    expect(
      await admin().changeStatus({
        orderId: randomUUID(),
        from: "paid",
        to: "processing",
        restock: false,
      }),
    ).toEqual({ kind: "not_found" });
  });

  it("cancels a pending order and restores every line's stock in one transaction, skipping deleted products", async () => {
    const orderId = await place([
      [VORTEX, 2],
      [PULSE, 3],
      [TEMP, 4],
    ]);
    expect([await stockOf(VORTEX), await stockOf(PULSE), await stockOf(TEMP)]).toEqual([18, 17, 6]);
    await query("delete from products where slug = ?", [TEMP]);

    const result = await admin().changeStatus({
      orderId,
      from: "pending_payment",
      to: "cancelled",
      restock: true,
    });

    expect(result).toMatchObject({
      kind: "changed",
      restockedUnits: 5,
      order: { status: "cancelled" },
    });
    expect([await stockOf(VORTEX), await stockOf(PULSE)]).toEqual([20, 20]);
    expect(await statusOf(orderId)).toEqual({ status: "cancelled", paid_at: null });
    // A cancelled order can never be paid afterwards.
    expect(await orders().markPaid(orderId, { provider: "demo", reference: "late" })).toBe(
      "not_payable",
    );
  });

  it("rolls the restock back with the status when the transaction fails", async () => {
    const orderId = await place([[VORTEX, 2]]);
    // A product at the int limit makes the restock overflow, so the whole change must roll back.
    await query("update products set stock_quantity = 2147483647 where slug = ?", [VORTEX]);

    await expect(
      admin().changeStatus({ orderId, from: "pending_payment", to: "cancelled", restock: true }),
    ).rejects.toThrow(/^Order status change failed: /);
    expect((await statusOf(orderId)).status).toBe("pending_payment");
    expect(await stockOf(VORTEX)).toBe(2147483647);
  });

  it("lets exactly one of a cancel and a concurrent payment win", async () => {
    for (let round = 0; round < 5; round += 1) {
      await query("update products set stock_quantity = 20 where slug = ?", [VORTEX]);
      const orderId = await place([[VORTEX, 1]]);

      const [cancel, payment] = await Promise.allSettled([
        admin().changeStatus({ orderId, from: "pending_payment", to: "cancelled", restock: true }),
        orders().markPaid(orderId, { provider: "demo", reference: `PAY-${orderId}` }),
      ]);
      if (cancel.status !== "fulfilled" || payment.status !== "fulfilled") {
        throw new Error("neither call should fail");
      }
      const cancelled = cancel.value.kind === "changed";
      const paid = payment.value === "paid";
      expect(cancelled !== paid).toBe(true);

      const { status } = await statusOf(orderId);
      expect(status).toBe(cancelled ? "cancelled" : "paid");
      // Stock comes back only when the cancel won.
      expect(await stockOf(VORTEX)).toBe(cancelled ? 20 : 19);
      if (!cancelled) expect(cancel.value).toEqual({ kind: "stale", currentStatus: "paid" });
    }
  });

  it("walks paid → processing → shipped → refunded, keeping paid_at and the stock", async () => {
    const orderId = await place([[PULSE, 2]]);
    await pay(orderId);
    const paidAt = (await statusOf(orderId)).paid_at;
    expect(paidAt).not.toBeNull();

    for (const [from, to] of [
      ["paid", "processing"],
      ["processing", "shipped"],
      ["shipped", "refunded"],
    ] as const) {
      const result = await admin().changeStatus({ orderId, from, to, restock: false });
      expect(result).toMatchObject({ kind: "changed", restockedUnits: 0, order: { status: to } });
    }
    expect(await statusOf(orderId)).toEqual({ status: "refunded", paid_at: paidAt });
    expect(await stockOf(PULSE)).toBe(18);
  });

  it("still enforces E02's paid_at checks below the use case", async () => {
    const orderId = await place([[VORTEX, 1]]);
    // A pending order has no payment: "refunded" without paid_at violates orders_paid_at_check.
    await expect(
      admin().changeStatus({ orderId, from: "pending_payment", to: "refunded", restock: false }),
    ).rejects.toThrow(/^Order status change failed: .*constraint orders_paid_at_check/);
    expect((await statusOf(orderId)).status).toBe("pending_payment");
  });
});

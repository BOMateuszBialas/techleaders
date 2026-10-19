import { randomUUID } from "node:crypto";
import {
  GetDashboardUseCase,
  GetLowStockProductsUseCase,
  GetOrderSummaryUseCase,
  GetSalesSummaryUseCase,
  GetTopProductsUseCase,
} from "@commerceos/core";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "../cli/cli-orm";
import { DEMO_CATALOG, seedCatalog } from "../seeders/DatabaseSeeder";
import { E2E_CATALOG } from "../testing/catalog-fixtures";
import "../testing/provided-context";
import { DatabaseStoreMetrics } from "./database-store-metrics";

/**
 * The metric queries against a hand-built fixture (orders spec, Phase 3 step 11), not the demo
 * generator: every expected value below is computed by hand from the orders in `ORDERS`.
 *
 * Period: 11–17 Oct 2026 in Europe/Warsaw = [2026-10-10T22:00Z, 2026-10-17T22:00Z).
 */
const RANGE = {
  from: new Date("2026-10-10T22:00:00.000Z"),
  to: new Date("2026-10-17T22:00:00.000Z"),
};

type Line = { product: string; name: string; unit: number; qty: number };
type FixtureOrder = {
  ref: string;
  status: string;
  currency?: string;
  createdAt: string;
  paidAt?: string;
  lines: Line[];
};

const GONE = "[INT] Gone pad";

// `product` is a seeded slug, or GONE for a product deleted after its orders.
const ORDERS: FixtureOrder[] = [
  // A–C: paid states inside the period (PLN).
  {
    ref: "CO-INT-A",
    status: "paid",
    createdAt: "2026-10-12T10:00:00Z",
    paidAt: "2026-10-12T10:05:00Z",
    lines: [
      { product: "vortex-wireless-mouse", name: "Vortex Wireless Mouse", unit: 24900, qty: 2 },
    ],
  },
  {
    ref: "CO-INT-B",
    status: "processing",
    createdAt: "2026-10-13T10:00:00Z",
    paidAt: "2026-10-13T10:05:00Z",
    lines: [
      { product: "pulse-ultralight-mouse", name: "Pulse Ultralight Mouse", unit: 18900, qty: 1 },
      { product: "vortex-wireless-mouse", name: "Vortex Wireless Mouse", unit: 24900, qty: 1 },
    ],
  },
  {
    ref: "CO-INT-C",
    status: "shipped",
    createdAt: "2026-10-14T10:00:00Z",
    paidAt: "2026-10-14T10:05:00Z",
    lines: [
      { product: "pulse-ultralight-mouse", name: "Pulse Ultralight Mouse", unit: 18900, qty: 3 },
    ],
  },
  // D: pending; E: cancelled, never paid; F: refunded after it was paid inside the period.
  {
    ref: "CO-INT-D",
    status: "pending_payment",
    createdAt: "2026-10-15T10:00:00Z",
    lines: [
      { product: "vortex-wireless-mouse", name: "Vortex Wireless Mouse", unit: 24900, qty: 1 },
    ],
  },
  {
    ref: "CO-INT-E",
    status: "cancelled",
    createdAt: "2026-10-15T11:00:00Z",
    lines: [
      { product: "pulse-ultralight-mouse", name: "Pulse Ultralight Mouse", unit: 18900, qty: 1 },
    ],
  },
  {
    ref: "CO-INT-F",
    status: "refunded",
    createdAt: "2026-10-14T12:00:00Z",
    paidAt: "2026-10-14T12:05:00Z",
    lines: [
      { product: "vortex-wireless-mouse", name: "Vortex Wireless Mouse", unit: 24900, qty: 5 },
    ],
  },
  // G: paid in EUR inside the period.
  {
    ref: "CO-INT-G",
    status: "paid",
    currency: "EUR",
    createdAt: "2026-10-15T12:00:00Z",
    paidAt: "2026-10-15T12:05:00Z",
    lines: [
      { product: "vortex-wireless-mouse", name: "Vortex Wireless Mouse", unit: 5000, qty: 1 },
    ],
  },
  // H: placed before the period, paid inside it.
  {
    ref: "CO-INT-H",
    status: "shipped",
    createdAt: "2026-10-09T12:00:00Z",
    paidAt: "2026-10-11T08:00:00Z",
    lines: [{ product: "glide-xl-mousepad", name: "Glide XL Mousepad", unit: 12900, qty: 2 }],
  },
  // I: placed and paid before the period.
  {
    ref: "CO-INT-I",
    status: "paid",
    createdAt: "2026-10-09T12:00:00Z",
    paidAt: "2026-10-09T12:05:00Z",
    lines: [
      { product: "vortex-wireless-mouse", name: "Vortex Wireless Mouse", unit: 24900, qty: 1 },
    ],
  },
  // J, K: a product deleted after the orders (lines keep their snapshot, product_id null).
  {
    ref: "CO-INT-J",
    status: "paid",
    createdAt: "2026-10-16T09:00:00Z",
    paidAt: "2026-10-16T09:05:00Z",
    lines: [{ product: GONE, name: GONE, unit: 1000, qty: 4 }],
  },
  {
    ref: "CO-INT-K",
    status: "paid",
    createdAt: "2026-10-16T10:00:00Z",
    paidAt: "2026-10-16T10:05:00Z",
    lines: [{ product: GONE, name: GONE, unit: 1000, qty: 1 }],
  },
  // L: a seeded demo order inside the period; M: a demo order before it.
  {
    ref: "DEMO-0001",
    status: "shipped",
    createdAt: "2026-10-16T11:00:00Z",
    paidAt: "2026-10-16T11:05:00Z",
    lines: [{ product: "glide-xl-mousepad", name: "Glide XL Mousepad", unit: 12900, qty: 1 }],
  },
  {
    ref: "DEMO-0002",
    status: "cancelled",
    createdAt: "2026-10-01T11:00:00Z",
    lines: [{ product: "glide-xl-mousepad", name: "Glide XL Mousepad", unit: 12900, qty: 1 }],
  },
  // N: placed and paid exactly at the end (excluded); O: placed exactly at the start (included).
  {
    ref: "CO-INT-N",
    status: "paid",
    createdAt: "2026-10-17T22:00:00Z",
    paidAt: "2026-10-17T22:00:00Z",
    lines: [
      { product: "vortex-wireless-mouse", name: "Vortex Wireless Mouse", unit: 24900, qty: 1 },
    ],
  },
  {
    ref: "CO-INT-O",
    status: "pending_payment",
    createdAt: "2026-10-10T22:00:00Z",
    lines: [
      { product: "vortex-wireless-mouse", name: "Vortex Wireless Mouse", unit: 24900, qty: 1 },
    ],
  },
];

describe("DatabaseStoreMetrics (PostgreSQL)", () => {
  let orm: MikroORM;
  const metrics = () => new DatabaseStoreMetrics({ em: orm.em.fork() });

  async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return orm.em.fork().execute<T[]>(sql, params);
  }

  async function productId(slug: string): Promise<string> {
    const rows = await query<{ id: string }>("select id from products where slug = ?", [slug]);
    return rows[0]?.id ?? "";
  }

  async function insertOrder(order: FixtureOrder, ids: Map<string, string>) {
    const total = order.lines.reduce((sum, line) => sum + line.unit * line.qty, 0);
    const [row] = await query<{ id: string }>(
      `insert into orders (public_reference, idempotency_key, request_fingerprint, status,
         customer_name, customer_email, shipping_line1, shipping_city, shipping_postal_code,
         shipping_country, currency, subtotal_minor, shipping_minor, total_minor,
         payment_provider, payment_reference, paid_at, created_at)
       values (?, ?, 'int-test', ?, 'Integration Test', 'int@example.test', 'ul. Testowa 1',
         'Warszawa', '00-950', 'PL', ?, ?, 0, ?, ?, ?, ?::timestamptz, ?::timestamptz)
       returning id`,
      [
        order.ref,
        randomUUID(),
        order.status,
        order.currency ?? "PLN",
        total,
        total,
        order.paidAt ? "demo" : null,
        order.paidAt ? `PAY-${order.ref}` : null,
        order.paidAt ?? null,
        order.createdAt,
      ],
    );
    for (const line of order.lines) {
      await query(
        `insert into order_items (order_id, product_id, product_name, unit_price_minor, quantity,
           line_total_minor) values (?, ?, ?, ?, ?, ?)`,
        [row?.id, ids.get(line.product), line.name, line.unit, line.qty, line.unit * line.qty],
      );
    }
  }

  beforeAll(async () => {
    orm = await initToolingOrm(inject("databaseUrl"));
    await orm.schema.drop({ dropMigrationsTable: true });
    await orm.migrator.up();
    // E2E_CATALOG adds two drafts with stock 5: low stock must leave them out.
    await seedCatalog(orm.em.fork(), DEMO_CATALOG);
    await seedCatalog(orm.em.fork(), E2E_CATALOG);
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  describe("on an empty store", () => {
    it("returns zeros and empty lists", async () => {
      expect(await metrics().salesSummary(RANGE, "PLN")).toEqual({
        paidOrders: 0,
        revenueMinor: 0,
        otherCurrencyOrders: 0,
      });
      expect(await metrics().orderSummary(RANGE)).toEqual([]);
      expect(await metrics().topProducts(RANGE, "PLN", 5)).toEqual([]);
      expect(await metrics().demoOrderCount(RANGE)).toBe(0);
      expect(await metrics().lowStockProducts(-1, 10)).toEqual({ total: 0, rows: [] });
    });
  });

  describe("with the hand-built fixture", () => {
    beforeAll(async () => {
      const [gone] = await query<{ id: string }>(
        `insert into products (name, slug, price_minor, stock_quantity, status)
         values (?, 'int-gone-pad', 1000, 9, 'published') returning id`,
        [GONE],
      );
      const ids = new Map<string, string>([[GONE, gone?.id ?? ""]]);
      for (const slug of ["vortex-wireless-mouse", "pulse-ultralight-mouse", "glide-xl-mousepad"]) {
        ids.set(slug, await productId(slug));
      }
      for (const order of ORDERS) await insertOrder(order, ids);
      await query("delete from products where slug = 'int-gone-pad'");
    });

    it("sums paid PLN orders by payment date, excluding refunded, unpaid and other currencies", async () => {
      // A 49 800 + B 43 800 + C 56 700 + H 25 800 + J 4 000 + K 1 000 + DEMO-0001 12 900.
      expect(await metrics().salesSummary(RANGE, "PLN")).toEqual({
        paidOrders: 7,
        revenueMinor: 194_000,
        otherCurrencyOrders: 1,
      });
      expect(await metrics().salesSummary(RANGE, "EUR")).toEqual({
        paidOrders: 1,
        revenueMinor: 5000,
        otherCurrencyOrders: 7,
      });
    });

    it("counts orders placed in the period by current status, any currency", async () => {
      expect(await metrics().orderSummary(RANGE)).toEqual([
        { status: "cancelled", count: 1 },
        { status: "paid", count: 4 },
        { status: "pending_payment", count: 2 },
        { status: "processing", count: 1 },
        { status: "refunded", count: 1 },
        { status: "shipped", count: 2 },
      ]);
    });

    it("ranks products in paid PLN orders by units, then revenue; deleted ones by snapshot name", async () => {
      const [vortex, pulse, glide] = await Promise.all(
        ["vortex-wireless-mouse", "pulse-ultralight-mouse", "glide-xl-mousepad"].map(productId),
      );

      expect(await metrics().topProducts(RANGE, "PLN", 5)).toEqual([
        { productId: null, name: GONE, units: 5, revenueMinor: 5000 },
        { productId: pulse, name: "Pulse Ultralight Mouse", units: 4, revenueMinor: 75_600 },
        // Same units as Glide: the higher revenue ranks first.
        { productId: vortex, name: "Vortex Wireless Mouse", units: 3, revenueMinor: 74_700 },
        { productId: glide, name: "Glide XL Mousepad", units: 3, revenueMinor: 38_700 },
      ]);
      expect(await metrics().topProducts(RANGE, "PLN", 2)).toHaveLength(2);
    });

    it("shows a product's current name, not an old snapshot", async () => {
      await query(
        "update products set name = 'Glide XL Mousepad v2' where slug = 'glide-xl-mousepad'",
      );
      try {
        const top = await metrics().topProducts(RANGE, "PLN", 5);
        expect(top.map((row) => row.name)).toContain("Glide XL Mousepad v2");
      } finally {
        await query(
          "update products set name = 'Glide XL Mousepad' where slug = 'glide-xl-mousepad'",
        );
      }
    });

    it("counts demo orders placed or paid in the period", async () => {
      expect(await metrics().demoOrderCount(RANGE)).toBe(1);
      expect(
        await metrics().demoOrderCount({ from: new Date("2026-09-01T00:00:00Z"), to: RANGE.to }),
      ).toBe(2);
    });

    /** The dashboard use case on these queries (date-range spec step 4), clock on 19 Oct 2026. */
    function dashboard() {
      const storeMetrics = metrics();
      return new GetDashboardUseCase({
        clock: () => new Date("2026-10-19T10:00:00.000Z"),
        storeMetrics,
        getSalesSummaryUseCase: new GetSalesSummaryUseCase({ storeMetrics }),
        getOrderSummaryUseCase: new GetOrderSummaryUseCase({ storeMetrics }),
        getTopProductsUseCase: new GetTopProductsUseCase({ storeMetrics }),
        getLowStockProductsUseCase: new GetLowStockProductsUseCase({ storeMetrics }),
      });
    }

    it("compares a custom range with the previous 7 days, boundaries exact", async () => {
      const result = await dashboard().execute({ from: "2026-10-11", to: "2026-10-17" });

      // The same instants as RANGE: the figures equal the hand-computed ones above.
      expect(result.period).toMatchObject({ preset: "custom", ...RANGE });
      expect(result.sales).toMatchObject({
        paidOrders: 7,
        revenueMinor: 194_000,
        aovMinor: 27_714,
      });
      expect(result.orders.total).toBe(11);
      // 4–10 Oct: H and I were placed (O, at the boundary, is in the current period); only I
      // was paid. DEMO-0002 (1 Oct) is before the comparison period, so history is not partial.
      expect(result.comparison.period).toMatchObject({
        from: new Date("2026-10-03T22:00:00.000Z"),
        to: RANGE.from,
        label: "4–10 Oct 2026",
      });
      expect(result.comparison.orders.total).toBe(2);
      expect(result.comparison.sales).toMatchObject({ paidOrders: 1, revenueMinor: 24_900 });
      expect(result.comparison.demoOrderCount).toBe(0);
      expect(result.comparison.partialHistory).toBe(false);
      expect(result.comparison.includesToday).toBe(false);
      expect(result.comparison.changes).toEqual({
        ordersPlaced: { current: 11, previous: 2, delta: 9, percent: 450, direction: "up" },
        paidOrders: { current: 7, previous: 1, delta: 6, percent: 600, direction: "up" },
        revenue: {
          current: 194_000,
          previous: 24_900,
          delta: 169_100,
          percent: 679,
          direction: "up",
        },
        aov: { current: 27_714, previous: 24_900, delta: 2814, percent: 11, direction: "up" },
      });
    });

    it("withholds percentages when no order exists before the comparison period", async () => {
      // 4–10 Oct against 27 Sep – 3 Oct: the earliest order (DEMO-0002, 1 Oct) is inside it.
      const { comparison } = await dashboard().execute({ from: "2026-10-04", to: "2026-10-10" });

      expect(comparison.partialHistory).toBe(true);
      expect(comparison.orders.total).toBe(1);
      expect(comparison.changes.ordersPlaced).toMatchObject({ delta: 1, percent: null });
    });

    it("lists published low-stock products now, out of stock first, drafts excluded", async () => {
      const low = await metrics().lowStockProducts(5, 10);
      expect(low.total).toBe(4);
      expect(low.rows.map((row) => [row.name, row.stockQuantity])).toEqual([
        ["Titan MMO Mouse", 0],
        ["Arena Fight Stick", 2],
        ["Pulse Ultralight Mouse", 3],
        ["Aurora Full-Size Keyboard", 5],
      ]);
      expect(low.rows[0]).toMatchObject({ id: expect.any(String), sku: expect.any(String) });

      const firstTwo = await metrics().lowStockProducts(5, 2);
      expect(firstTwo.total).toBe(4);
      expect(firstTwo.rows).toHaveLength(2);
      expect((await metrics().lowStockProducts(0, 10)).total).toBe(1);
    });
  });
});

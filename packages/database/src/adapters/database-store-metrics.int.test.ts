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

  /** The dashboard use case on these queries (date-range spec step 4); the clock is `now`. */
  function dashboard(now = "2026-10-19T10:00:00.000Z") {
    const storeMetrics = metrics();
    return new GetDashboardUseCase({
      clock: () => new Date(now),
      storeMetrics,
      getSalesSummaryUseCase: new GetSalesSummaryUseCase({ storeMetrics }),
      getOrderSummaryUseCase: new GetOrderSummaryUseCase({ storeMetrics }),
      getTopProductsUseCase: new GetTopProductsUseCase({ storeMetrics }),
      getLowStockProductsUseCase: new GetLowStockProductsUseCase({ storeMetrics }),
    });
  }

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
      // was paid. DEMO-0002 (1 Oct) was placed and never paid, so no order was paid before 4 Oct:
      // the history is partial and the percentages are withheld (A9).
      expect(result.comparison.period).toMatchObject({
        from: new Date("2026-10-03T22:00:00.000Z"),
        to: RANGE.from,
        label: "4–10 Oct 2026",
      });
      expect(result.comparison.orders.total).toBe(2);
      expect(result.comparison.sales).toMatchObject({ paidOrders: 1, revenueMinor: 24_900 });
      expect(result.comparison.demoOrderCount).toBe(0);
      expect(result.comparison.partialHistory).toBe(true);
      expect(result.comparison.includesToday).toBe(false);
      expect(result.comparison.changes).toEqual({
        ordersPlaced: { current: 11, previous: 2, delta: 9, percent: null, direction: "up" },
        paidOrders: { current: 7, previous: 1, delta: 6, percent: null, direction: "up" },
        revenue: {
          current: 194_000,
          previous: 24_900,
          delta: 169_100,
          percent: null,
          direction: "up",
        },
        aov: { current: 27_714, previous: 24_900, delta: 2814, percent: null, direction: "up" },
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

  describe("per-metric inclusion in both periods (orders spec A8, A10, A14)", () => {
    // Current 8–14 Jun 2026 and the previous 7 days, 1–7 Jun (Europe/Warsaw, CEST = UTC+2).
    const CURRENT = {
      from: new Date("2026-06-07T22:00:00.000Z"),
      to: new Date("2026-06-14T22:00:00.000Z"),
    };
    const PREVIOUS = { from: new Date("2026-05-31T22:00:00.000Z"), to: CURRENT.from };
    const day = (date: number, time: string) =>
      `2026-06-${String(date).padStart(2, "0")}T${time}:00Z`;

    /** One order per case in each period. `demo` gives a DEMO- reference; `paid` sets paid_at. */
    const CASES: {
      key: string;
      status: string;
      currency?: string;
      paid: boolean;
      demo?: boolean;
      offset: number;
      total: number;
    }[] = [
      { key: "unpaid", status: "pending_payment", paid: false, offset: 1, total: 1000 },
      { key: "cancelled", status: "cancelled", paid: false, offset: 2, total: 2000 },
      { key: "paid", status: "paid", paid: true, offset: 2, total: 3000 },
      { key: "processing", status: "processing", paid: true, offset: 3, total: 4000 },
      { key: "shipped", status: "shipped", paid: true, offset: 4, total: 5000 },
      { key: "refunded", status: "refunded", paid: true, offset: 4, total: 6000 },
      { key: "eur", status: "paid", currency: "EUR", paid: true, offset: 5, total: 7000 },
      { key: "demo", status: "paid", paid: true, demo: true, offset: 5, total: 8000 },
    ];

    /** `scale` doubles the current period's amounts, so a swapped period shows in the figures. */
    function periodOrders(firstDay: number, tag: string, scale: number): FixtureOrder[] {
      return CASES.map((item) => ({
        ref: item.demo ? `DEMO-INT-${tag}` : `CO-INT-${tag}-${item.key}`,
        status: item.status,
        currency: item.currency,
        createdAt: day(firstDay + item.offset, "10:00"),
        paidAt: item.paid ? day(firstDay + item.offset, "10:05") : undefined,
        lines: [
          {
            product: "vortex-wireless-mouse",
            name: "Vortex Wireless Mouse",
            unit: item.total * scale,
            qty: 1,
          },
        ],
      }));
    }

    const EARLY_CANCELLED: FixtureOrder = {
      ref: "CO-INT-EARLY-C",
      status: "cancelled",
      createdAt: "2026-05-20T10:00:00Z",
      lines: [
        { product: "vortex-wireless-mouse", name: "Vortex Wireless Mouse", unit: 2000, qty: 1 },
      ],
    };
    const EARLY_PAID: FixtureOrder = {
      ref: "CO-INT-EARLY-P",
      status: "paid",
      createdAt: "2026-05-21T10:00:00Z",
      paidAt: "2026-05-21T10:05:00Z",
      lines: [
        { product: "vortex-wireless-mouse", name: "Vortex Wireless Mouse", unit: 1500, qty: 1 },
      ],
    };

    let ids = new Map<string, string>();

    beforeAll(async () => {
      ids = new Map([["vortex-wireless-mouse", await productId("vortex-wireless-mouse")]]);
      const orders = [...periodOrders(1, "A", 1), ...periodOrders(8, "B", 2), EARLY_CANCELLED];
      for (const order of orders) await insertOrder(order, ids);
    });

    afterAll(async () => {
      const scope = `public_reference like 'CO-INT-A-%' or public_reference like 'CO-INT-B-%'
        or public_reference like 'CO-INT-EARLY-%' or public_reference like 'DEMO-INT-%'`;
      await query(
        `delete from order_items where order_id in (select id from orders where ${scope})`,
      );
      await query(`delete from orders where ${scope}`);
    });

    it("sums paid store-currency orders per period, other currencies apart", async () => {
      // Paid in PLN: paid, processing, shipped and the demo order. Refunded, unpaid and cancelled
      // are left out; the EUR order is counted in otherCurrencyOrders only.
      expect(await metrics().salesSummary(PREVIOUS, "PLN")).toEqual({
        paidOrders: 4,
        revenueMinor: 20_000,
        otherCurrencyOrders: 1,
      });
      expect(await metrics().salesSummary(CURRENT, "PLN")).toEqual({
        paidOrders: 4,
        revenueMinor: 40_000,
        otherCurrencyOrders: 1,
      });
    });

    it("counts every order placed in each period by its current status, any currency", async () => {
      const statuses = [
        { status: "cancelled", count: 1 },
        { status: "paid", count: 3 },
        { status: "pending_payment", count: 1 },
        { status: "processing", count: 1 },
        { status: "refunded", count: 1 },
        { status: "shipped", count: 1 },
      ];
      expect(await metrics().orderSummary(PREVIOUS)).toEqual(statuses);
      expect(await metrics().orderSummary(CURRENT)).toEqual(statuses);
      expect(await metrics().demoOrderCount(PREVIOUS)).toBe(1);
      expect(await metrics().demoOrderCount(CURRENT)).toBe(1);
    });

    it("withholds percentages while the only earlier order was never paid (A9)", async () => {
      const { period, sales, orders, demoOrderCount, comparison } = await dashboard(
        "2026-06-20T10:00:00.000Z",
      ).execute({ from: "2026-06-08", to: "2026-06-14" });

      expect(period).toMatchObject(CURRENT);
      expect(sales).toMatchObject({ paidOrders: 4, revenueMinor: 40_000, aovMinor: 10_000 });
      expect(orders.total).toBe(8);
      expect(demoOrderCount).toBe(1);
      expect(comparison.period).toMatchObject(PREVIOUS);
      expect(comparison.sales).toMatchObject({ paidOrders: 4, revenueMinor: 20_000 });
      expect(comparison.orders.total).toBe(8);
      expect(comparison.partialHistory).toBe(true);
      expect(comparison.changes.revenue).toEqual({
        current: 40_000,
        previous: 20_000,
        delta: 20_000,
        percent: null,
        direction: "up",
      });
      expect(comparison.changes.ordersPlaced).toMatchObject({ delta: 0, percent: null });
    });

    it("ends the partial history with a paid order placed before the comparison period (A9)", async () => {
      await insertOrder(EARLY_PAID, ids);

      const { comparison } = await dashboard("2026-06-20T10:00:00.000Z").execute({
        from: "2026-06-08",
        to: "2026-06-14",
      });
      expect(comparison.partialHistory).toBe(false);
      expect(comparison.changes.revenue).toEqual({
        current: 40_000,
        previous: 20_000,
        delta: 20_000,
        percent: 100,
        direction: "up",
      });
    });
  });
});

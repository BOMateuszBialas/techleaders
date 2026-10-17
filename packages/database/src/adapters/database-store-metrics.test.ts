import { afterAll, describe, expect, it, vi } from "vitest";
import { createUnitTestOrm } from "../testing/unit-orm";
import { DatabaseStoreMetrics, toSafeInteger } from "./database-store-metrics";

const orm = createUnitTestOrm();

afterAll(async () => {
  await orm.close();
});

const RANGE = {
  from: new Date("2026-10-10T22:00:00.000Z"),
  to: new Date("2026-10-17T22:00:00.000Z"),
};
const FROM = "2026-10-10T22:00:00.000Z";
const TO = "2026-10-17T22:00:00.000Z";

// Raw rows as PostgreSQL returns them: `bigint` aggregates arrive as strings.
function setup(...results: unknown[]) {
  const em = orm.em.fork();
  const execute = vi.spyOn(em, "execute");
  for (const result of results) execute.mockResolvedValueOnce(result as never);
  return { execute, metrics: new DatabaseStoreMetrics({ em }) };
}

describe("toSafeInteger", () => {
  it("reads bigint strings and plain numbers", () => {
    expect(toSafeInteger("42", "count")).toBe(42);
    expect(toSafeInteger(0, "count")).toBe(0);
  });

  it("refuses anything that is not a safe integer instead of rounding it", () => {
    for (const value of ["9007199254740993", "1.5", "abc", undefined]) {
      expect(() => toSafeInteger(value, "revenue_minor")).toThrow(
        "Metric column revenue_minor is not a safe integer",
      );
    }
  });
});

describe("DatabaseStoreMetrics", () => {
  it("sums paid orders in the store currency and counts the others, all values bound", async () => {
    const { execute, metrics } = setup([
      { paid_orders: "7", revenue_minor: "194000", other_currency_orders: "1" },
    ]);

    expect(await metrics.salesSummary(RANGE, "PLN")).toEqual({
      paidOrders: 7,
      revenueMinor: 194_000,
      otherCurrencyOrders: 1,
    });
    const [sql, params] = execute.mock.calls[0] ?? [];
    expect(sql).toContain("paid_at >= ?::timestamptz and paid_at < ?::timestamptz");
    expect(sql).toContain("status in (?, ?, ?)");
    expect(params).toEqual(["PLN", "PLN", "PLN", FROM, TO, "paid", "processing", "shipped"]);
  });

  it("fails loudly when an aggregate returns no row", async () => {
    const { metrics } = setup([]);
    await expect(metrics.salesSummary(RANGE, "PLN")).rejects.toThrow("returned no row");
  });

  it("counts orders placed in the range by status", async () => {
    const { execute, metrics } = setup([
      { status: "paid", count: "4" },
      { status: "shipped", count: "2" },
    ]);

    expect(await metrics.orderSummary(RANGE)).toEqual([
      { status: "paid", count: 4 },
      { status: "shipped", count: 2 },
    ]);
    expect(execute.mock.calls[0]?.[0]).toContain("created_at >= ?::timestamptz");
    expect(execute.mock.calls[0]?.[1]).toEqual([FROM, TO]);
  });

  it("ranks top products and keeps a deleted product's null id", async () => {
    const { execute, metrics } = setup([
      { product_id: null, display_name: "Gone pad", units: "5", revenue_minor: "5000" },
      { product_id: "p-1", display_name: "Pulse", units: "4", revenue_minor: "75600" },
    ]);

    expect(await metrics.topProducts(RANGE, "PLN", 5)).toEqual([
      { productId: null, name: "Gone pad", units: 5, revenueMinor: 5000 },
      { productId: "p-1", name: "Pulse", units: 4, revenueMinor: 75_600 },
    ]);
    const [sql, params] = execute.mock.calls[0] ?? [];
    expect(sql).toContain("order by units desc, revenue_minor desc, display_name asc");
    expect(params).toEqual([FROM, TO, "paid", "processing", "shipped", "PLN", 5]);
  });

  it("lists low-stock products with the total before the limit", async () => {
    const { execute, metrics } = setup([
      { id: "p-2", name: "Titan", sku: "DEMO-MOU-003", stock_quantity: 0, total: "4" },
      { id: "p-3", name: "Arena", sku: null, stock_quantity: 2, total: "4" },
    ]);

    expect(await metrics.lowStockProducts(5, 2)).toEqual({
      total: 4,
      rows: [
        { id: "p-2", name: "Titan", sku: "DEMO-MOU-003", stockQuantity: 0 },
        { id: "p-3", name: "Arena", sku: null, stockQuantity: 2 },
      ],
    });
    expect(execute.mock.calls[0]?.[0]).toContain("status = 'published' and stock_quantity <= ?");
    expect(execute.mock.calls[0]?.[1]).toEqual([5, 2]);
  });

  it("reports no low-stock products as a zero total", async () => {
    const { metrics } = setup([]);
    expect(await metrics.lowStockProducts(5, 10)).toEqual({ total: 0, rows: [] });
  });

  it("counts demo orders placed or paid in the range by the shared LIKE pattern", async () => {
    const { execute, metrics } = setup([{ count: "3" }]);

    expect(await metrics.demoOrderCount(RANGE)).toBe(3);
    expect(execute.mock.calls[0]?.[0]).toContain("public_reference like ?");
    expect(execute.mock.calls[0]?.[1]).toEqual(["DEMO-%", FROM, TO, FROM, TO]);
  });
});

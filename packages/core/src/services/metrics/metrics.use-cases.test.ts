import { describe, expect, expectTypeOf, it } from "vitest";
import {
  METRIC_DEFINITIONS,
  PERIOD_COMPARISON_DEFINITION,
} from "../../domain/metrics/metric-definitions";
import {
  previousPeriod,
  resolveCustomPeriod,
  resolvePeriod,
  type MetricPeriod,
} from "../../domain/metrics/metric-period";
import { DASHBOARD_RANGE_MESSAGES } from "../../validators/metrics/dashboard-range.schema";
import { hasAppErrorCode } from "../../errors/app-error";
import type {
  LowStockAggregate,
  MetricRange,
  OrderStatusCount,
  SalesAggregate,
  StoreMetricsPort,
  TopProductAggregate,
} from "../../ports/store-metrics.port";
import { GetDashboardUseCase } from "./get-dashboard.use-case";
import { GetLowStockProductsUseCase } from "./get-low-stock-products.use-case";
import { GetOrderSummaryUseCase } from "./get-order-summary.use-case";
import { GetSalesSummaryUseCase, type SalesSummary } from "./get-sales-summary.use-case";
import { GetTopProductsUseCase } from "./get-top-products.use-case";

const NOW = new Date("2026-10-17T10:00:00.000Z");
const PERIOD = resolvePeriod("7d", NOW);

/** A fake port that records its calls and answers with fixed aggregates. */
class FakeStoreMetrics implements StoreMetricsPort {
  calls: { method: string; args: unknown[] }[] = [];
  sales: SalesAggregate = { paidOrders: 3, revenueMinor: 1000, otherCurrencyOrders: 1 };
  statuses: OrderStatusCount[] = [
    { status: "paid", count: 2 },
    { status: "cancelled", count: 1 },
  ];
  top: TopProductAggregate[] = [
    { productId: "p-1", name: "Pulse Ultralight Mouse", units: 4, revenueMinor: 75_600 },
    { productId: null, name: "Gone pad", units: 1, revenueMinor: 1000 },
  ];
  low: LowStockAggregate = {
    total: 1,
    rows: [
      {
        id: "p-2",
        slug: "titan-mmo-mouse",
        name: "Titan MMO Mouse",
        sku: "DEMO-MOU-003",
        stockQuantity: 0,
      },
    ],
  };
  demo = 2;

  async salesSummary(range: MetricRange, currency: string) {
    this.calls.push({ method: "salesSummary", args: [range, currency] });
    return this.sales;
  }
  async orderSummary(range: MetricRange) {
    this.calls.push({ method: "orderSummary", args: [range] });
    return this.statuses;
  }
  async topProducts(range: MetricRange, currency: string, limit: number) {
    this.calls.push({ method: "topProducts", args: [range, currency, limit] });
    return this.top;
  }
  async lowStockProducts(threshold: number, limit: number) {
    this.calls.push({ method: "lowStockProducts", args: [threshold, limit] });
    return this.low;
  }
  async demoOrderCount(range: MetricRange) {
    this.calls.push({ method: "demoOrderCount", args: [range] });
    return this.demo;
  }
}

function useCases(storeMetrics = new FakeStoreMetrics()) {
  const getSalesSummaryUseCase = new GetSalesSummaryUseCase({ storeMetrics });
  const getOrderSummaryUseCase = new GetOrderSummaryUseCase({ storeMetrics });
  const getTopProductsUseCase = new GetTopProductsUseCase({ storeMetrics });
  const getLowStockProductsUseCase = new GetLowStockProductsUseCase({ storeMetrics });
  const getDashboard = new GetDashboardUseCase({
    clock: () => NOW,
    storeMetrics,
    getSalesSummaryUseCase,
    getOrderSummaryUseCase,
    getTopProductsUseCase,
    getLowStockProductsUseCase,
  });
  return {
    storeMetrics,
    getSalesSummaryUseCase,
    getOrderSummaryUseCase,
    getTopProductsUseCase,
    getLowStockProductsUseCase,
    getDashboard,
  };
}

/** Every key of a nested value, to prove no customer field can leave the metric use cases. */
function keysOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysOf);
  if (value === null || typeof value !== "object" || value instanceof Date) return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...keysOf(child)]);
}

describe("GetSalesSummaryUseCase", () => {
  it("returns paid orders, revenue and AOV in PLN with the period and definitions", async () => {
    const { storeMetrics, getSalesSummaryUseCase } = useCases();

    expect(await getSalesSummaryUseCase.execute({ period: PERIOD })).toEqual({
      period: PERIOD,
      currency: "PLN",
      definitionIds: ["paidOrders", "revenue", "aov"],
      paidOrders: 3,
      revenueMinor: 1000,
      aovMinor: 333,
      otherCurrencyOrders: 1,
    });
    expect(storeMetrics.calls).toEqual([{ method: "salesSummary", args: [PERIOD, "PLN"] }]);
  });

  it("has no AOV when nothing was paid (Not enough data)", async () => {
    const storeMetrics = new FakeStoreMetrics();
    storeMetrics.sales = { paidOrders: 0, revenueMinor: 0, otherCurrencyOrders: 0 };

    const sales = await useCases(storeMetrics).getSalesSummaryUseCase.execute({ period: PERIOD });
    expect(sales.aovMinor).toBeNull();
  });
});

describe("GetOrderSummaryUseCase", () => {
  it("lists every status in workflow order with zeros, and the total", async () => {
    const { getOrderSummaryUseCase } = useCases();

    expect(await getOrderSummaryUseCase.execute({ period: PERIOD })).toEqual({
      period: PERIOD,
      definitionIds: ["ordersPlaced"],
      total: 3,
      byStatus: [
        { status: "pending_payment", count: 0 },
        { status: "paid", count: 2 },
        { status: "processing", count: 0 },
        { status: "shipped", count: 0 },
        { status: "cancelled", count: 1 },
        { status: "refunded", count: 0 },
      ],
    });
  });
});

describe("GetTopProductsUseCase", () => {
  it("ranks the top 5 in PLN by default", async () => {
    const { storeMetrics, getTopProductsUseCase } = useCases();

    const top = await getTopProductsUseCase.execute({ period: PERIOD });
    expect(top).toEqual({
      period: PERIOD,
      currency: "PLN",
      definitionIds: ["topProducts"],
      limit: 5,
      rows: storeMetrics.top,
    });
    expect(storeMetrics.calls).toEqual([{ method: "topProducts", args: [PERIOD, "PLN", 5] }]);
  });

  it("accepts a valid limit and refuses an invalid one before querying", async () => {
    const { storeMetrics, getTopProductsUseCase } = useCases();

    expect((await getTopProductsUseCase.execute({ period: PERIOD, limit: 2 })).limit).toBe(2);
    const error = await getTopProductsUseCase
      .execute({ period: PERIOD, limit: 500 })
      .catch((caught: unknown) => caught);
    expect(hasAppErrorCode(error, "VALIDATION_FAILED")).toBe(true);
    expect(storeMetrics.calls).toHaveLength(1);
  });
});

describe("GetLowStockProductsUseCase", () => {
  it("uses threshold 5 and 10 rows by default", async () => {
    const { storeMetrics, getLowStockProductsUseCase } = useCases();

    expect(await getLowStockProductsUseCase.execute()).toEqual({
      definitionIds: ["lowStock"],
      threshold: 5,
      total: 1,
      rows: storeMetrics.low.rows,
    });
    expect(storeMetrics.calls).toEqual([{ method: "lowStockProducts", args: [5, 10] }]);
  });

  it("takes a Copilot threshold within 1–1000 and refuses others", async () => {
    const { storeMetrics, getLowStockProductsUseCase } = useCases();

    await getLowStockProductsUseCase.execute({ threshold: 20, limit: 3 });
    expect(storeMetrics.calls).toEqual([{ method: "lowStockProducts", args: [20, 3] }]);
    for (const threshold of [0, 1001, "5", 2.5]) {
      const error = await getLowStockProductsUseCase
        .execute({ threshold })
        .catch((caught: unknown) => caught);
      expect(hasAppErrorCode(error, "VALIDATION_FAILED")).toBe(true);
    }
  });
});

describe("GetDashboardUseCase", () => {
  it("resolves the period once from the clock and composes the four metrics", async () => {
    const { storeMetrics, getDashboard } = useCases();

    const dashboard = await getDashboard.execute({ period: "30d" });
    const period = resolvePeriod("30d", NOW);
    expect(dashboard.period).toEqual(period);
    expect(dashboard.sales.period).toEqual(period);
    expect(dashboard.orders.total).toBe(3);
    expect(dashboard.topProducts.rows).toHaveLength(2);
    expect(dashboard.lowStock.total).toBe(1);
    expect(dashboard.demoOrderCount).toBe(2);
    expect(dashboard.definitions).toBe(METRIC_DEFINITIONS);
    expect(dashboard.comparisonDefinition).toBe(PERIOD_COMPARISON_DEFINITION);
    expect(dashboard.range).toEqual({
      firstDay: "2026-09-18",
      lastDay: "2026-10-17",
      minDay: "2000-01-01",
      maxDay: "2026-10-17",
    });
    expect(dashboard.rangeError).toBeNull();
    expect(storeMetrics.calls.map((call) => call.method).sort()).toEqual([
      "demoOrderCount",
      "demoOrderCount",
      "lowStockProducts",
      "orderSummary",
      "orderSummary",
      "orderSummary",
      "salesSummary",
      "salesSummary",
      "topProducts",
    ]);
  });

  it("falls back to the last 7 days for a missing or unknown period", async () => {
    const { getDashboard } = useCases();

    expect((await getDashboard.execute()).period).toEqual(PERIOD);
    expect((await getDashboard.execute({ period: "abc" })).period).toEqual(PERIOD);
  });

  it("compares with the previous period of the same length through the same use cases", async () => {
    const { storeMetrics, getDashboard } = useCases();

    const { comparison } = await getDashboard.execute();
    expect(comparison.period).toEqual(previousPeriod(PERIOD));
    expect(comparison.sales.period).toEqual(previousPeriod(PERIOD));
    expect(comparison.orders.total).toBe(3);
    expect(comparison.demoOrderCount).toBe(2);
    expect(comparison.partialHistory).toBe(false);
    expect(comparison.includesToday).toBe(true);
    // The fake answers the same for both periods: no change anywhere.
    expect(comparison.changes).toEqual({
      ordersPlaced: { current: 3, previous: 3, delta: 0, percent: 0, direction: "same" },
      paidOrders: { current: 3, previous: 3, delta: 0, percent: 0, direction: "same" },
      revenue: { current: 1000, previous: 1000, delta: 0, percent: 0, direction: "same" },
      aov: { current: 333, previous: 333, delta: 0, percent: 0, direction: "same" },
    });
    // The partial-history check asks for everything before the comparison period.
    const ranges = storeMetrics.calls
      .filter((call) => call.method === "orderSummary")
      .map((call) => call.args[0] as MetricRange);
    expect(ranges).toContainEqual(
      expect.objectContaining({ from: new Date(0), to: previousPeriod(PERIOD).from }),
    );
  });

  it("shows a valid custom range, which may end before today", async () => {
    const { getDashboard } = useCases();

    const dashboard = await getDashboard.execute({
      period: "30d",
      from: "2026-10-01",
      to: "2026-10-14",
    });
    expect(dashboard.period).toEqual(resolveCustomPeriod("2026-10-01", "2026-10-14"));
    expect(dashboard.topProducts.period.preset).toBe("custom");
    expect(dashboard.comparison.period.label).toBe("17–30 Sep 2026");
    expect(dashboard.comparison.includesToday).toBe(false);
    expect(dashboard.range).toMatchObject({ firstDay: "2026-10-01", lastDay: "2026-10-14" });
  });

  it("falls back to the preset and reports an invalid range with the submitted values", async () => {
    const { getDashboard } = useCases();

    const dashboard = await getDashboard.execute({
      period: "30d",
      from: "2026-10-14",
      to: "2026-10-01",
    });
    expect(dashboard.period).toEqual(resolvePeriod("30d", NOW));
    expect(dashboard.rangeError).toEqual({
      message: DASHBOARD_RANGE_MESSAGES.endBeforeStart,
      from: "2026-10-14",
      to: "2026-10-01",
    });
  });

  it("withholds percentages when no order exists before the comparison period (A9)", async () => {
    const storeMetrics = new FakeStoreMetrics();
    const orderSummary = storeMetrics.orderSummary.bind(storeMetrics);
    storeMetrics.orderSummary = async (range: MetricRange) =>
      range.from.getTime() === 0 ? [] : orderSummary(range);
    storeMetrics.sales = { paidOrders: 0, revenueMinor: 0, otherCurrencyOrders: 0 };

    const { comparison } = await useCases(storeMetrics).getDashboard.execute();
    expect(comparison.partialHistory).toBe(true);
    expect(comparison.changes.ordersPlaced).toMatchObject({ delta: 0, percent: null });
    expect(comparison.changes.aov).toBeNull();
  });

  it("needs no partial-history note when neither period has an order", async () => {
    const storeMetrics = new FakeStoreMetrics();
    storeMetrics.statuses = [];
    storeMetrics.sales = { paidOrders: 0, revenueMinor: 0, otherCurrencyOrders: 0 };

    const { comparison } = await useCases(storeMetrics).getDashboard.execute();
    expect(comparison.partialHistory).toBe(false);
  });

  it("keeps the Copilot's preset types: a MetricPeriod in, a MetricPeriod out", async () => {
    const { getSalesSummaryUseCase, getOrderSummaryUseCase, getTopProductsUseCase } = useCases();

    expectTypeOf(await getSalesSummaryUseCase.execute({ period: PERIOD })).toEqualTypeOf<
      SalesSummary<MetricPeriod>
    >();
    expectTypeOf(
      (await getOrderSummaryUseCase.execute({ period: PERIOD })).period,
    ).toEqualTypeOf<MetricPeriod>();
    expectTypeOf(
      (await getTopProductsUseCase.execute({ period: PERIOD })).period.preset,
    ).toEqualTypeOf<"7d" | "30d">();
  });

  it("returns no customer field anywhere", async () => {
    const keys = keysOf(await useCases().getDashboard.execute());
    for (const forbidden of [
      "customerName",
      "customerEmail",
      "email",
      "shippingLine1",
      "reference",
    ]) {
      expect(keys).not.toContain(forbidden);
    }
    expect(keys.some((key) => /customer|email|shipping|address/i.test(key))).toBe(false);
  });
});

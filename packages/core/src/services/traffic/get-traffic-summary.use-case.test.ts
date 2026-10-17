import { describe, expect, it } from "vitest";
import { resolvePeriod } from "../../domain/metrics/metric-period";
import { DEMO_TRAFFIC_LABEL } from "../../domain/traffic/demo-traffic";
import { hasAppErrorCode } from "../../errors/app-error";
import type {
  MetricRange,
  SalesAggregate,
  StoreMetricsPort,
  TopProductAggregate,
} from "../../ports/store-metrics.port";
import type {
  ProductViewsAggregate,
  TrafficDayRange,
  TrafficFunnelAggregate,
  TrafficSourceSessions,
  TrafficStatsPort,
} from "../../ports/traffic-stats.port";
import { GetSalesSummaryUseCase } from "../metrics/get-sales-summary.use-case";
import { GetTopProductsUseCase } from "../metrics/get-top-products.use-case";
import {
  TRAFFIC_UNITS_LOOKUP_LIMIT,
  GetTrafficSummaryUseCase,
} from "./get-traffic-summary.use-case";

const PERIOD = resolvePeriod("7d", new Date("2026-10-17T10:00:00.000Z"));

class FakeTrafficStats implements TrafficStatsPort {
  calls: { method: string; args: unknown[] }[] = [];
  sources: TrafficSourceSessions[] = [
    { source: "direct", sessions: 120 },
    { source: "organic", sessions: 60 },
    { source: "social", sessions: 20 },
    { source: "email", sessions: 0 },
    { source: "paid", sessions: 0 },
  ];
  totals: TrafficFunnelAggregate = {
    sessions: 200,
    productViews: 160,
    addToCarts: 40,
    checkoutsStarted: 10,
  };
  views: ProductViewsAggregate = {
    rows: [
      { productId: "p-drift", name: "Drift", views: 100, addToCarts: 10 },
      { productId: "p-pulse", name: "Pulse", views: 40, addToCarts: 20 },
      { productId: "p-quiet", name: "Quiet", views: 20, addToCarts: 0 },
    ],
    productsWithoutViewData: 2,
  };

  async sessionsBySource(range: TrafficDayRange) {
    this.calls.push({ method: "sessionsBySource", args: [range] });
    return this.sources;
  }
  async funnel(range: TrafficDayRange) {
    this.calls.push({ method: "funnel", args: [range] });
    return this.totals;
  }
  async productViews(range: TrafficDayRange, limit: number) {
    this.calls.push({ method: "productViews", args: [range, limit] });
    return this.views;
  }
}

/** Only the two order aggregates the traffic summary reads; the others are never called. */
class FakeStoreMetrics implements StoreMetricsPort {
  calls: { method: string; args: unknown[] }[] = [];
  sales: SalesAggregate = { paidOrders: 8, revenueMinor: 100_000, otherCurrencyOrders: 0 };
  top: TopProductAggregate[] = [
    { productId: "p-pulse", name: "Pulse", units: 6, revenueMinor: 60_000 },
    { productId: "p-drift", name: "Drift", units: 1, revenueMinor: 30_000 },
    { productId: null, name: "Gone pad", units: 1, revenueMinor: 1000 },
  ];

  async salesSummary(range: MetricRange, currency: string) {
    this.calls.push({ method: "salesSummary", args: [range, currency] });
    return this.sales;
  }
  async topProducts(range: MetricRange, currency: string, limit: number) {
    this.calls.push({ method: "topProducts", args: [range, currency, limit] });
    return this.top;
  }
  orderSummary(): never {
    throw new Error("not used");
  }
  lowStockProducts(): never {
    throw new Error("not used");
  }
  demoOrderCount(): never {
    throw new Error("not used");
  }
}

function setup() {
  const trafficStats = new FakeTrafficStats();
  const storeMetrics = new FakeStoreMetrics();
  const useCase = new GetTrafficSummaryUseCase({
    trafficStats,
    getSalesSummaryUseCase: new GetSalesSummaryUseCase({ storeMetrics }),
    getTopProductsUseCase: new GetTopProductsUseCase({ storeMetrics }),
  });
  return { trafficStats, storeMetrics, useCase };
}

describe("GetTrafficSummaryUseCase", () => {
  it("summarises the demo traffic of the period's local days, labelled as fictional", async () => {
    const { trafficStats, useCase } = setup();
    const summary = await useCase.execute({ period: PERIOD });

    expect(summary.source).toBe(DEMO_TRAFFIC_LABEL);
    expect(summary.demo).toBe(true);
    expect(summary.period).toBe(PERIOD);
    expect(summary.days).toEqual({ firstDay: "2026-10-11", lastDay: "2026-10-17" });
    expect(summary.definitionIds).toEqual([
      "sessionsDemo",
      "funnelDemo",
      "storeConversionDemo",
      "viewToPurchaseRateDemo",
    ]);
    expect(summary.sessions).toEqual({ total: 200, bySource: trafficStats.sources });
    expect(summary.funnel).toEqual({
      sessions: 200,
      productViews: 160,
      addToCarts: 40,
      checkoutsStarted: 10,
      paidOrders: 8,
    });
    expect(summary.storeConversion).toBe(8 / 200);
    // 6 + 1 + 1 units (the deleted product's too) over 160 views.
    expect(summary.viewToPurchaseRate).toBe(8 / 160);
    expect(summary.productsWithoutViewData).toBe(2);
    for (const call of trafficStats.calls) expect(call.args[0]).toEqual(summary.days);
  });

  it("has no per-source conversion field (D09)", async () => {
    const summary = await setup().useCase.execute({ period: PERIOD });
    expect(Object.keys(summary.sessions.bySource[0] ?? {})).toEqual(["source", "sessions"]);
    expect(JSON.stringify(summary)).not.toMatch(/conversionBy|bySourceConversion/i);
  });

  it("takes units sold from the top-products ranking, 0 for an unranked product", async () => {
    const { storeMetrics, useCase } = setup();
    const { products } = await useCase.execute({ period: PERIOD });

    expect(products).toEqual([
      {
        productId: "p-drift",
        name: "Drift",
        views: 100,
        addToCarts: 10,
        unitsSold: 1,
        viewToPurchaseRate: 0.01,
      },
      {
        productId: "p-pulse",
        name: "Pulse",
        views: 40,
        addToCarts: 20,
        unitsSold: 6,
        viewToPurchaseRate: 0.15,
      },
      {
        productId: "p-quiet",
        name: "Quiet",
        views: 20,
        addToCarts: 0,
        unitsSold: 0,
        viewToPurchaseRate: 0,
      },
    ]);
    const ranking = storeMetrics.calls.find((call) => call.method === "topProducts");
    expect(ranking?.args).toEqual([PERIOD, "PLN", TRAFFIC_UNITS_LOOKUP_LIMIT]);
  });

  it("gives null units and no rate when the ranking is full and the product is missing", async () => {
    const { storeMetrics, useCase } = setup();
    storeMetrics.top = Array.from({ length: TRAFFIC_UNITS_LOOKUP_LIMIT }, (_, index) => ({
      productId: index === 0 ? "p-pulse" : `p-other-${index}`,
      name: `Product ${index}`,
      units: 50 - index,
      revenueMinor: 1000,
    }));
    const summary = await useCase.execute({ period: PERIOD });

    const drift = summary.products.find((product) => product.productId === "p-drift");
    expect(drift).toMatchObject({ unitsSold: null, viewToPurchaseRate: null });
    const pulse = summary.products.find((product) => product.productId === "p-pulse");
    expect(pulse).toMatchObject({ unitsSold: 50, viewToPurchaseRate: 50 / 40 });
    // The store's units are unknown too, so it has no rate.
    expect(summary.viewToPurchaseRate).toBeNull();
  });

  it("has no conversion and no rates without sessions or views", async () => {
    const { trafficStats, useCase } = setup();
    trafficStats.sources = trafficStats.sources.map((row) => ({ ...row, sessions: 0 }));
    trafficStats.totals = { sessions: 0, productViews: 0, addToCarts: 0, checkoutsStarted: 0 };
    trafficStats.views = {
      rows: [{ productId: "p-pulse", name: "Pulse", views: 0, addToCarts: 0 }],
      productsWithoutViewData: 4,
    };
    const summary = await useCase.execute({ period: PERIOD });

    expect(summary.sessions.total).toBe(0);
    expect(summary.storeConversion).toBeNull();
    expect(summary.viewToPurchaseRate).toBeNull();
    expect(summary.products[0]?.viewToPurchaseRate).toBeNull();
  });

  it("clamps productLimit to 1–20 and defaults it to 5", async () => {
    const cases: [unknown, number][] = [
      [undefined, 5],
      [0, 1],
      [-3, 1],
      [7, 7],
      [21, 20],
      [1000, 20],
    ];
    for (const [given, expected] of cases) {
      const { trafficStats, useCase } = setup();
      const summary = await useCase.execute({ period: PERIOD, productLimit: given });
      expect(summary.productLimit).toBe(expected);
      const call = trafficStats.calls.find((item) => item.method === "productViews");
      expect(call?.args[1]).toBe(expected);
    }
  });

  it("rejects a productLimit that is not an integer", async () => {
    for (const productLimit of [2.5, "5", null]) {
      const error = await setup()
        .useCase.execute({ period: PERIOD, productLimit })
        .catch((caught: unknown) => caught);
      expect(hasAppErrorCode(error, "VALIDATION_FAILED")).toBe(true);
    }
  });
});

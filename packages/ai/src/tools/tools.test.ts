import {
  DEMO_TRAFFIC_LABEL,
  GetLowStockProductsUseCase,
  GetOrderSummaryUseCase,
  GetSalesSummaryUseCase,
  GetTopProductsUseCase,
  GetTrafficSummaryUseCase,
  ValidationError,
  resolvePeriod,
  type StoreMetricsPort,
  type TrafficStatsPort,
} from "@commerceos/core";
import { describe, expect, it, vi } from "vitest";
import { GetLowStockProductsTool } from "./get-low-stock-products.tool";
import { GetOrderSummaryTool } from "./get-order-summary.tool";
import { GetSalesSummaryTool } from "./get-sales-summary.tool";
import { GetTopProductsTool } from "./get-top-products.tool";
import { GetTrafficSummaryTool } from "./get-traffic-summary.tool";

const PERIOD = resolvePeriod("7d", new Date("2026-10-17T10:00:00.000Z"));

function fakeMetrics(): StoreMetricsPort {
  return {
    salesSummary: vi.fn(async () => ({
      paidOrders: 2,
      revenueMinor: 1000,
      otherCurrencyOrders: 0,
    })),
    orderSummary: vi.fn(async () => [{ status: "paid", count: 2 }]),
    topProducts: vi.fn(async () => [
      { productId: "p-1", name: "Pulse", units: 3, revenueMinor: 900 },
    ]),
    lowStockProducts: vi.fn(async () => ({
      total: 1,
      rows: [{ id: "p-1", name: "Pulse", sku: "DEMO-MOU-002", stockQuantity: 2 }],
    })),
    demoOrderCount: vi.fn(async () => 0),
  };
}

function tools(storeMetrics = fakeMetrics()) {
  return {
    storeMetrics,
    sales: new GetSalesSummaryTool({
      getSalesSummaryUseCase: new GetSalesSummaryUseCase({ storeMetrics }),
    }),
    orders: new GetOrderSummaryTool({
      getOrderSummaryUseCase: new GetOrderSummaryUseCase({ storeMetrics }),
    }),
    top: new GetTopProductsTool({
      getTopProductsUseCase: new GetTopProductsUseCase({ storeMetrics }),
    }),
    low: new GetLowStockProductsTool({
      getLowStockProductsUseCase: new GetLowStockProductsUseCase({ storeMetrics }),
    }),
  };
}

describe("approved Copilot tools", () => {
  it("are named as AGENTS.md lists them", () => {
    const { sales, orders, top, low } = tools();
    expect([sales.name, orders.name, top.name, low.name]).toEqual([
      "getSalesSummary",
      "getOrderSummary",
      "getTopProducts",
      "getLowStockProducts",
    ]);
  });

  it("return the E04 use case DTOs unchanged", async () => {
    const { storeMetrics, sales, orders, top, low } = tools();

    expect(await sales.run({ period: PERIOD })).toEqual(
      await new GetSalesSummaryUseCase({ storeMetrics }).execute({ period: PERIOD }),
    );
    expect(await orders.run({ period: PERIOD })).toEqual(
      await new GetOrderSummaryUseCase({ storeMetrics }).execute({ period: PERIOD }),
    );
    expect(await top.run({ period: PERIOD, limit: 10 })).toEqual(
      await new GetTopProductsUseCase({ storeMetrics }).execute({ period: PERIOD, limit: 10 }),
    );
    expect(await low.run({ threshold: 5, limit: 10 })).toEqual(
      await new GetLowStockProductsUseCase({ storeMetrics }).execute({ threshold: 5, limit: 10 }),
    );
    expect(storeMetrics.topProducts).toHaveBeenCalledWith(PERIOD, "PLN", 10);
    expect(storeMetrics.lowStockProducts).toHaveBeenCalledWith(5, 10);
  });

  it.each([
    ["no period", {}],
    ["an unknown preset", { period: { ...PERIOD, preset: "90d" } }],
    ["a period that ends before it starts", { period: { ...PERIOD, to: PERIOD.from } }],
    ["a period with string dates", { period: { ...PERIOD, from: "2026-10-10" } }],
  ])("refuse %s before calling the use case", async (_name, args) => {
    const { storeMetrics, sales, orders } = tools();
    await expect(sales.run(args)).rejects.toBeInstanceOf(ValidationError);
    await expect(orders.run(args)).rejects.toBeInstanceOf(ValidationError);
    expect(storeMetrics.salesSummary).not.toHaveBeenCalled();
    expect(storeMetrics.orderSummary).not.toHaveBeenCalled();
  });

  it.each([0, 11, 2.5, "5", undefined])(
    "refuse the top-products limit %j (1–10)",
    async (limit) => {
      const { storeMetrics, top } = tools();
      await expect(top.run({ period: PERIOD, limit })).rejects.toBeInstanceOf(ValidationError);
      expect(storeMetrics.topProducts).not.toHaveBeenCalled();
    },
  );

  it.each([
    { threshold: 0, limit: 10 },
    { threshold: 1001, limit: 10 },
    { threshold: 5, limit: 11 },
    { threshold: 5, limit: 0 },
    {},
  ])("refuse low-stock arguments %j", async (args) => {
    const { storeMetrics, low } = tools();
    await expect(low.run(args)).rejects.toBeInstanceOf(ValidationError);
    expect(storeMetrics.lowStockProducts).not.toHaveBeenCalled();
  });

  it("accept the edges of each range", async () => {
    const { top, low } = tools();
    await expect(top.run({ period: PERIOD, limit: 1 })).resolves.toMatchObject({ limit: 1 });
    await expect(low.run({ threshold: 1000, limit: 1 })).resolves.toMatchObject({
      threshold: 1000,
    });
  });
});

describe("approved tool getTrafficSummary (demo traffic, D08)", () => {
  function trafficTool() {
    const storeMetrics = fakeMetrics();
    const trafficStats: TrafficStatsPort = {
      sessionsBySource: vi.fn(async () => [{ source: "direct" as const, sessions: 10 }]),
      funnel: vi.fn(async () => ({
        sessions: 10,
        productViews: 8,
        addToCarts: 2,
        checkoutsStarted: 1,
      })),
      productViews: vi.fn(async () => ({ rows: [], productsWithoutViewData: 3 })),
    };
    const useCase = new GetTrafficSummaryUseCase({
      trafficStats,
      getSalesSummaryUseCase: new GetSalesSummaryUseCase({ storeMetrics }),
      getTopProductsUseCase: new GetTopProductsUseCase({ storeMetrics }),
    });
    return {
      trafficStats,
      useCase,
      tool: new GetTrafficSummaryTool({ getTrafficSummaryUseCase: useCase }),
    };
  }

  it("is named as AGENTS.md lists it and returns the use case DTO unchanged, labelled", async () => {
    const { tool, useCase, trafficStats } = trafficTool();
    expect(tool.name).toBe("getTrafficSummary");
    const result = await tool.run({ period: PERIOD, productLimit: 10 });
    expect(result).toEqual(await useCase.execute({ period: PERIOD, productLimit: 10 }));
    expect(result).toMatchObject({ source: DEMO_TRAFFIC_LABEL, demo: true, productLimit: 10 });
    expect(trafficStats.productViews).toHaveBeenCalledWith(
      { firstDay: "2026-10-11", lastDay: "2026-10-17" },
      10,
    );
  });

  it.each([0, 11, 2.5, "5", undefined])(
    "refuses the product limit %j (1–10) before reading anything",
    async (productLimit) => {
      const { tool, trafficStats } = trafficTool();
      await expect(tool.run({ period: PERIOD, productLimit })).rejects.toBeInstanceOf(
        ValidationError,
      );
      await expect(tool.run({ productLimit: 5 })).rejects.toBeInstanceOf(ValidationError);
      expect(trafficStats.funnel).not.toHaveBeenCalled();
    },
  );
});

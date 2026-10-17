import {
  GetLowStockProductsUseCase,
  GetOrderSummaryUseCase,
  GetSalesSummaryUseCase,
  GetTopProductsUseCase,
  type RateLimiterPort,
  type StoreMetricsPort,
} from "@commerceos/core";
import { describe, expect, it, vi } from "vitest";
import type { CopilotLogPort } from "../ports/copilot-log.port";
import { GetLowStockProductsTool } from "../tools/get-low-stock-products.tool";
import { GetOrderSummaryTool } from "../tools/get-order-summary.tool";
import { GetSalesSummaryTool } from "../tools/get-sales-summary.tool";
import { GetTopProductsTool } from "../tools/get-top-products.tool";
import {
  ASK_LIMIT,
  ASK_RATE_LIMITED_MESSAGE,
  ASK_WINDOW_SECONDS,
  AskCopilotUseCase,
  type AskCopilotDeps,
} from "./ask-copilot.use-case";
import { FALLBACK_REASONS } from "./copilot-answer";
import { NOW, PULSE_ID } from "./copilot-results.fixture";
import { CAUSATION_LIMITATION, NO_TRAFFIC_LIMITATION } from "./expand-response";
import { INTENTS, TRAFFIC_NOT_AVAILABLE_MESSAGE, UNSUPPORTED_MESSAGE } from "./intents";

const ADMIN = { id: "owner-1" };

function fakeMetrics(): StoreMetricsPort {
  return {
    salesSummary: vi.fn(async () => ({
      paidOrders: 3,
      revenueMinor: 30_000,
      otherCurrencyOrders: 1,
    })),
    orderSummary: vi.fn(async () => [{ status: "paid" as const, count: 3 }]),
    topProducts: vi.fn(async () => [
      { productId: PULSE_ID, name: "Pulse Ultralight Mouse", units: 3, revenueMinor: 30_000 },
    ]),
    lowStockProducts: vi.fn(async () => ({
      total: 1,
      rows: [
        { id: PULSE_ID, name: "Pulse Ultralight Mouse", sku: "DEMO-MOU-002", stockQuantity: 2 },
      ],
    })),
    demoOrderCount: vi.fn(async () => 0),
  };
}

function setup(options: { allowed?: boolean } = {}) {
  const storeMetrics = fakeMetrics();
  const rateLimiter: RateLimiterPort = {
    consume: vi.fn(async () => ({ allowed: options.allowed ?? true, remaining: 9 })),
  };
  const copilotLog: CopilotLogPort = { info: vi.fn() };
  const deps: AskCopilotDeps = {
    getSalesSummaryTool: new GetSalesSummaryTool({
      getSalesSummaryUseCase: new GetSalesSummaryUseCase({ storeMetrics }),
    }),
    getOrderSummaryTool: new GetOrderSummaryTool({
      getOrderSummaryUseCase: new GetOrderSummaryUseCase({ storeMetrics }),
    }),
    getTopProductsTool: new GetTopProductsTool({
      getTopProductsUseCase: new GetTopProductsUseCase({ storeMetrics }),
    }),
    getLowStockProductsTool: new GetLowStockProductsTool({
      getLowStockProductsUseCase: new GetLowStockProductsUseCase({ storeMetrics }),
    }),
    rateLimiter,
    copilotLog,
    clock: () => NOW,
  };
  return { useCase: new AskCopilotUseCase(deps), storeMetrics, rateLimiter, copilotLog };
}

function toolCalls(metrics: StoreMetricsPort): number {
  return Object.values(metrics).reduce(
    (sum, fn: ReturnType<typeof vi.fn>) => sum + fn.mock.calls.length,
    0,
  );
}

describe("AskCopilotUseCase", () => {
  it("answers the primary question with rule-based insights and says AI is not configured", async () => {
    const { useCase, rateLimiter, storeMetrics } = setup();
    const answer = await useCase.execute({ intent: "focus" }, ADMIN);

    expect(rateLimiter.consume).toHaveBeenCalledWith(
      "copilot:ask:owner-1",
      ASK_LIMIT,
      ASK_WINDOW_SECONDS,
    );
    expect(answer).toMatchObject({
      answerId: null,
      kind: "answered",
      intent: "focus",
      question: INTENTS.focus.question,
      origin: "rules",
      fallbackReason: "not_configured",
      model: null,
      period: {
        from: "2026-10-10T22:00:00.000Z",
        to: "2026-10-17T22:00:00.000Z",
        name: "Last 7 days",
        label: "11–17 Oct 2026",
        timeZone: "Europe/Warsaw",
      },
      limitations: [NO_TRAFFIC_LIMITATION, "1 order in another currency is not included."],
    });
    expect(answer.recommendations).toHaveLength(1);
    expect(answer.recommendations[0]).toMatchObject({
      title: "Restock Pulse Ultralight Mouse",
      relatedProductIds: [PULSE_ID],
      id: null,
      status: "new",
    });
    expect(answer.definitions.map((definition) => definition.id)).toEqual([
      "ordersPlaced",
      "paidOrders",
      "revenue",
      "aov",
      "topProducts",
      "lowStock",
    ]);
    expect(storeMetrics.lowStockProducts).toHaveBeenCalledWith(5, 10);
    expect(FALLBACK_REASONS).toContain(answer.fallbackReason);
  });

  it("routes a typed question, with 30 days when it asks about a month", async () => {
    const { useCase, storeMetrics } = setup();
    const answer = await useCase.execute(
      { question: "Which products sold best this month?" },
      ADMIN,
    );
    expect(answer.intent).toBe("top_products");
    expect(answer.period?.name).toBe("Last 30 days");
    expect(storeMetrics.orderSummary).not.toHaveBeenCalled();
  });

  it("answers a low-stock question from the stock and best-seller tools only", async () => {
    const { useCase, storeMetrics } = setup();
    const answer = await useCase.execute({ intent: "low_stock" }, ADMIN);
    expect(answer.recommendations[0]?.title).toBe("Restock Pulse Ultralight Mouse");
    expect(storeMetrics.salesSummary).not.toHaveBeenCalled();
    expect(answer.limitations).toEqual([]);
  });

  it("compares two periods for a sales change and attaches the causation limitation", async () => {
    const { useCase, storeMetrics } = setup();
    const answer = await useCase.execute({ question: "Why did sales drop?" }, ADMIN);
    expect(answer.intent).toBe("sales_change");
    expect(storeMetrics.salesSummary).toHaveBeenCalledTimes(2);
    expect(storeMetrics.topProducts).toHaveBeenCalledTimes(2);
    expect(answer.limitations[0]).toBe(CAUSATION_LIMITATION);
  });

  it("declines a margin question without running a tool, naming the missing data", async () => {
    const { useCase, storeMetrics, copilotLog } = setup();
    const answer = await useCase.execute({ question: "What is my profit margin?" }, ADMIN);
    expect(answer).toMatchObject({
      kind: "declined",
      intent: null,
      fallbackReason: null,
      missingData: "product cost data",
      summary:
        "Copilot can't answer this. It needs product cost data, which this store does not record.",
      recommendations: [],
    });
    expect(toolCalls(storeMetrics)).toBe(0);
    expect(copilotLog.info).toHaveBeenCalledWith(
      "copilot.answer",
      expect.objectContaining({ kind: "declined", declinedCategory: "margin", tools: [] }),
    );
  });

  it("answers an unsupported question with the list of questions and runs no tool", async () => {
    const { useCase, storeMetrics } = setup();
    const answer = await useCase.execute({ question: "Tell me a joke" }, ADMIN);
    expect(answer).toMatchObject({
      kind: "unsupported",
      summary: UNSUPPORTED_MESSAGE,
      period: null,
    });
    expect(toolCalls(storeMetrics)).toBe(0);
  });

  it("says traffic data is not available yet for a traffic question", async () => {
    const { useCase, storeMetrics } = setup();
    const answer = await useCase.execute({ intent: "funnel" }, ADMIN);
    expect(answer).toMatchObject({
      kind: "answered",
      intent: "funnel",
      summary: TRAFFIC_NOT_AVAILABLE_MESSAGE,
      fallbackReason: null,
      period: null,
    });
    expect(toolCalls(storeMetrics)).toBe(0);
  });

  it("refuses with RATE_LIMITED once the owner's limit is spent, before any tool runs", async () => {
    const { useCase, storeMetrics } = setup({ allowed: false });
    await expect(useCase.execute({ intent: "focus" }, ADMIN)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      message: ASK_RATE_LIMITED_MESSAGE,
    });
    expect(toolCalls(storeMetrics)).toBe(0);
  });

  it("rejects an invalid request before counting it", async () => {
    const { useCase, rateLimiter } = setup();
    await expect(useCase.execute({}, ADMIN)).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect(rateLimiter.consume).not.toHaveBeenCalled();
  });

  it("logs one event with fixed keys and never the question text or a fact value", async () => {
    const { useCase, copilotLog } = setup();
    await useCase.execute({ question: "What should I focus on? secret-question-text" }, ADMIN);
    expect(copilotLog.info).toHaveBeenCalledTimes(1);
    const [event, data] = vi.mocked(copilotLog.info).mock.calls[0] ?? [];
    expect(event).toBe("copilot.answer");
    expect(Object.keys(data ?? {}).sort()).toEqual([
      "declinedCategory",
      "fallbackReason",
      "intent",
      "kind",
      "latencyMs",
      "origin",
      "recommendations",
      "source",
      "tools",
    ]);
    expect(data).toMatchObject({
      source: "typed",
      tools: ["getSalesSummary", "getOrderSummary", "getTopProducts", "getLowStockProducts"],
    });
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("secret-question-text");
    expect(serialized).not.toContain("Pulse");
  });

  it("propagates a tool failure (database down) instead of answering", async () => {
    const { useCase, storeMetrics } = setup();
    vi.mocked(storeMetrics.salesSummary).mockRejectedValue(new Error("connection refused"));
    await expect(useCase.execute({ intent: "focus" }, ADMIN)).rejects.toThrow("connection refused");
  });
});

import { afterAll, describe, expect, it, vi } from "vitest";
import { AskCopilotUseCase, GetLowStockProductsTool } from "@commerceos/ai";
import {
  AddToCartUseCase,
  ChangeOrderStatusUseCase,
  PlaceOrderUseCase,
  AdjustStockUseCase,
  DeleteCategoryUseCase,
  GetDashboardUseCase,
  ListCatalogProductsUseCase,
  SetProductStatusUseCase,
} from "@commerceos/core";
import {
  DatabaseCatalogRepository,
  DatabaseCategoryRepository,
  DatabaseOrderAdminRepository,
  DatabaseProductRepository,
  DatabaseStockRepository,
  DatabaseStoreMetrics,
  DatabaseTrafficStats,
} from "@commerceos/database";
import {
  copilotLog,
  createRequestScope,
  disposeRootContainer,
  getAuth,
  logAuthMessage,
} from "./container";
import { createAuth } from "./auth/create-auth";
import { logger } from "./logger";

// betterAuth() starts initialising (a database schema check) as soon as it is built. This
// test checks wiring only, so it gets a stub and opens no connection.
vi.mock("./auth/create-auth", () => ({ createAuth: vi.fn(() => ({ stub: "auth" })) }));

// No database connection is opened: MikroORM connects lazily and these tests
// only resolve registrations.
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/commerceos";
process.env.BETTER_AUTH_SECRET ??= "unit-test-secret-unit-test-secret-1234";

describe("composition root", () => {
  const first = createRequestScope();
  const second = createRequestScope();

  afterAll(async () => {
    await first.dispose();
    await second.dispose();
  });

  it("gives every request its own EntityManager fork", () => {
    // Identity via ===: a failing-or-negated matcher on ORM objects makes Vitest serialise
    // their metadata, which took seconds in CI (see .ai/lessons.md).
    expect(first.cradle.em === second.cradle.em).toBe(false);
    expect(first.cradle.em).toBe(first.cradle.em);
  });

  it("shares process-wide singletons between requests", () => {
    expect(first.cradle.orm).toBe(second.cradle.orm);
    expect(first.cradle.llmProvider).toBe(second.cradle.llmProvider);
  });

  it("falls back to the unconfigured LLM provider until one is implemented", () => {
    expect(first.cradle.llmProvider.isConfigured).toBe(false);
  });

  it("wires the system health use case with the database check", () => {
    expect(first.cradle.healthChecks.map((check) => check.name)).toEqual(["database"]);
    // Compared by identity: printing a cradle-backed object in a diff would query the container.
    const isShared = first.cradle.getSystemHealthUseCase === second.cradle.getSystemHealthUseCase;
    expect(isShared).toBe(false);
  });

  it("wires the storefront catalog per request on the request's EntityManager", () => {
    const repository = first.cradle.catalogRepository;
    expect(repository instanceof DatabaseCatalogRepository).toBe(true);
    expect(repository === second.cradle.catalogRepository).toBe(false);
    for (const key of [
      "listCatalogCategoriesUseCase",
      "listCatalogProductsUseCase",
      "getCatalogProductUseCase",
      "listFeaturedProductsUseCase",
    ] as const) {
      expect(first.cradle[key] === second.cradle[key]).toBe(false);
    }
    expect(first.cradle.listCatalogProductsUseCase instanceof ListCatalogProductsUseCase).toBe(
      true,
    );
  });

  it("wires the admin category repository and use cases per request", () => {
    const repository = first.cradle.categoryRepository;
    expect(repository instanceof DatabaseCategoryRepository).toBe(true);
    expect(repository === second.cradle.categoryRepository).toBe(false);
    for (const key of [
      "listCategoriesUseCase",
      "getCategoryUseCase",
      "createCategoryUseCase",
      "updateCategoryUseCase",
      "deleteCategoryUseCase",
    ] as const) {
      expect(first.cradle[key] === second.cradle[key]).toBe(false);
    }
    expect(first.cradle.deleteCategoryUseCase instanceof DeleteCategoryUseCase).toBe(true);
  });

  it("wires the admin product repository and use cases per request", () => {
    const repository = first.cradle.productRepository;
    expect(repository instanceof DatabaseProductRepository).toBe(true);
    expect(repository === second.cradle.productRepository).toBe(false);
    for (const key of [
      "listProductsUseCase",
      "getProductUseCase",
      "createProductUseCase",
      "updateProductUseCase",
      "setProductStatusUseCase",
    ] as const) {
      expect(first.cradle[key] === second.cradle[key]).toBe(false);
    }
    expect(first.cradle.setProductStatusUseCase instanceof SetProductStatusUseCase).toBe(true);
  });

  it("wires the stock repository and use cases per request", () => {
    const repository = first.cradle.stockRepository;
    expect(repository instanceof DatabaseStockRepository).toBe(true);
    expect(repository === second.cradle.stockRepository).toBe(false);
    for (const key of ["adjustStockUseCase", "listStockAdjustmentsUseCase"] as const) {
      expect(first.cradle[key] === second.cradle[key]).toBe(false);
    }
    expect(first.cradle.adjustStockUseCase instanceof AdjustStockUseCase).toBe(true);
  });

  it("wires the cart use cases per request", () => {
    for (const key of [
      "getCartUseCase",
      "addToCartUseCase",
      "updateCartLineUseCase",
      "removeCartLineUseCase",
    ] as const) {
      expect(first.cradle[key] === second.cradle[key]).toBe(false);
    }
    expect(first.cradle.addToCartUseCase instanceof AddToCartUseCase).toBe(true);
  });

  it("wires the order repository, limiter and use cases per request, the demo gateway once", () => {
    for (const key of [
      "orderRepository",
      "rateLimiter",
      "placeOrderUseCase",
      "getOrderByReferenceUseCase",
      "confirmDemoPaymentUseCase",
    ] as const) {
      expect(first.cradle[key] === second.cradle[key]).toBe(false);
    }
    expect(first.cradle.placeOrderUseCase instanceof PlaceOrderUseCase).toBe(true);
    const gateway = first.cradle.paymentGateway;
    expect(gateway === second.cradle.paymentGateway).toBe(true);
    expect(gateway.isLive).toBe(false);
    expect(first.cradle.randomBytes(20)).toHaveLength(20);
  });

  it("wires the order admin repository and use cases per request", () => {
    const repository = first.cradle.orderAdminRepository;
    expect(repository instanceof DatabaseOrderAdminRepository).toBe(true);
    expect(repository === second.cradle.orderAdminRepository).toBe(false);
    for (const key of [
      "listAdminOrdersUseCase",
      "getAdminOrderUseCase",
      "changeOrderStatusUseCase",
    ] as const) {
      expect(first.cradle[key] === second.cradle[key]).toBe(false);
    }
    expect(first.cradle.changeOrderStatusUseCase instanceof ChangeOrderStatusUseCase).toBe(true);
  });

  it("wires the store metrics adapter and metric use cases per request, one real clock", () => {
    expect(first.cradle.storeMetrics instanceof DatabaseStoreMetrics).toBe(true);
    for (const key of [
      "storeMetrics",
      "getSalesSummaryUseCase",
      "getOrderSummaryUseCase",
      "getTopProductsUseCase",
      "getLowStockProductsUseCase",
      "getDashboardUseCase",
      "trafficStats",
      "getTrafficSummaryUseCase",
    ] as const) {
      expect(first.cradle[key] === second.cradle[key]).toBe(false);
    }
    expect(first.cradle.trafficStats instanceof DatabaseTrafficStats).toBe(true);
    expect(first.cradle.getDashboardUseCase instanceof GetDashboardUseCase).toBe(true);
    expect(first.cradle.clock === second.cradle.clock).toBe(true);
    const before = Date.now();
    const now = first.cradle.clock().getTime();
    expect(now >= before && now <= Date.now()).toBe(true);
  });

  it("wires the Copilot tools and use case per request, one log port", () => {
    for (const key of [
      "getSalesSummaryTool",
      "getOrderSummaryTool",
      "getTopProductsTool",
      "getLowStockProductsTool",
      "getTrafficSummaryTool",
      "askCopilotUseCase",
    ] as const) {
      expect(first.cradle[key] === second.cradle[key]).toBe(false);
    }
    expect(first.cradle.askCopilotUseCase instanceof AskCopilotUseCase).toBe(true);
    expect(first.cradle.getLowStockProductsTool instanceof GetLowStockProductsTool).toBe(true);
    expect(first.cradle.copilotLog === copilotLog).toBe(true);
  });

  it("routes Copilot answer events through the server logger", () => {
    const info = vi.spyOn(logger, "info").mockImplementation(() => {});
    copilotLog.info("copilot.answer", { kind: "answered", tools: ["getSalesSummary"] });
    expect(info).toHaveBeenCalledWith("copilot.answer", {
      kind: "answered",
      tools: ["getSalesSummary"],
    });
    info.mockRestore();
  });

  it("shares one Better Auth instance and pool, reachable without a request scope", () => {
    expect(first.cradle.auth === second.cradle.auth).toBe(true);
    expect(getAuth() === first.cradle.auth).toBe(true);
    expect(first.cradle.authPool === second.cradle.authPool).toBe(true);
    const deps = vi.mocked(createAuth).mock.calls[0]?.[0];
    expect(deps?.pool === first.cradle.authPool).toBe(true);
    expect(deps?.log).toBe(logAuthMessage);
    expect(deps?.env.BETTER_AUTH_SECRET).toBe(process.env.BETTER_AUTH_SECRET);
  });

  it("routes Better Auth log lines through the server logger", () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const info = vi.spyOn(logger, "info").mockImplementation(() => {});
    logAuthMessage("warn", "[better-auth] Invalid password");
    logAuthMessage("debug", "[better-auth] detail");
    expect(warn).toHaveBeenCalledWith("[better-auth] Invalid password");
    expect(info).toHaveBeenCalledWith("[better-auth] detail");
    warn.mockRestore();
    info.mockRestore();
  });

  it("closes the ORM and the auth pool, and rebuilds the container after disposal", async () => {
    // One disposal of the original container, as before auth existed: closing a second,
    // freshly built ORM without a database took over 5 s in CI.
    const orm = first.cradle.orm;
    const close = vi.spyOn(orm, "close");
    const end = vi.spyOn(first.cradle.authPool, "end");
    await disposeRootContainer();
    expect(close).toHaveBeenCalled();
    expect(end).toHaveBeenCalled();

    const fresh = createRequestScope();
    expect(fresh.cradle.orm === orm).toBe(false);
    await fresh.dispose();
    await disposeRootContainer();
  });

  it("disposing an already disposed container is a no-op", async () => {
    await expect(disposeRootContainer()).resolves.toBeUndefined();
  });
});

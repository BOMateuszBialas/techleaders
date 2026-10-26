import { beforeEach, describe, expect, it, vi } from "vitest";

const listCategoryCounts = vi.fn();
const getTopProducts = vi.fn();
const getLowStockProducts = vi.fn();
const dispose = vi.fn(async () => {});

vi.mock("@/server/container", () => ({
  createRequestScope: () => ({
    cradle: {
      listCategoryCountsUseCase: { execute: listCategoryCounts },
      getTopProductsUseCase: { execute: getTopProducts },
      getLowStockProductsUseCase: { execute: getLowStockProducts },
    },
    dispose,
  }),
}));

const { loadBestSellerNames, loadCategoryCounts, loadLowStockProduct } =
  await import("./load-home-sections");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("loadCategoryCounts", () => {
  it("returns the categories with published products", async () => {
    const counts = [{ slug: "mice", name: "Mice", productCount: 3 }];
    listCategoryCounts.mockResolvedValue(counts);

    expect(await loadCategoryCounts()).toEqual({ kind: "ok", data: counts });
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("returns a generic error state and logs the cause when the read fails", async () => {
    listCategoryCounts.mockRejectedValue(new Error("connection refused"));

    expect(await loadCategoryCounts()).toEqual({ kind: "error" });
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalled();
  });
});

describe("loadBestSellerNames", () => {
  it("ranks the last 30 days of paid orders through GetTopProductsUseCase and keeps names only", async () => {
    getTopProducts.mockResolvedValue({
      rows: [
        { productId: "p-1", name: "Vortex Wireless Mouse", units: 4, revenueMinor: 99_600 },
        { productId: null, name: "Gone pad", units: 1, revenueMinor: 1000 },
      ],
    });
    const now = new Date("2026-10-26T12:00:00Z");

    expect(await loadBestSellerNames(now)).toEqual({
      kind: "ok",
      data: ["Vortex Wireless Mouse", "Gone pad"],
    });
    const input = getTopProducts.mock.calls[0]?.[0];
    expect(input.limit).toBe(3);
    expect(input.period.preset).toBe("30d");
    expect(input.period.to.getTime() - input.period.from.getTime()).toBeGreaterThan(
      29 * 86_400_000,
    );
    expect(input.period.to.getTime()).toBeGreaterThan(now.getTime());
  });

  it("returns an empty list when no paid order falls in the window", async () => {
    getTopProducts.mockResolvedValue({ rows: [] });

    expect(await loadBestSellerNames(new Date())).toEqual({ kind: "ok", data: [] });
  });

  it("returns a generic error state when the metric fails", async () => {
    getTopProducts.mockRejectedValue(new Error("boom"));

    expect(await loadBestSellerNames(new Date())).toEqual({ kind: "error" });
  });
});

describe("loadLowStockProduct", () => {
  it("returns the lowest-stock published product from GetLowStockProductsUseCase", async () => {
    const row = { id: "p-2", slug: "titan-mmo-mouse", name: "Titan", sku: null, stockQuantity: 0 };
    getLowStockProducts.mockResolvedValue({ total: 1, rows: [row] });

    expect(await loadLowStockProduct()).toEqual({ kind: "ok", data: row });
    expect(getLowStockProducts).toHaveBeenCalledWith({ limit: 1 });
  });

  it("returns null when no published product is at or below the threshold", async () => {
    getLowStockProducts.mockResolvedValue({ total: 0, rows: [] });

    expect(await loadLowStockProduct()).toEqual({ kind: "ok", data: null });
  });

  it("returns a generic error state when the read fails", async () => {
    getLowStockProducts.mockRejectedValue(new Error("boom"));

    expect(await loadLowStockProduct()).toEqual({ kind: "error" });
  });
});

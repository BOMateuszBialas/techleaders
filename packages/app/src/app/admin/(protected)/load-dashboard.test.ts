import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/server/logger";

const getDashboard = vi.fn();
const getUnpaidOrders = vi.fn();
const dispose = vi.fn(async () => {});

vi.mock("@/server/container", () => ({
  createRequestScope: () => ({
    cradle: {
      getDashboardUseCase: { execute: getDashboard },
      unpaidOrdersSummaryUseCase: { execute: getUnpaidOrders },
    },
    dispose,
  }),
}));

const { loadDashboard, loadUnpaidOrders } = await import("./load-dashboard");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadDashboard", () => {
  it("passes the raw search parameters to the use case and disposes the scope", async () => {
    getDashboard.mockResolvedValue({ demoOrderCount: 0 });

    await expect(
      loadDashboard({ period: "30d", from: "2026-10-01", to: undefined }),
    ).resolves.toEqual({
      kind: "ok",
      data: { demoOrderCount: 0 },
    });
    expect(getDashboard).toHaveBeenCalledWith({ period: "30d", from: "2026-10-01", to: undefined });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("logs a failure with the page only and returns the error state", async () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});
    getDashboard.mockRejectedValue(new Error("connection refused"));

    await expect(loadDashboard({})).resolves.toEqual({ kind: "error" });
    expect(error).toHaveBeenCalledWith("Page data could not be loaded", {
      page: "/admin",
      error: expect.any(Error),
    });
  });
});

describe("loadUnpaidOrders", () => {
  it("returns the unpaid summary from the use case and disposes the scope", async () => {
    const summary = { count: 2, staleCount: 1, oldestCreatedAt: null };
    getUnpaidOrders.mockResolvedValueOnce(summary);
    await expect(loadUnpaidOrders()).resolves.toEqual({ kind: "ok", data: summary });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("returns the error state when the use case fails", async () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});
    getUnpaidOrders.mockRejectedValueOnce(new Error("database down"));
    await expect(loadUnpaidOrders()).resolves.toEqual({ kind: "error" });
    expect(error).toHaveBeenCalledWith("Page data could not be loaded", {
      page: "/admin",
      error: expect.any(Error),
    });
  });
});

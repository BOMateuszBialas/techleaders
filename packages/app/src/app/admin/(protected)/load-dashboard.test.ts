import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/server/logger";

const getDashboard = vi.fn();
const dispose = vi.fn(async () => {});

vi.mock("@/server/container", () => ({
  createRequestScope: () => ({
    cradle: { getDashboardUseCase: { execute: getDashboard } },
    dispose,
  }),
}));

const { loadDashboard } = await import("./load-dashboard");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadDashboard", () => {
  it("passes the raw period to the use case and disposes the scope", async () => {
    getDashboard.mockResolvedValue({ demoOrderCount: 0 });

    await expect(loadDashboard("30d")).resolves.toEqual({
      kind: "ok",
      data: { demoOrderCount: 0 },
    });
    expect(getDashboard).toHaveBeenCalledWith({ period: "30d" });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("logs a failure with the page only and returns the error state", async () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});
    getDashboard.mockRejectedValue(new Error("connection refused"));

    await expect(loadDashboard(undefined)).resolves.toEqual({ kind: "error" });
    expect(error).toHaveBeenCalledWith("Page data could not be loaded", {
      page: "/admin",
      error: expect.any(Error),
    });
  });
});

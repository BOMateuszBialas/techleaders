import type { SystemHealth } from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn<() => Promise<SystemHealth>>();
const dispose = vi.fn(async () => {});

vi.mock("@/server/container", () => ({
  createRequestScope: () => ({ cradle: { getSystemHealthUseCase: { execute } }, dispose }),
}));

const { loadSystemHealth } = await import("./load-system-health");

describe("loadSystemHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the system health and disposes the request scope", async () => {
    const health: SystemHealth = { status: "ok", components: [] };
    execute.mockResolvedValue(health);

    await expect(loadSystemHealth()).resolves.toEqual(health);
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("returns null and logs when the use case cannot run", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    execute.mockRejectedValue(new Error("boom"));

    await expect(loadSystemHealth()).resolves.toBeNull();
    expect(log).toHaveBeenCalledOnce();
    expect(dispose).toHaveBeenCalledOnce();
  });
});

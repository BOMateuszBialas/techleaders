import type { SystemHealth } from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const execute = vi.fn<() => Promise<SystemHealth>>();
const dispose = vi.fn(async () => {});

vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/server/container", () => ({
  createRequestScope: () => ({ cradle: { getSystemHealthUseCase: { execute } }, dispose }),
}));

const { GET } = await import("./route");

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when every component is up", async () => {
    const health: SystemHealth = {
      status: "ok",
      components: [{ name: "database", status: "up", latencyMs: 2 }],
    };
    execute.mockResolvedValue(health);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual(health);
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("returns 503 when a component is down", async () => {
    execute.mockResolvedValue({
      status: "degraded",
      components: [{ name: "database", status: "down", latencyMs: 1 }],
    });

    const response = await GET();
    expect(response.status).toBe(503);
  });

  it("returns 503 without details when the check cannot run, and logs the error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    execute.mockRejectedValue(new Error("Invalid environment: DATABASE_URL=postgres://u:p@h"));

    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "degraded", components: [] });
    expect(log).toHaveBeenCalledOnce();
    expect(dispose).toHaveBeenCalledOnce();
  });
});

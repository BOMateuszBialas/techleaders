import { describe, expect, it } from "vitest";
import type { HealthCheckPort } from "../../ports/health-check.port";
import { GetSystemHealthUseCase } from "./get-system-health.use-case";

const up: HealthCheckPort = { name: "up", check: async () => {} };
const down: HealthCheckPort = {
  name: "down",
  check: async () => {
    throw new Error("connection refused: secret-host:5432");
  },
};

describe("GetSystemHealthUseCase", () => {
  it("reports ok when every check passes", async () => {
    const result = await new GetSystemHealthUseCase({ healthChecks: [up] }).execute();
    expect(result.status).toBe("ok");
    expect(result.components).toEqual([expect.objectContaining({ name: "up", status: "up" })]);
  });

  it("reports degraded without leaking error details", async () => {
    const result = await new GetSystemHealthUseCase({ healthChecks: [up, down] }).execute();
    expect(result.status).toBe("degraded");
    expect(JSON.stringify(result)).not.toContain("secret-host");
  });
});

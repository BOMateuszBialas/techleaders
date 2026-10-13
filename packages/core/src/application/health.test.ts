import { describe, expect, it } from "vitest";
import { GetSystemHealth, type HealthCheck } from "./health";

const up: HealthCheck = { name: "up", check: async () => {} };
const down: HealthCheck = {
  name: "down",
  check: async () => {
    throw new Error("connection refused: secret-host:5432");
  },
};

describe("GetSystemHealth", () => {
  it("reports ok when every check passes", async () => {
    const result = await new GetSystemHealth({ healthChecks: [up] }).execute();
    expect(result.status).toBe("ok");
    expect(result.components).toEqual([expect.objectContaining({ name: "up", status: "up" })]);
  });

  it("reports degraded without leaking error details", async () => {
    const result = await new GetSystemHealth({ healthChecks: [up, down] }).execute();
    expect(result.status).toBe("degraded");
    expect(JSON.stringify(result)).not.toContain("secret-host");
  });
});

import { afterAll, describe, expect, it, vi } from "vitest";
import { createUnitTestOrm } from "../testing/unit-orm";
import { DatabaseRateLimiter } from "./database-rate-limiter";

const orm = createUnitTestOrm();

afterAll(async () => {
  await orm.close();
});

function setup() {
  const em = orm.em.fork();
  return { execute: vi.spyOn(em, "execute"), limiter: new DatabaseRateLimiter({ em }) };
}

describe("DatabaseRateLimiter", () => {
  it("upserts the window's count and cleans old windows when a new one starts", async () => {
    const { execute, limiter } = setup();
    execute.mockResolvedValueOnce([{ count: 1 }] as never).mockResolvedValueOnce([] as never);

    expect(await limiter.consume("order-lookup|shared", 120, 60)).toEqual({
      allowed: true,
      remaining: 119,
    });
    expect(execute.mock.calls[0]?.[1]).toEqual(["order-lookup|shared", 60, 60]);
    expect(String(execute.mock.calls[1]?.[0])).toContain("interval '1 day'");
  });

  it("blocks above the limit without cleaning", async () => {
    const { execute, limiter } = setup();
    execute.mockResolvedValueOnce([{ count: 31 }] as never);
    expect(await limiter.consume("order-lookup|1.2.3.4", 30, 60)).toEqual({
      allowed: false,
      remaining: 0,
    });
    expect(execute).toHaveBeenCalledOnce();
  });

  it("refuses a window longer than a day, which cleanup would reset", async () => {
    const { execute, limiter } = setup();
    await expect(limiter.consume("k", 1, 86_401)).rejects.toThrow("longer than a day");
    expect(execute).not.toHaveBeenCalled();
  });

  it("fails closed when the statement returns no count", async () => {
    const { execute, limiter } = setup();
    execute.mockResolvedValueOnce([] as never);
    await expect(limiter.consume("k", 1, 60)).rejects.toThrow("no count");
  });
});

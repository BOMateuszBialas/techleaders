import { afterAll, describe, expect, it, vi } from "vitest";
import { createUnitTestOrm } from "../testing/unit-orm";
import { DatabaseHealthCheck } from "./database-health-check";

const orm = createUnitTestOrm();

afterAll(async () => {
  await orm.close();
});

function stubQuery() {
  const em = orm.em.fork();
  vi.spyOn(orm.em, "fork").mockReturnValue(em);
  return vi.spyOn(em, "execute");
}

describe("DatabaseHealthCheck", () => {
  it("is named after the component it checks", () => {
    expect(new DatabaseHealthCheck({ orm }).name).toBe("database");
  });

  it("passes when a trivial query succeeds", async () => {
    const execute = stubQuery().mockResolvedValue([]);
    await expect(new DatabaseHealthCheck({ orm }).check()).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledWith("select 1");
  });

  it("fails when the query fails", async () => {
    stubQuery().mockRejectedValue(new Error("connection refused"));
    await expect(new DatabaseHealthCheck({ orm }).check()).rejects.toThrow("connection refused");
  });
});

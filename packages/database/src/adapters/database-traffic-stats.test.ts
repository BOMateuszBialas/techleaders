import { afterAll, describe, expect, it, vi } from "vitest";
import { createUnitTestOrm } from "../testing/unit-orm";
import { DatabaseTrafficStats } from "./database-traffic-stats";

const orm = createUnitTestOrm();

afterAll(async () => {
  await orm.close();
});

const RANGE = { firstDay: "2026-10-11", lastDay: "2026-10-17" };

// Raw rows as PostgreSQL returns them: `bigint` sums and counts arrive as strings.
function setup(...results: unknown[]) {
  const em = orm.em.fork();
  const execute = vi.spyOn(em, "execute");
  for (const result of results) execute.mockResolvedValueOnce(result as never);
  return { execute, traffic: new DatabaseTrafficStats({ em }) };
}

describe("DatabaseTrafficStats", () => {
  it("lists every source in the fixed order, 0 for a source without rows, days bound", async () => {
    const { execute, traffic } = setup([
      { source: "social", sessions: "40" },
      { source: "direct", sessions: "120" },
    ]);

    expect(await traffic.sessionsBySource(RANGE)).toEqual([
      { source: "direct", sessions: 120 },
      { source: "organic", sessions: 0 },
      { source: "social", sessions: 40 },
      { source: "email", sessions: 0 },
      { source: "paid", sessions: 0 },
    ]);
    const [sql, params] = execute.mock.calls[0] ?? [];
    expect(sql).toContain("date >= ?::date and date <= ?::date");
    expect(params).toEqual(["2026-10-11", "2026-10-17"]);
  });

  it("sums the funnel over every source", async () => {
    const { execute, traffic } = setup([
      { sessions: "200", product_views: "150", add_to_carts: "30", checkouts_started: "12" },
    ]);

    expect(await traffic.funnel(RANGE)).toEqual({
      sessions: 200,
      productViews: 150,
      addToCarts: 30,
      checkoutsStarted: 12,
    });
    expect(execute.mock.calls[0]?.[1]).toEqual(["2026-10-11", "2026-10-17"]);
  });

  it("fails loudly when an aggregate returns no row", async () => {
    await expect(setup([]).traffic.funnel(RANGE)).rejects.toThrow("returned no row");
    await expect(setup([], []).traffic.productViews(RANGE, 5)).rejects.toThrow("returned no row");
  });

  it("ranks published products by views and counts those without view data", async () => {
    const { execute, traffic } = setup(
      [
        { product_id: "p-drift", name: "Drift", views: "640", add_to_carts: "40" },
        { product_id: "p-pulse", name: "Pulse", views: "210", add_to_carts: "35" },
      ],
      [{ count: "2" }],
    );

    expect(await traffic.productViews(RANGE, 5)).toEqual({
      rows: [
        { productId: "p-drift", name: "Drift", views: 640, addToCarts: 40 },
        { productId: "p-pulse", name: "Pulse", views: 210, addToCarts: 35 },
      ],
      productsWithoutViewData: 2,
    });
    const [rankSql, rankParams] = execute.mock.calls[0] ?? [];
    expect(rankSql).toContain("p.status = 'published'");
    expect(rankSql).toContain("order by views desc, p.name asc, p.id asc");
    expect(rankParams).toEqual(["2026-10-11", "2026-10-17", 5]);
    const [withoutSql, withoutParams] = execute.mock.calls[1] ?? [];
    expect(withoutSql).toContain("not exists");
    expect(withoutParams).toEqual(["2026-10-11", "2026-10-17"]);
  });

  it("refuses a sum that is not a safe integer", async () => {
    const { traffic } = setup([{ source: "direct", sessions: "1.5" }]);
    await expect(traffic.sessionsBySource(RANGE)).rejects.toThrow("not a safe integer");
  });
});

import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "../cli/cli-orm";
import { DEMO_CATALOG, seedCatalog } from "../seeders/DatabaseSeeder";
import { E2E_CATALOG } from "../testing/catalog-fixtures";
import "../testing/provided-context";
import { DatabaseTrafficStats } from "./database-traffic-stats";

/**
 * The demo traffic queries against a hand-built fixture (Copilot spec Phase 3, step 12), not the
 * demo generator: every expected value below is summed by hand from the rows inserted here.
 *
 * Range: 11–17 Oct 2026 (local calendar days, both included). Rows on 10 Oct and 18 Oct sit
 * just outside it and must never count.
 */
const RANGE = { firstDay: "2026-10-11", lastDay: "2026-10-17" };

// [date, source, sessions, product views, add-to-carts, checkouts started]
const TRAFFIC: [string, string, number, number, number, number][] = [
  ["2026-10-10", "direct", 999, 999, 999, 999], // before the range
  ["2026-10-11", "direct", 100, 80, 20, 5], // first day
  ["2026-10-11", "social", 50, 30, 6, 1],
  ["2026-10-14", "direct", 40, 25, 5, 2],
  ["2026-10-17", "email", 10, 8, 2, 1], // last day
  ["2026-10-18", "organic", 999, 999, 999, 999], // after the range
];

// [date, product slug, views, add-to-carts]
const VIEWS: [string, string, number, number][] = [
  ["2026-10-11", "drift-wireless-headset", 60, 4],
  ["2026-10-17", "drift-wireless-headset", 40, 1],
  ["2026-10-12", "pulse-ultralight-mouse", 30, 6],
  ["2026-10-13", "vortex-wireless-mouse", 30, 2], // same views as Pulse: name decides
  ["2026-10-10", "glide-xl-mousepad", 500, 9], // outside the range only: no view data
  ["2026-10-18", "glide-xl-mousepad", 500, 9],
  ["2026-10-12", "e2e-draft-mouse", 900, 9], // a draft: never listed
];

describe("DatabaseTrafficStats (PostgreSQL)", () => {
  let orm: MikroORM;
  const traffic = () => new DatabaseTrafficStats({ em: orm.em.fork() });

  async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return orm.em.fork().execute<T[]>(sql, params);
  }

  async function publishedProducts(): Promise<number> {
    const [row] = await query<{ n: number }>(
      "select count(*)::int as n from products where status = 'published'",
    );
    return row?.n ?? -1;
  }

  async function productId(slug: string): Promise<string> {
    const rows = await query<{ id: string }>("select id from products where slug = ?", [slug]);
    return rows[0]?.id ?? "";
  }

  beforeAll(async () => {
    orm = await initToolingOrm(inject("databaseUrl"));
    await orm.schema.drop({ dropMigrationsTable: true });
    await orm.migrator.up();
    await seedCatalog(orm.em.fork(), DEMO_CATALOG);
    await seedCatalog(orm.em.fork(), E2E_CATALOG);
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  describe("with no traffic rows", () => {
    it("returns zeros, no ranked product and every published product without view data", async () => {
      expect((await traffic().sessionsBySource(RANGE)).every((row) => row.sessions === 0)).toBe(
        true,
      );
      expect(await traffic().funnel(RANGE)).toEqual({
        sessions: 0,
        productViews: 0,
        addToCarts: 0,
        checkoutsStarted: 0,
      });
      expect(await traffic().productViews(RANGE, 5)).toEqual({
        rows: [],
        productsWithoutViewData: await publishedProducts(),
      });
    });
  });

  describe("with the hand-built fixture", () => {
    beforeAll(async () => {
      for (const [date, source, sessions, views, adds, checkouts] of TRAFFIC) {
        await query(
          `insert into traffic_daily_stats
             (date, source, sessions, product_views, add_to_carts, checkouts_started)
           values (?::date, ?, ?, ?, ?, ?)`,
          [date, source, sessions, views, adds, checkouts],
        );
      }
      for (const [date, slug, views, adds] of VIEWS) {
        await query(
          `insert into product_view_daily_stats (date, product_id, views, add_to_carts)
           values (?::date, ?, ?, ?)`,
          [date, await productId(slug), views, adds],
        );
      }
    });

    it("sums sessions by source over the local days of the range, both ends included", async () => {
      expect(await traffic().sessionsBySource(RANGE)).toEqual([
        { source: "direct", sessions: 140 },
        { source: "organic", sessions: 0 },
        { source: "social", sessions: 50 },
        { source: "email", sessions: 10 },
        { source: "paid", sessions: 0 },
      ]);
    });

    it("sums the funnel over every source", async () => {
      expect(await traffic().funnel(RANGE)).toEqual({
        sessions: 200,
        productViews: 143,
        addToCarts: 33,
        checkoutsStarted: 9,
      });
    });

    it("ranks published products with view rows; others count as without view data", async () => {
      const result = await traffic().productViews(RANGE, 5);
      expect(result.rows).toEqual([
        {
          productId: await productId("drift-wireless-headset"),
          name: "Drift Wireless Headset",
          views: 100,
          addToCarts: 5,
        },
        {
          productId: await productId("pulse-ultralight-mouse"),
          name: "Pulse Ultralight Mouse",
          views: 30,
          addToCarts: 6,
        },
        {
          productId: await productId("vortex-wireless-mouse"),
          name: "Vortex Wireless Mouse",
          views: 30,
          addToCarts: 2,
        },
      ]);
      // Glide has rows only outside the range, so it is "without view data" too.
      expect(result.productsWithoutViewData).toBe((await publishedProducts()) - 3);
      expect((await traffic().productViews(RANGE, 1)).rows).toHaveLength(1);
    });

    it("finds nothing in a range with no rows", async () => {
      const empty = { firstDay: "2026-09-01", lastDay: "2026-09-07" };
      expect((await traffic().funnel(empty)).sessions).toBe(0);
      expect((await traffic().productViews(empty, 5)).rows).toEqual([]);
    });
  });
});

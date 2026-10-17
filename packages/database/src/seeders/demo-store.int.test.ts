import { createHash, randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { PlaceOrderUseCase, cartFingerprint, type CartLine } from "@commerceos/core";
import type { MikroORM } from "@mikro-orm/postgresql";
import { DatabaseCatalogRepository } from "../adapters/database-catalog-repository";
import { DatabaseOrderAdminRepository } from "../adapters/database-order-admin-repository";
import { DatabaseOrderRepository } from "../adapters/database-order-repository";
import { DatabaseStockRepository } from "../adapters/database-stock-repository";
import { initToolingOrm } from "../cli/cli-orm";
import "../testing/provided-context";
import { DEMO_CATALOG, DatabaseSeeder, seedCatalog } from "./DatabaseSeeder";

const FIRST_SEED = new Date("2026-10-16T14:00:00.000Z");
const LATER_SEED = new Date("2026-10-20T14:00:00.000Z");
const MIGRATION = "Migration20261017130131_demo_traffic";

/**
 * The demo store seed against PostgreSQL (orders spec Phase 2, step 8): insert-only catalog,
 * regenerated demo orders and traffic, owner edits and live orders left alone, and the traffic
 * tables' constraints and migration.
 */
describe("demo store seed (PostgreSQL)", () => {
  let orm: MikroORM;

  async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return orm.em.fork().execute<T[]>(sql, params);
  }

  async function count(sql: string, params: unknown[] = []): Promise<number> {
    const rows = await query<{ n: number }>(
      `select count(*)::int as n from (${sql}) as rows`,
      params,
    );
    return rows[0]?.n ?? -1;
  }

  async function seed(at: Date) {
    // As `orm.seeder.seed(DatabaseSeeder)` runs it, with a fixed seed date.
    await new DatabaseSeeder(() => at).run(orm.em.fork());
  }

  async function counts() {
    return {
      categories: await count("select 1 from categories"),
      products: await count("select 1 from products"),
      demoOrders: await count("select 1 from orders where public_reference like 'DEMO-%'"),
      items: await count("select 1 from order_items"),
      traffic: await count("select 1 from traffic_daily_stats"),
      productViews: await count("select 1 from product_view_daily_stats"),
    };
  }

  async function product(slug: string) {
    const rows = await query<{
      id: string;
      stock_quantity: number;
      featured: boolean;
      price_minor: number;
    }>("select id, stock_quantity, featured, price_minor from products where slug = ?", [slug]);
    return rows[0];
  }

  beforeAll(async () => {
    orm = await initToolingOrm(inject("databaseUrl"));
    await orm.schema.drop({ dropMigrationsTable: true });
    await orm.migrator.up();
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  it("seeds an empty database with the catalog, a labelled order history and traffic", async () => {
    await seed(FIRST_SEED);
    const seeded = await counts();
    expect(seeded).toMatchObject({
      categories: DEMO_CATALOG.categories.length,
      products: DEMO_CATALOG.products.length,
      traffic: 35 * 5,
      productViews: 35 * DEMO_CATALOG.products.length,
    });
    expect(seeded.demoOrders).toBeGreaterThan(100);

    const [window] = await query<{ first: string; last: string; customers: number }>(
      `select min(created_at)::text as first, max(created_at)::text as last,
        count(*) filter (where customer_name not like '[DEMO] %' or customer_email not like '%@example.com')::int as customers
        from orders`,
    );
    expect(window?.customers).toBe(0);
    expect(new Date(window?.last ?? "").getTime()).toBeLessThanOrEqual(FIRST_SEED.getTime());
    const [statuses] = await query<{ pending: number; cancelled: number; refunded: number }>(
      `select count(*) filter (where status = 'pending_payment')::int as pending,
        count(*) filter (where status = 'cancelled')::int as cancelled,
        count(*) filter (where status = 'refunded')::int as refunded from orders`,
    );
    expect(statuses).toEqual({ pending: 0, cancelled: 2, refunded: 1 });
    // Seeded orders never change stock: the catalog keeps its seed values.
    expect((await product("pulse-ultralight-mouse"))?.stock_quantity).toBe(3);
  });

  it("re-seeds without duplicates and re-anchors the window to the new date", async () => {
    const before = await counts();
    await seed(LATER_SEED);
    expect(await counts()).toEqual(before);
    const [dates] = await query<{ last_order: string; last_traffic: string }>(
      `select (max(created_at) at time zone 'Europe/Warsaw')::date::text as last_order,
        max(date)::text as last_traffic from orders, traffic_daily_stats`,
    );
    expect(dates).toEqual({ last_order: "2026-10-20", last_traffic: "2026-10-20" });
  });

  it("keeps the owner's edits and the stock history of a demo product", async () => {
    const vortex = await product("vortex-wireless-mouse");
    const em = orm.em.fork();
    const changed = await new DatabaseStockRepository({ em }).setStock({
      productId: vortex?.id ?? "",
      expectedQuantity: vortex?.stock_quantity ?? 0,
      newQuantity: 7,
    });
    expect(changed.kind).toBe("updated");
    await query("update products set featured = false, price_minor = 19900 where slug = ?", [
      "vortex-wireless-mouse",
    ]);

    await seed(LATER_SEED);

    expect(await product("vortex-wireless-mouse")).toMatchObject({
      stock_quantity: 7,
      featured: false,
      price_minor: 19900,
    });
    const history = await query<{ new_quantity: number }>(
      "select new_quantity from stock_adjustments where product_id = ? order by created_at desc",
      [vortex?.id],
    );
    // The last recorded quantity is still the current stock.
    expect(history.map((row) => row.new_quantity)).toEqual([7]);
  });

  it("never touches live orders, and a cancel + re-seed leaves stock at its post-cancel value", async () => {
    const retro = await product("retro-wired-controller");
    const em = orm.em.fork();
    const lines: CartLine[] = [{ productId: retro?.id ?? "", quantity: 2 }];
    const { reference } = await new PlaceOrderUseCase({
      orderRepository: new DatabaseOrderRepository({ em }),
      catalogRepository: new DatabaseCatalogRepository({ em }),
      randomBytes: (length) => new Uint8Array(randomBytes(length)),
      sha256Hex: async (text) => createHash("sha256").update(text).digest("hex"),
    }).execute({
      lines,
      request: {
        idempotencyKey: randomUUID(),
        customerName: "Ada Lovelace",
        customerEmail: "ada@example.test",
        shippingLine1: "ul. Marszałkowska 1",
        shippingLine2: "",
        shippingCity: "Warszawa",
        shippingPostalCode: "00-950",
        shippingCountry: "PL",
        expectedTotalMinor: String(2 * 9900),
        cartFingerprint: cartFingerprint(lines),
      },
    });
    const start = retro?.stock_quantity ?? 0;
    expect((await product("retro-wired-controller"))?.stock_quantity).toBe(start - 2);

    await seed(LATER_SEED);
    const [live] = await query<{ id: string; status: string }>(
      "select id, status from orders where public_reference = ?",
      [reference],
    );
    expect(live?.status).toBe("pending_payment");

    const cancelled = await new DatabaseOrderAdminRepository({ em: orm.em.fork() }).changeStatus({
      orderId: live?.id ?? "",
      from: "pending_payment",
      to: "cancelled",
      restock: true,
    });
    expect(cancelled.kind).toBe("changed");
    expect((await product("retro-wired-controller"))?.stock_quantity).toBe(start);

    await seed(LATER_SEED);
    expect((await product("retro-wired-controller"))?.stock_quantity).toBe(start);
    expect(await count("select 1 from orders where public_reference = ?", [reference])).toBe(1);
  });

  it("re-creates a deleted demo product; old lines keep their snapshot", async () => {
    const glide = await product("glide-xl-mousepad");
    await query("delete from stock_adjustments where product_id = ?", [glide?.id]);
    await query("delete from products where slug = ?", ["glide-xl-mousepad"]);
    expect(await seedCatalog(orm.em.fork(), DEMO_CATALOG)).toEqual({ skipped: [] });
    const recreated = await product("glide-xl-mousepad");
    expect(recreated?.id).not.toBe(glide?.id);
    expect(recreated?.stock_quantity).toBe(50);
  });

  it("skips a demo product whose SKU an owner's product now holds, without crashing", async () => {
    await query(
      "update products set slug = 'owner-renamed-pad', sku = 'DEMO-PAD-003' where slug = ?",
      ["tempered-glass-mousepad"],
    );
    const { skipped } = await seedCatalog(orm.em.fork(), DEMO_CATALOG);
    expect(skipped).toEqual(["tempered-glass-mousepad"]);
    await seed(LATER_SEED);
    expect(await count("select 1 from products where slug = 'tempered-glass-mousepad'")).toBe(0);
  });

  describe("traffic tables", () => {
    async function productId(): Promise<string> {
      return (await product("pulse-ultralight-mouse"))?.id ?? "";
    }

    it.each([
      [
        "a negative count",
        "insert into traffic_daily_stats (date, source, sessions, product_views, add_to_carts, checkouts_started) values ('2020-01-01', 'direct', -1, 0, 0, 0)",
        /sessions_check|funnel_check/,
      ],
      [
        "a broken funnel",
        "insert into traffic_daily_stats (date, source, sessions, product_views, add_to_carts, checkouts_started) values ('2020-01-01', 'direct', 5, 6, 0, 0)",
        /traffic_daily_stats_funnel_check/,
      ],
      [
        "an unknown source",
        "insert into traffic_daily_stats (date, source, sessions, product_views, add_to_carts, checkouts_started) values ('2020-01-01', 'tv', 1, 0, 0, 0)",
        /traffic_daily_stats_source_check/,
      ],
      [
        "a second row for the same day and source",
        "insert into traffic_daily_stats (date, source, sessions, product_views, add_to_carts, checkouts_started) select date, source, 1, 0, 0, 0 from traffic_daily_stats limit 1",
        /traffic_daily_stats_date_source_unique/,
      ],
    ])("refuses %s per day and source", async (_label, sql, error) => {
      await expect(query(sql)).rejects.toThrow(error);
    });

    it("refuses broken product view rows and a duplicate day", async () => {
      const id = await productId();
      await expect(
        query(
          "insert into product_view_daily_stats (date, product_id, views, add_to_carts) values ('2020-01-01', ?, 1, 2)",
          [id],
        ),
      ).rejects.toThrow(/product_view_daily_stats_funnel_check/);
      await expect(
        query(
          "insert into product_view_daily_stats (date, product_id, views, add_to_carts) values ('2020-01-01', ?, -1, 0)",
          [id],
        ),
      ).rejects.toThrow(/product_view_daily_stats_(views|funnel)_check/);
      await expect(
        query(
          "insert into product_view_daily_stats (date, product_id, views, add_to_carts) select date, product_id, 1, 0 from product_view_daily_stats limit 1",
        ),
      ).rejects.toThrow(/product_view_daily_stats_date_product_id_unique/);
    });

    it("deletes a product's view rows with the product", async () => {
      await query(
        "insert into products (name, slug, price_minor, stock_quantity, status) values ('Temp', 'int-views-temp', 100, 1, 'published')",
      );
      const [temp] = await query<{ id: string }>(
        "select id from products where slug = 'int-views-temp'",
      );
      await query(
        "insert into product_view_daily_stats (date, product_id, views, add_to_carts) values ('2020-01-01', ?, 3, 1)",
        [temp?.id],
      );
      await query("delete from products where id = ?", [temp?.id]);
      expect(
        await count("select 1 from product_view_daily_stats where product_id = ?", [temp?.id]),
      ).toBe(0);
    });

    it("reverts and reapplies the traffic migration without touching orders or products", async () => {
      const tableOf = async (name: string) =>
        (await query<{ name: string | null }>("select to_regclass(?)::text as name", [name]))[0]
          ?.name ?? null;
      const before = await counts();
      await orm.migrator.down({ migrations: [MIGRATION] });
      expect(await tableOf("traffic_daily_stats")).toBeNull();
      expect(await tableOf("product_view_daily_stats")).toBeNull();
      expect(await count("select 1 from orders where public_reference like 'DEMO-%'")).toBe(
        before.demoOrders,
      );
      await orm.migrator.up();
      expect(await tableOf("traffic_daily_stats")).toBe("traffic_daily_stats");
      const diff = await orm.schema.getUpdateSchemaSQL({ wrap: false });
      expect(diff.trim()).toBe("");
    });
  });
});

import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "../cli/cli-orm";
import "../testing/provided-context";
import { DEMO_CATALOG, DatabaseSeeder } from "./DatabaseSeeder";

const MIGRATION = "Migration20261026120000_demo_text_prefix";
const SEED_DATE = new Date("2026-10-26T12:00:00.000Z");
const OWNER_REFERENCE = "CO-7K3MQ-9XZ2A-H4TPC-W8R1N";
const OWNER_PRODUCT = "vortex-wireless-mouse";

/**
 * The one-off demo text update (storefront v2, OA-4a) against PostgreSQL. A database seeded before
 * the prefix was removed still carries "[DEMO] " on its demo rows; the migration removes it from
 * those rows only and changes nothing else (no stock, price, status or owner-made row).
 */
describe("demo text prefix migration (PostgreSQL)", () => {
  let orm: MikroORM;

  async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return orm.em.fork().execute<T[]>(sql, params);
  }

  /** Puts back the prefix an earlier seed stored, and adds one owner-made product and order. */
  async function restoreOldPrefix() {
    await query(`update categories set description = '[DEMO] ' || description`);
    await query(
      `update products set description = '[DEMO] ' || description where sku like 'DEMO-%'`,
    );
    await query(
      `update orders set customer_name = '[DEMO] ' || customer_name where public_reference like 'DEMO-%'`,
    );
    await query(
      `update products set sku = 'OWN-0001', description = '[DEMO] Owner text' where slug = ?`,
      [OWNER_PRODUCT],
    );
    await query(
      `update orders set public_reference = ?, customer_name = '[DEMO] Owner customer'
        where id = (select id from orders where public_reference like 'DEMO-%' order by public_reference limit 1)`,
      [OWNER_REFERENCE],
    );
  }

  /** Everything the migration must leave alone: stock, prices, statuses and the owner's rows. */
  async function guardedState() {
    return {
      products: await query<{
        slug: string;
        stock_quantity: number;
        price_minor: number;
        status: string;
        sku: string | null;
      }>(`select slug, stock_quantity, price_minor, status, sku from products order by slug`),
      orders: await query<{ public_reference: string; status: string; total_minor: number }>(
        `select public_reference, status, total_minor from orders order by public_reference`,
      ),
    };
  }

  /** A digest of every text column the migration may touch. */
  async function textDigest() {
    const [row] = await query<{ categories: string; products: string; orders: string }>(
      `select (select string_agg(description, '|' order by slug) from categories) as categories,
              (select string_agg(description, '|' order by slug) from products) as products,
              (select string_agg(customer_name, '|' order by public_reference) from orders) as orders`,
    );
    return row;
  }

  beforeAll(async () => {
    orm = await initToolingOrm(inject("databaseUrl"));
    await orm.schema.drop({ dropMigrationsTable: true });
    await orm.migrator.up();
    await new DatabaseSeeder(() => SEED_DATE).run(orm.em.fork());
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  it("removes the prefix from seeded demo rows only, and keeps stock, prices and statuses", async () => {
    await restoreOldPrefix();
    const before = await guardedState();

    await orm.migrator.down({ migrations: [MIGRATION] });
    await orm.migrator.up({ migrations: [MIGRATION] });

    const categories = await query<{ slug: string; description: string }>(
      `select slug, description from categories order by slug`,
    );
    expect(categories.map((row) => row.slug)).toEqual(
      DEMO_CATALOG.categories.map((category) => category.slug).sort(),
    );
    for (const category of categories) expect(category.description).not.toMatch(/\[DEMO]/);

    const products = await query<{ slug: string; description: string; sku: string | null }>(
      `select slug, description, sku from products`,
    );
    const owner = products.find((product) => product.slug === OWNER_PRODUCT);
    expect(owner?.description).toBe("[DEMO] Owner text");
    const demoProducts = products.filter((product) => product.sku?.startsWith("DEMO-"));
    expect(demoProducts).toHaveLength(DEMO_CATALOG.products.length - 1);
    for (const product of demoProducts) expect(product.description).not.toMatch(/\[DEMO]/);

    const orders = await query<{ public_reference: string; customer_name: string }>(
      `select public_reference, customer_name from orders`,
    );
    const ownerOrder = orders.find((order) => order.public_reference === OWNER_REFERENCE);
    expect(ownerOrder?.customer_name).toBe("[DEMO] Owner customer");
    const demoOrders = orders.filter((order) => order.public_reference.startsWith("DEMO-"));
    expect(demoOrders.length).toBeGreaterThan(0);
    for (const order of demoOrders) expect(order.customer_name).not.toMatch(/\[DEMO]/);

    expect(await guardedState()).toEqual(before);
  });

  it("is idempotent: a second run changes no text", async () => {
    const before = await textDigest();
    await orm.migrator.down({ migrations: [MIGRATION] });
    await orm.migrator.up({ migrations: [MIGRATION] });
    expect(await textDigest()).toEqual(before);
  });
});

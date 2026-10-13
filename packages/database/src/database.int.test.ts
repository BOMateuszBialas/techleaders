import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm, loadRootEnv } from "./cli/cli-orm";
import { CategorySchema, ProductSchema } from "./entities";
import { DatabaseHealthCheck } from "./health";
import { DatabaseSeeder } from "./seeders/DatabaseSeeder";

loadRootEnv();
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is not set. Copy .env.example to .env and start `npm run db:up`.",
  );
}

describe("database (PostgreSQL)", () => {
  let orm: MikroORM;

  beforeAll(async () => {
    orm = await initToolingOrm(testDatabaseUrl);
    // Start every run from a clean schema, then apply the real migrations.
    await orm.schema.drop({ dropMigrationsTable: true });
    await orm.migrator.up();
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  it("reports the database as healthy", async () => {
    await expect(new DatabaseHealthCheck({ orm }).check()).resolves.toBeUndefined();
  });

  it("has no schema drift between entities and migrations", async () => {
    const diff = await orm.schema.getUpdateSchemaSQL({ wrap: false });
    expect(diff.trim()).toBe("");
  });

  it("seeds repeatably without creating duplicates", async () => {
    await orm.seeder.seed(DatabaseSeeder);
    await orm.seeder.seed(DatabaseSeeder);
    const em = orm.em.fork();
    expect(await em.count(CategorySchema)).toBe(2);
    expect(await em.count(ProductSchema)).toBe(5);
  });

  it("rejects negative prices at the database level", async () => {
    const em = orm.em.fork();
    em.create(ProductSchema, { name: "Broken", slug: "broken-price", priceMinor: -1 });
    await expect(em.flush()).rejects.toThrow(/price_minor_check/);
  });

  it("rejects negative stock at the database level", async () => {
    const em = orm.em.fork();
    em.create(ProductSchema, {
      name: "Broken",
      slug: "broken-stock",
      priceMinor: 100,
      stockQuantity: -5,
    });
    await expect(em.flush()).rejects.toThrow(/stock_quantity_check/);
  });
});

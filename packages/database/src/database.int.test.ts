import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "./cli/cli-orm";
import { createOrmConfig } from "./config";
import { CategorySchema, ProductSchema } from "./entities";
import { DatabaseHealthCheck } from "./adapters/database-health-check";
import { DEMO_CATALOG, DatabaseSeeder } from "./seeders/DatabaseSeeder";
import "./testing/provided-context";

const testDatabaseUrl = inject("databaseUrl");

/** Nothing listens here in the dev/CI setup, so connecting fails fast. */
const UNUSED_PORT = 5999;

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

  // Regression: the app builds the ORM lazily (no connect() call), and the
  // health check used to report "down" until something else opened the pool.
  it("reports a lazily created ORM (as built by the app container) as healthy", async () => {
    const lazyOrm = new MikroORM(createOrmConfig({ databaseUrl: testDatabaseUrl }));
    try {
      await expect(new DatabaseHealthCheck({ orm: lazyOrm }).check()).resolves.toBeUndefined();
    } finally {
      await lazyOrm.close(true);
    }
  });

  it("fails the health check when the database is unreachable", async () => {
    const unreachable = new URL(testDatabaseUrl);
    unreachable.port = String(UNUSED_PORT);
    const unreachableOrm = new MikroORM(createOrmConfig({ databaseUrl: unreachable.toString() }));
    try {
      await expect(new DatabaseHealthCheck({ orm: unreachableOrm }).check()).rejects.toThrow();
    } finally {
      await unreachableOrm.close(true);
    }
  });

  it("has no schema drift between entities and migrations", async () => {
    const diff = await orm.schema.getUpdateSchemaSQL({ wrap: false });
    expect(diff.trim()).toBe("");
  });

  it("seeds repeatably without creating duplicates", async () => {
    await orm.seeder.seed(DatabaseSeeder);
    await orm.seeder.seed(DatabaseSeeder);
    const em = orm.em.fork();
    expect(await em.count(CategorySchema)).toBe(DEMO_CATALOG.categories.length);
    expect(await em.count(ProductSchema)).toBe(DEMO_CATALOG.products.length);
  });

  it("defaults a product's featured flag to false and seeds the featured demo products", async () => {
    const em = orm.em.fork();
    const [inserted] = await em.execute<{ featured: boolean }[]>(
      `insert into products (name, slug, price_minor) values ('Plain', 'plain-featured-default', 100) returning featured`,
    );
    expect(inserted?.featured).toBe(false);

    await orm.seeder.seed(DatabaseSeeder);
    const featured = await em
      .fork()
      .find(ProductSchema, { featured: true }, { orderBy: { slug: "asc" } });
    expect(featured.map((product) => product.slug)).toEqual(
      DEMO_CATALOG.products
        .filter((product) => product.featured)
        .map((product) => product.slug)
        .sort(),
    );
  });

  it("rejects negative prices at the database level", async () => {
    const em = orm.em.fork();
    em.create(ProductSchema, { name: "Broken", slug: "broken-price", priceMinor: -1 });
    await expect(em.flush()).rejects.toThrow(/price_minor_check/);
  });

  it("creates the admin auth tables with the owner-only role check", async () => {
    const em = orm.em.fork();
    const [user] = await em.execute<{ id: string; role: string }[]>(
      `insert into admin_users (name, email, email_verified) values ('Store owner', 'owner@db.test', true) returning id, role`,
    );
    expect(user?.role).toBe("owner");
    await expect(
      em.execute(
        `insert into admin_users (name, email, email_verified, role) values ('x', 'staff@db.test', true, 'staff')`,
      ),
    ).rejects.toThrow(/admin_users_role_check/);
  });

  it("deletes an admin user's sessions and accounts with the user", async () => {
    const em = orm.em.fork();
    const [user] = await em.execute<{ id: string }[]>(
      `insert into admin_users (name, email, email_verified) values ('Store owner', 'cascade@db.test', true) returning id`,
    );
    const userId = user!.id;
    await em.execute(
      `insert into admin_sessions (user_id, token, expires_at) values (?, 'tok-cascade', now() + interval '1 hour')`,
      [userId],
    );
    await em.execute(
      `insert into admin_accounts (user_id, account_id, provider_id, password) values (?, ?, 'credential', 'hash')`,
      [userId, userId],
    );
    await em.execute(`delete from admin_users where id = ?`, [userId]);
    const [counts] = await em.execute<{ sessions: string; accounts: string }[]>(
      `select (select count(*) from admin_sessions where user_id = ?) as sessions, (select count(*) from admin_accounts where user_id = ?) as accounts`,
      [userId, userId],
    );
    expect([Number(counts?.sessions), Number(counts?.accounts)]).toEqual([0, 0]);
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

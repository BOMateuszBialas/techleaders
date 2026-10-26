import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "./cli/cli-orm";
import { createOrmConfig } from "./config";
import { CategorySchema, ProductSchema } from "./entities";
import { DatabaseHealthCheck } from "./adapters/database-health-check";
import { DEMO_CATALOG, DatabaseSeeder } from "./seeders/DatabaseSeeder";
import "./testing/provided-context";

const testDatabaseUrl = inject("databaseUrl");

const ORDERS_CUSTOMER_MIGRATION = "Migration20261024193652_orders_customer";

/** A minimal pending order row; `customerId` null is a guest order. Returns the order id. */
async function insertOrder(orm: MikroORM, customerId: string | null): Promise<string> {
  const [row] = await orm.em.fork().execute<{ id: string }[]>(
    `insert into orders (public_reference, idempotency_key, request_fingerprint, customer_name,
      customer_email, shipping_line1, shipping_city, shipping_postal_code, shipping_country,
      currency, subtotal_minor, total_minor, customer_id)
      values (concat('CO-', substr(md5(random()::text), 1, 20)), gen_random_uuid(), 'fp',
        'Test Buyer', 'buyer@db.test', 'Street 1', 'Warsaw', '00-001', 'PL', 'PLN', 100, 100, ?)
      returning id`,
    [customerId],
  );
  return row!.id;
}

async function insertCustomer(orm: MikroORM, email: string): Promise<string> {
  const [row] = await orm.em
    .fork()
    .execute<{ id: string }[]>(
      `insert into customer_users (name, email, email_verified) values ('Customer', ?, false) returning id`,
      [email],
    );
  return row!.id;
}

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

  it("defaults a product's technical specs to an empty array (storefront v2 Phase 3, Q10)", async () => {
    const [inserted] = await orm.em
      .fork()
      .execute<{ technical_specs: unknown }[]>(
        `insert into products (name, slug, price_minor) values ('No specs', 'no-technical-specs', 100) returning technical_specs`,
      );
    expect(inserted?.technical_specs).toEqual([]);
  });

  it("stores technical specs as a jsonb array of label and value rows", async () => {
    const rows = [{ label: "Sensor", value: "Optical" }];
    const [inserted] = await orm.em
      .fork()
      .execute<{ technical_specs: unknown }[]>(
        `insert into products (name, slug, price_minor, technical_specs) values ('Specs', 'with-technical-specs', 100, ?::jsonb) returning technical_specs`,
        [JSON.stringify(rows)],
      );
    expect(inserted?.technical_specs).toEqual(rows);
  });

  it("rejects technical specs that are not a json array", async () => {
    const em = orm.em.fork();
    await expect(
      em.execute(
        `insert into products (name, slug, price_minor, technical_specs) values ('Bad', 'bad-technical-specs', 100, ?::jsonb)`,
        [JSON.stringify({ label: "Sensor", value: "Optical" })],
      ),
    ).rejects.toThrow(/products_technical_specs_check/);
  });

  it("rejects a null for technical specs (the column is not nullable)", async () => {
    await expect(
      orm.em
        .fork()
        .execute(
          `insert into products (name, slug, price_minor, technical_specs) values ('Null', 'null-technical-specs', 100, null)`,
        ),
    ).rejects.toThrow(/technical_specs/);
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

  it("creates the customer auth tables with the customer-only role check (E07 A1)", async () => {
    const em = orm.em.fork();
    const [user] = await em.execute<{ id: string; role: string }[]>(
      `insert into customer_users (name, email, email_verified) values ('Customer', 'customer@db.test', false) returning id, role`,
    );
    expect(user?.role).toBe("customer");
    for (const role of ["owner", "admin", ""]) {
      await expect(
        em.execute(
          `insert into customer_users (name, email, email_verified, role) values ('Customer', ?, false, ?)`,
          [`${role || "blank"}@db.test`, role],
        ),
      ).rejects.toThrow(/customer_users_role_check/);
    }
    await expect(
      em.execute(`update customer_users set role = 'owner' where id = ?`, [user!.id]),
    ).rejects.toThrow(/customer_users_role_check/);
    await expect(
      em.execute(
        `insert into customer_users (name, email, email_verified) values ('Customer', 'customer@db.test', false)`,
      ),
    ).rejects.toThrow(/customer_users_email_unique/);
  });

  it("keeps customer and admin identities apart and cascades a customer's sessions and accounts", async () => {
    const em = orm.em.fork();
    // The same email may be an owner and a customer: different identities in different tables (A19).
    await em.execute(
      `insert into admin_users (name, email, email_verified) values ('Store owner', 'both@db.test', true)`,
    );
    const [user] = await em.execute<{ id: string }[]>(
      `insert into customer_users (name, email, email_verified) values ('Customer', 'both@db.test', false) returning id`,
    );
    const userId = user!.id;
    // A customer id never satisfies the admin tables' foreign keys.
    await expect(
      em.execute(
        `insert into admin_sessions (user_id, token, expires_at) values (?, 'tok-cross', now() + interval '1 hour')`,
        [userId],
      ),
    ).rejects.toThrow(/admin_sessions_user_id_foreign/);
    await em.execute(
      `insert into customer_sessions (user_id, token, expires_at) values (?, 'tok-customer', now() + interval '1 hour')`,
      [userId],
    );
    await em.execute(
      `insert into customer_accounts (user_id, account_id, provider_id, password) values (?, ?, 'credential', 'hash')`,
      [userId, userId],
    );
    await em.execute(`delete from customer_users where id = ?`, [userId]);
    const [counts] = await em.execute<{ sessions: string; accounts: string }[]>(
      `select (select count(*) from customer_sessions where user_id = ?) as sessions, (select count(*) from customer_accounts where user_id = ?) as accounts`,
      [userId, userId],
    );
    expect([Number(counts?.sessions), Number(counts?.accounts)]).toEqual([0, 0]);
  });

  // Additive migration (BACKWARD_COMPATIBILITY §5): `down` drops only the five customer tables and
  // leaves the owner's tables intact; `up` reapplies it without drift.
  it("reverts and reapplies the customer auth migration without touching other tables", async () => {
    const tables = ["users", "sessions", "accounts", "verifications", "rate_limits"].map(
      (name) => `customer_${name}`,
    );
    const existing = async () => {
      const found: string[] = [];
      for (const table of tables) {
        const [row] = await orm.em
          .fork()
          .execute<{ name: string | null }[]>("select to_regclass(?)::text as name", [table]);
        if (row?.name) found.push(row.name);
      }
      return found;
    };
    const owners = async () =>
      orm.em.fork().execute<{ email: string }[]>("select email from admin_users order by email");
    const ownersBefore = await owners();
    expect(await existing()).toEqual(tables);

    // Phase 1 rolls back only after Phase 2 (its `orders.customer_id` foreign key). While that
    // key exists, the customer_auth `down` fails instead of dropping it.
    await expect(
      orm.migrator.down({ migrations: ["Migration20261024181620_customer_auth"] }),
    ).rejects.toThrow(/other objects depend on it/);
    expect(await existing()).toEqual(tables);
    await orm.migrator.down({ migrations: [ORDERS_CUSTOMER_MIGRATION] });

    // Any other foreign key into customer_users blocks the rollback too: no `cascade` may drop
    // it silently (rollback plan, D-d).
    const em = orm.em.fork();
    const [customer] = await em.execute<{ id: string }[]>(
      `insert into customer_users (name, email, email_verified) values ('Customer', 'fk-probe@db.test', false) returning id`,
    );
    await em.execute(
      `create table fk_probe (customer_id uuid not null references customer_users (id) on delete restrict)`,
    );
    await em.execute(`insert into fk_probe (customer_id) values (?)`, [customer!.id]);
    await expect(
      orm.migrator.down({ migrations: ["Migration20261024181620_customer_auth"] }),
    ).rejects.toThrow(/other objects depend on it/);
    expect(await existing()).toEqual(tables);
    await em.execute(`drop table fk_probe`);

    await orm.migrator.down({ migrations: ["Migration20261024181620_customer_auth"] });
    expect(await existing()).toEqual([]);
    expect(await owners()).toEqual(ownersBefore);

    await orm.migrator.up();
    expect(await existing()).toEqual(tables);
    const diff = await orm.schema.getUpdateSchemaSQL({ wrap: false });
    expect(diff.trim()).toBe("");
  });

  it("links an order to an existing customer only and never deletes a customer with orders (E07 Phase 2)", async () => {
    const em = orm.em.fork();
    await expect(insertOrder(orm, "00000000-0000-4000-8000-000000000000")).rejects.toThrow(
      /orders_customer_id_foreign/,
    );
    const customerId = await insertCustomer(orm, "restrict@db.test");
    const orderId = await insertOrder(orm, customerId);
    // `on delete restrict`: the order never turns into a guest order (spec Data Model).
    await expect(
      em.execute(`delete from customer_users where id = ?`, [customerId]),
    ).rejects.toThrow(/orders_customer_id_foreign/);
    const [row] = await em.execute<{ customer_id: string | null }[]>(
      `select customer_id from orders where id = ?`,
      [orderId],
    );
    expect(row?.customer_id).toBe(customerId);
    await em.execute(`delete from orders where id = ?`, [orderId]);
    await em.execute(`delete from customer_users where id = ?`, [customerId]);
  });

  describe("orders_customer migration rollback (owner decision D-d)", () => {
    const columnExists = async () => {
      const rows = await orm.em
        .fork()
        .execute<{ found: boolean }[]>(
          `select exists (select 1 from information_schema.columns where table_name = 'orders' and column_name = 'customer_id') as found`,
        );
      return rows[0]?.found;
    };
    const indexAndKey = async () =>
      orm.em.fork().execute<{ name: string }[]>(
        `select indexname as name from pg_indexes where indexname = 'orders_customer_id_created_at_index'
            union all select conname from pg_constraint where conname = 'orders_customer_id_foreign'`,
      );
    const orderRows = async () =>
      orm.em
        .fork()
        .execute<{ id: string; total_minor: number }[]>(
          "select id, total_minor from orders order by id",
        );

    it("reverts and reapplies with guest-only orders, keeping the data intact", async () => {
      await insertOrder(orm, null);
      const before = await orderRows();
      expect(before.length).toBeGreaterThan(0);

      await orm.migrator.down({ migrations: [ORDERS_CUSTOMER_MIGRATION] });
      expect(await columnExists()).toBe(false);
      expect(await indexAndKey()).toEqual([]);
      expect(await orderRows()).toEqual(before);

      await orm.migrator.up();
      expect(await columnExists()).toBe(true);
      expect(await orderRows()).toEqual(before);
      const diff = await orm.schema.getUpdateSchemaSQL({ wrap: false });
      expect(diff.trim()).toBe("");
    });

    it("refuses to revert while an account order exists, and changes nothing", async () => {
      const customerId = await insertCustomer(orm, "rollback@db.test");
      const orderId = await insertOrder(orm, customerId);
      const before = await orderRows();
      const constraintsBefore = await indexAndKey();
      expect(constraintsBefore).toHaveLength(2);

      await expect(orm.migrator.down({ migrations: [ORDERS_CUSTOMER_MIGRATION] })).rejects.toThrow(
        /orders_customer down refused: account orders exist; roll forward instead/,
      );

      expect(await columnExists()).toBe(true);
      expect(await indexAndKey()).toEqual(constraintsBefore);
      expect(await orderRows()).toEqual(before);
      const [row] = await orm.em
        .fork()
        .execute<{ customer_id: string | null }[]>(`select customer_id from orders where id = ?`, [
          orderId,
        ]);
      expect(row?.customer_id).toBe(customerId);
      const executed = await orm.migrator.getExecuted();
      expect(executed.map((migration) => migration.name)).toContain(ORDERS_CUSTOMER_MIGRATION);

      const em = orm.em.fork();
      await em.execute(`delete from orders where id = ?`, [orderId]);
      await em.execute(`delete from customer_users where id = ?`, [customerId]);
    });
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

  // The stock history migration is additive (BACKWARD_COMPATIBILITY §5): its `down` drops only
  // `stock_adjustments`, leaves the products and their stock intact, and `up` reapplies it.
  it("reverts and reapplies the stock history migration without touching products", async () => {
    const tableOf = async (name: string) => {
      const [row] = await orm.em
        .fork()
        .execute<{ name: string | null }[]>("select to_regclass(?)::text as name", [name]);
      return row?.name ?? null;
    };
    const products = async () =>
      orm.em
        .fork()
        .execute<{ slug: string; stock_quantity: number }[]>(
          "select slug, stock_quantity from products order by slug",
        );
    const before = await products();
    expect(before.length).toBeGreaterThan(0);
    expect(await tableOf("stock_adjustments")).toBe("stock_adjustments");

    await orm.migrator.down({ migrations: ["Migration20261016115407_stock_adjustments"] });
    expect(await tableOf("stock_adjustments")).toBeNull();
    expect(await products()).toEqual(before);

    await orm.migrator.up();
    expect(await tableOf("stock_adjustments")).toBe("stock_adjustments");
    const diff = await orm.schema.getUpdateSchemaSQL({ wrap: false });
    expect(diff.trim()).toBe("");
  });
});

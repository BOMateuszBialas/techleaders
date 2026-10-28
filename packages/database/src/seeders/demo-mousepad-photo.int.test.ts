import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import type { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "../cli/cli-orm";
import "../testing/provided-context";
import { Migration20261027090000_demo_mousepad_photo } from "../migrations/Migration20261027090000_demo_mousepad_photo";
import { DatabaseSeeder } from "./DatabaseSeeder";

const MIGRATION = "Migration20261027090000_demo_mousepad_photo";
const SEED_DATE = new Date("2026-10-27T12:00:00.000Z");
const OWNER_IMAGE = "https://example.com/owner-mousepad.jpg";

const GLIDE = { slug: "glide-xl-mousepad", sku: "DEMO-PAD-001" };
const CONTROL = { slug: "control-cloth-mousepad", sku: "DEMO-PAD-002" };

const GLIDE_SVG = "/demo/products/glide-xl-mousepad.svg";
const GLIDE_PHOTO = "/photos/product-mouse-pad.jpg";

/**
 * The one-off Glide XL mousepad photo (OA-4b follow-up) against PostgreSQL. A database seeded before
 * the photo rule still carries the demo SVG; the migration sets the photo on that seeded row only,
 * never over an owner's edit, and never touches stock, prices, statuses or orders.
 */
describe("demo mousepad photo migration (PostgreSQL)", () => {
  let orm: MikroORM;

  async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return orm.em.fork().execute<T[]>(sql, params);
  }

  /** The SQL the migration's `up` (or `down`) runs, so a second run can be replayed exactly. */
  function migrationSql(direction: "up" | "down"): string[] {
    const migration = new Migration20261027090000_demo_mousepad_photo(
      orm.em.getDriver(),
      orm.config,
    );
    migration[direction]();
    return migration.getQueries().filter((sql): sql is string => typeof sql === "string");
  }

  async function runSql(statements: string[]) {
    for (const statement of statements) await query(statement);
  }

  async function imageRows() {
    return query<{ slug: string; sku: string | null; image_url: string | null }>(
      `select slug, sku, image_url from products where sku like 'DEMO-%' order by slug`,
    );
  }

  /** Everything the migration must leave alone: stock, prices, statuses and orders. */
  async function guardedState() {
    return {
      products: await query<{
        slug: string;
        stock_quantity: number;
        price_minor: number;
        status: string;
      }>(`select slug, stock_quantity, price_minor, status from products order by slug`),
      orders: await query<{ public_reference: string; status: string; total_minor: number }>(
        `select public_reference, status, total_minor from orders order by public_reference`,
      ),
    };
  }

  /** A digest of the column the migration may touch. */
  async function imageDigest() {
    const [row] = await query<{ digest: string }>(
      `select string_agg(slug || '|' || coalesce(image_url, ''), ',' order by slug) as digest
         from products`,
    );
    return row?.digest;
  }

  function imageOf(rows: Awaited<ReturnType<typeof imageRows>>, slug: string) {
    const row = rows.find((candidate) => candidate.slug === slug);
    if (!row) throw new Error(`Seeded product ${slug} is missing`);
    return row.image_url;
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

  // Each case starts from the state of a database seeded before the photo rule.
  beforeEach(async () => {
    await query(`update products set image_url = ? where sku = ?`, [GLIDE_SVG, GLIDE.sku]);
  });

  it("sets the photo on the seeded Glide XL mousepad and changes nothing else", async () => {
    // Puts the database back to the state before this update.
    await orm.migrator.down({ migrations: [MIGRATION] });
    expect(imageOf(await imageRows(), GLIDE.slug)).toBe(GLIDE_SVG);
    const before = await guardedState();
    const beforeImages = await imageRows();

    await orm.migrator.up({ migrations: [MIGRATION] });

    const rows = await imageRows();
    expect(imageOf(rows, GLIDE.slug)).toBe(GLIDE_PHOTO);
    expect(imageOf(rows, CONTROL.slug)).toBe(imageOf(beforeImages, CONTROL.slug));
    expect(await guardedState()).toEqual(before);
  });

  it("keeps an owner's own image on the Glide XL mousepad", async () => {
    await orm.migrator.down({ migrations: [MIGRATION] });
    await query(`update products set image_url = ? where sku = ?`, [OWNER_IMAGE, GLIDE.sku]);

    await orm.migrator.up({ migrations: [MIGRATION] });
    expect(imageOf(await imageRows(), GLIDE.slug)).toBe(OWNER_IMAGE);

    await orm.migrator.down({ migrations: [MIGRATION] });
    expect(imageOf(await imageRows(), GLIDE.slug)).toBe(OWNER_IMAGE);
  });

  it("is idempotent: replaying the up statements changes nothing", async () => {
    await orm.migrator.up({ migrations: [MIGRATION] });
    expect(imageOf(await imageRows(), GLIDE.slug)).toBe(GLIDE_PHOTO);

    const before = await imageDigest();
    await runSql(migrationSql("up"));
    expect(await imageDigest()).toEqual(before);
  });

  it("down reverses only the value up wrote, and replaying it changes nothing", async () => {
    await orm.migrator.down({ migrations: [MIGRATION] });
    await orm.migrator.up({ migrations: [MIGRATION] });
    expect(imageOf(await imageRows(), GLIDE.slug)).toBe(GLIDE_PHOTO);

    await orm.migrator.down({ migrations: [MIGRATION] });

    expect(imageOf(await imageRows(), GLIDE.slug)).toBe(GLIDE_SVG);

    const before = await imageDigest();
    await runSql(migrationSql("down"));
    expect(await imageDigest()).toEqual(before);
  });
});

import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "../cli/cli-orm";
import { DatabaseCatalogRepository } from "../adapters/database-catalog-repository";
import "../testing/provided-context";
import type { Migration20261027100000_category_image } from "../migrations/Migration20261027100000_category_image";
import { Migration20261027100100_demo_category_images } from "../migrations/Migration20261027100100_demo_category_images";
import { DatabaseSeeder } from "./DatabaseSeeder";

const SCHEMA_MIGRATION = "Migration20261027100000_category_image";
const DATA_MIGRATION = "Migration20261027100100_demo_category_images";
const SEED_DATE = new Date("2026-10-27T12:00:00.000Z");
const OWNER_IMAGE = "https://example.com/owner-category.jpg";

const PHOTOS: Record<string, string> = {
  mice: "/photos/category-mice.jpg",
  keyboards: "/photos/product-keyboard-rgb.jpg",
  headsets: "/photos/category-headsets.jpg",
  controllers: "/photos/category-controllers.jpg",
  mousepads: "/photos/category-mouse-pads.jpg",
};

/**
 * The category photo change (OA-11a schema, OA-4c data) against PostgreSQL. A database seeded
 * before the column existed has null `image_url` on the demo categories; the data update sets the
 * seeded photos only where the column is still null, never over an owner's photo, and changes no
 * other value (names, descriptions, products, stock, prices, statuses, orders).
 */
describe("category image migrations (PostgreSQL)", () => {
  let orm: MikroORM;

  async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return orm.em.fork().execute<T[]>(sql, params);
  }

  /** The SQL a migration's `up` or `down` runs, so a second run can be replayed exactly. */
  function migrationSql(
    migrationClass:
      | typeof Migration20261027100000_category_image
      | typeof Migration20261027100100_demo_category_images,
    direction: "up" | "down",
  ): string[] {
    const migration = new migrationClass(orm.em.getDriver(), orm.config);
    migration[direction]();
    return migration.getQueries().filter((sql): sql is string => typeof sql === "string");
  }

  async function runSql(statements: string[]) {
    for (const statement of statements) await query(statement);
  }

  async function imageRows() {
    return query<{ slug: string; image_url: string | null }>(
      `select slug, image_url from categories order by slug`,
    );
  }

  /** Everything the data update must leave alone. */
  async function guardedState() {
    return {
      categories: await query<{ slug: string; name: string; description: string | null }>(
        `select slug, name, description from categories order by slug`,
      ),
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

  async function imageDigest() {
    const [row] = await query<{ digest: string }>(
      `select string_agg(slug || '|' || coalesce(image_url, '<null>'), ',' order by slug) as digest from categories`,
    );
    return row?.digest;
  }

  function imageOf(rows: Awaited<ReturnType<typeof imageRows>>, slug: string) {
    const row = rows.find((candidate) => candidate.slug === slug);
    if (!row) throw new Error(`Seeded category ${slug} is missing`);
    return row.image_url;
  }

  beforeAll(async () => {
    orm = await initToolingOrm(inject("databaseUrl"));
    await orm.schema.drop({ dropMigrationsTable: true });
    await orm.migrator.up();
    await new DatabaseSeeder(() => SEED_DATE).run(orm.em.fork());
    // An earlier seed: the demo categories have no photo yet.
    await orm.migrator.down({ migrations: [DATA_MIGRATION] });
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  it("the schema migration adds a nullable image_url of 2048 characters", async () => {
    const [column] = await query<{ is_nullable: string; character_maximum_length: number }>(
      `select is_nullable, character_maximum_length from information_schema.columns
        where table_name = 'categories' and column_name = 'image_url'`,
    );
    expect(column).toEqual({ is_nullable: "YES", character_maximum_length: 2048 });
  });

  it("sets the seeded demo photos where the column is null, keeps owner photos and changes nothing else", async () => {
    for (const slug of Object.keys(PHOTOS)) {
      expect(imageOf(await imageRows(), slug)).toBeNull();
    }
    // An owner's photo on one demo category must survive the update.
    await query(`update categories set image_url = ? where slug = 'keyboards'`, [OWNER_IMAGE]);
    const before = await guardedState();

    await orm.migrator.up({ migrations: [DATA_MIGRATION] });

    const rows = await imageRows();
    expect(imageOf(rows, "mice")).toBe(PHOTOS.mice);
    expect(imageOf(rows, "headsets")).toBe(PHOTOS.headsets);
    expect(imageOf(rows, "controllers")).toBe(PHOTOS.controllers);
    expect(imageOf(rows, "mousepads")).toBe(PHOTOS.mousepads);
    expect(imageOf(rows, "keyboards")).toBe(OWNER_IMAGE);
    // The seed's other categories are not in the update's scope (no monitors category exists).
    expect(rows.map((row) => row.slug)).not.toContain("monitors");
    expect(await guardedState()).toEqual(before);
  });

  it("the catalog read path carries the photo to the home tiles", async () => {
    const counts = await new DatabaseCatalogRepository({
      em: orm.em.fork(),
    }).countPublishedProductsByCategory();
    expect(counts.find((count) => count.slug === "mice")?.imageUrl).toBe(PHOTOS.mice);
    expect(counts.find((count) => count.slug === "keyboards")?.imageUrl).toBe(OWNER_IMAGE);
  });

  it("is idempotent: replaying the up statements changes nothing", async () => {
    const before = await imageDigest();
    await runSql(migrationSql(Migration20261027100100_demo_category_images, "up"));
    expect(await imageDigest()).toEqual(before);
  });

  it("down reverses only the values up wrote, and replaying it changes nothing", async () => {
    await orm.migrator.down({ migrations: [DATA_MIGRATION] });

    const rows = await imageRows();
    for (const slug of ["mice", "headsets", "controllers", "mousepads"]) {
      expect(imageOf(rows, slug)).toBeNull();
    }
    expect(imageOf(rows, "keyboards")).toBe(OWNER_IMAGE);

    const before = await imageDigest();
    await runSql(migrationSql(Migration20261027100100_demo_category_images, "down"));
    expect(await imageDigest()).toEqual(before);
  });

  it("the schema migration's down drops the column and its up adds it back", async () => {
    await orm.migrator.down({ migrations: [SCHEMA_MIGRATION] });
    const [gone] = await query<{ count: number }>(
      `select count(*)::int as count from information_schema.columns
        where table_name = 'categories' and column_name = 'image_url'`,
    );
    expect(gone?.count).toBe(0);

    await orm.migrator.up({ migrations: [SCHEMA_MIGRATION] });
    const [back] = await query<{ count: number }>(
      `select count(*)::int as count from information_schema.columns
        where table_name = 'categories' and column_name = 'image_url'`,
    );
    expect(back?.count).toBe(1);
  });
});

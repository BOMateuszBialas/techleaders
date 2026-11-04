import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "../cli/cli-orm";
import "../testing/provided-context";
import { Migration20261104090000_demo_collection_photos } from "../migrations/Migration20261104090000_demo_collection_photos";
import { DatabaseSeeder } from "./DatabaseSeeder";

const SEED_DATE = new Date("2026-11-04T09:00:00.000Z");
const OWNER_IMAGE = "https://example.com/owner-pulse.jpg";

const MOUSE_PHOTO = "/photos/product-mouse-black.jpg";
const CONTROLLER_PHOTO = "/photos/category-controllers.jpg";

/**
 * The collection photos (storefront refresh, 2026-11-04) against PostgreSQL. A database seeded
 * before the change still carries the demo SVG for these products; the migration gives each
 * seeded product its collection photo, never over an owner's edit, and never touches stock,
 * prices, statuses or orders.
 */
describe("demo collection photos migration (PostgreSQL)", () => {
  let orm: MikroORM;

  async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return orm.em.fork().execute<T[]>(sql, params);
  }

  /** The SQL the migration's `up` (or `down`) runs, so a second run can be replayed exactly. */
  function migrationSql(direction: "up" | "down"): string[] {
    const migration = new Migration20261104090000_demo_collection_photos(
      orm.em.getDriver(),
      orm.config,
    );
    migration[direction]();
    return migration.getQueries().filter((sql): sql is string => typeof sql === "string");
  }

  async function runSql(statements: string[]) {
    for (const statement of statements) await query(statement);
  }

  async function imageOf(slug: string): Promise<string | null> {
    const [row] = await query<{ image_url: string | null }>(
      `select image_url from products where slug = ?`,
      [slug],
    );
    if (!row) throw new Error(`Seeded product ${slug} is missing`);
    return row.image_url;
  }

  /** Puts a product back to the pre-change state (the seeded SVG path). */
  async function restoreSvg(slug: string) {
    await query(`update products set image_url = ? where slug = ?`, [
      `/demo/products/${slug}.svg`,
      slug,
    ]);
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

  beforeAll(async () => {
    orm = await initToolingOrm(inject("databaseUrl"));
    await orm.schema.drop({ dropMigrationsTable: true });
    await orm.migrator.up();
    await new DatabaseSeeder(() => SEED_DATE).run(orm.em.fork());
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  it("gives each seeded demo product in a collection its collection photo", async () => {
    await restoreSvg("pulse-ultralight-mouse");
    await restoreSvg("apex-wireless-controller");
    await restoreSvg("control-cloth-mousepad");
    await runSql(migrationSql("up"));

    expect(await imageOf("pulse-ultralight-mouse")).toBe(MOUSE_PHOTO);
    expect(await imageOf("apex-wireless-controller")).toBe(CONTROLLER_PHOTO);
    expect(await imageOf("control-cloth-mousepad")).toBe("/photos/product-mouse-pad.jpg");
  });

  it("is idempotent: a second run matches no row", async () => {
    const before = await query<{ digest: string }>(
      `select string_agg(slug || '|' || coalesce(image_url, ''), ',' order by slug) as digest from products`,
    );
    await runSql(migrationSql("up"));
    const after = await query<{ digest: string }>(
      `select string_agg(slug || '|' || coalesce(image_url, ''), ',' order by slug) as digest from products`,
    );
    expect(after).toEqual(before);
  });

  it("never overwrites an owner's photo", async () => {
    await query(`update products set image_url = ? where slug = ?`, [
      OWNER_IMAGE,
      "titan-mmo-mouse",
    ]);
    await restoreSvg("pulse-ultralight-mouse");
    await runSql(migrationSql("up"));

    expect(await imageOf("titan-mmo-mouse")).toBe(OWNER_IMAGE);
    expect(await imageOf("pulse-ultralight-mouse")).toBe(MOUSE_PHOTO);
  });

  it("leaves stock, prices, statuses and orders untouched", async () => {
    const before = await guardedState();
    await restoreSvg("strike-60-keyboard");
    await runSql(migrationSql("up"));
    await runSql(migrationSql("down"));
    expect(await guardedState()).toEqual(before);
  });

  it("down puts back the SVG only where the migration wrote the photo", async () => {
    await restoreSvg("drift-wireless-headset");
    await runSql(migrationSql("up"));
    expect(await imageOf("drift-wireless-headset")).toBe("/photos/product-headset-black.jpg");

    await runSql(migrationSql("down"));
    expect(await imageOf("drift-wireless-headset")).toBe(
      "/demo/products/drift-wireless-headset.svg",
    );
    expect(await imageOf("titan-mmo-mouse")).toBe(OWNER_IMAGE);
  });
});

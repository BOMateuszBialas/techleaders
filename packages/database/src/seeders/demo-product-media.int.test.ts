import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "../cli/cli-orm";
import "../testing/provided-context";
import { Migration20261026180000_demo_product_media } from "../migrations/Migration20261026180000_demo_product_media";
import { DatabaseSeeder } from "./DatabaseSeeder";

const MIGRATION = "Migration20261026180000_demo_product_media";
const SEED_DATE = new Date("2026-10-26T12:00:00.000Z");
const OWNER_IMAGE = "https://example.com/owner-photo.jpg";

const MOUSE = { slug: "vortex-wireless-mouse", sku: "DEMO-MOU-001" };
const KEYBOARD = { slug: "nova-tkl-mechanical-keyboard", sku: "DEMO-KEY-001" };
const HEADSET = { slug: "echo-surround-headset", sku: "DEMO-HEA-001" };
const UNMAPPED = { slug: "pulse-ultralight-mouse", sku: "DEMO-MOU-002" };

const SVG = {
  mouse: "/demo/products/vortex-wireless-mouse.svg",
  keyboard: "/demo/products/nova-tkl-mechanical-keyboard.svg",
  headset: "/demo/products/echo-surround-headset.svg",
};
const MOUSE_SPECS = [
  { label: "Switch type", value: "Optical-mechanical (fictional)" },
  { label: "Connection", value: "2.4 GHz wireless and USB-C (fictional)" },
  { label: "Weight", value: "65 g (fictional)" },
  { label: "Dimensions", value: "118 × 62 × 38 mm (fictional)" },
  { label: "Warranty", value: "24 months (fictional, AS-10)" },
];

/**
 * The one-off demo product media update (storefront v2, OA-4b) against PostgreSQL. A database
 * seeded before the photo rule still carries the SVG paths and empty technical rows; the migration
 * sets the photos and the Vortex rows on the seeded demo rows only, never over an owner's edit, and
 * never touches stock, prices, statuses or orders.
 */
describe("demo product media migration (PostgreSQL)", () => {
  let orm: MikroORM;

  async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return orm.em.fork().execute<T[]>(sql, params);
  }

  /** The SQL the migration's `up` (or `down`) runs, so a second run can be replayed exactly. */
  function migrationSql(direction: "up" | "down"): string[] {
    const migration = new Migration20261026180000_demo_product_media(
      orm.em.getDriver(),
      orm.config,
    );
    migration[direction]();
    return migration.getQueries().filter((sql): sql is string => typeof sql === "string");
  }

  async function runSql(statements: string[]) {
    for (const statement of statements) await query(statement);
  }

  async function mediaRows() {
    return query<{
      slug: string;
      sku: string | null;
      image_url: string | null;
      technical_specs: unknown;
    }>(
      `select slug, sku, image_url, technical_specs from products where sku like 'DEMO-%' order by slug`,
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

  /** A digest of the two columns the migration may touch. */
  async function mediaDigest() {
    const [row] = await query<{ digest: string }>(
      `select string_agg(slug || '|' || coalesce(image_url, '') || '|' || technical_specs::text,
                         ',' order by slug) as digest
         from products`,
    );
    return row?.digest;
  }

  function rowFor(rows: Awaited<ReturnType<typeof mediaRows>>, slug: string) {
    const row = rows.find((candidate) => candidate.slug === slug);
    if (!row) throw new Error(`Seeded product ${slug} is missing`);
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

  it("sets the photos and the Vortex technical rows, keeps owner edits and changes nothing else", async () => {
    // Puts the database back to the state before this update.
    await orm.migrator.down({ migrations: [MIGRATION] });
    const oldRows = await mediaRows();
    expect(rowFor(oldRows, MOUSE.slug)).toMatchObject({
      image_url: SVG.mouse,
      technical_specs: [],
    });
    expect(rowFor(oldRows, KEYBOARD.slug).image_url).toBe(SVG.keyboard);
    expect(rowFor(oldRows, HEADSET.slug).image_url).toBe(SVG.headset);

    // An owner's own image on one mapped product must survive the update.
    await query(`update products set image_url = ? where sku = ?`, [OWNER_IMAGE, KEYBOARD.sku]);
    const before = await guardedState();

    await orm.migrator.up({ migrations: [MIGRATION] });

    const rows = await mediaRows();
    expect(rowFor(rows, MOUSE.slug)).toMatchObject({
      image_url: "/photos/product-mouse-black.jpg",
      technical_specs: MOUSE_SPECS,
    });
    expect(rowFor(rows, HEADSET.slug).image_url).toBe("/photos/product-headset-black.jpg");
    expect(rowFor(rows, HEADSET.slug).technical_specs).toEqual([]);
    expect(rowFor(rows, KEYBOARD.slug).image_url).toBe(OWNER_IMAGE);
    expect(rowFor(rows, UNMAPPED.slug)).toMatchObject({
      image_url: "/demo/products/pulse-ultralight-mouse.svg",
      technical_specs: [],
    });

    expect(await guardedState()).toEqual(before);
  });

  it("is idempotent: replaying the up statements changes nothing", async () => {
    const before = await mediaDigest();
    await runSql(migrationSql("up"));
    expect(await mediaDigest()).toEqual(before);
  });

  it("down reverses only the values up wrote, and replaying it changes nothing", async () => {
    await orm.migrator.down({ migrations: [MIGRATION] });

    const rows = await mediaRows();
    expect(rowFor(rows, MOUSE.slug)).toMatchObject({ image_url: SVG.mouse, technical_specs: [] });
    expect(rowFor(rows, HEADSET.slug).image_url).toBe(SVG.headset);
    expect(rowFor(rows, KEYBOARD.slug).image_url).toBe(OWNER_IMAGE);

    const before = await mediaDigest();
    await runSql(migrationSql("down"));
    expect(await mediaDigest()).toEqual(before);
  });
});

import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { hasAppErrorCode, isUniqueFieldConflict, type ProductCreate } from "@commerceos/core";
import type { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "../cli/cli-orm";
import { DEMO_CATALOG, seedCatalog } from "../seeders/DatabaseSeeder";
import "../testing/provided-context";
import { DatabaseProductImportRepository } from "./database-product-import-repository";

const MISSING_CATEGORY_ID = "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2dff";

describe("DatabaseProductImportRepository (PostgreSQL)", () => {
  let orm: MikroORM;

  const repository = () => new DatabaseProductImportRepository({ em: orm.em.fork() });

  beforeAll(async () => {
    orm = await initToolingOrm(inject("databaseUrl"));
    await orm.schema.drop({ dropMigrationsTable: true });
    await orm.migrator.up();
    await seedCatalog(orm.em.fork(), DEMO_CATALOG);
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  async function scalar(sql: string, params: unknown[] = []): Promise<unknown> {
    const rows = await orm.em.fork().execute(sql, params);
    return Object.values(rows[0] ?? {})[0];
  }

  async function categoryId(slug: string): Promise<string> {
    const id = await scalar("select id from categories where slug = ?", [slug]);
    if (typeof id !== "string") throw new Error(`category ${slug} missing`);
    return id;
  }

  function imported(overrides: Partial<ProductCreate> = {}): ProductCreate {
    return {
      name: "Imported Mouse",
      slug: "imported-mouse",
      description: "A mouse from a CSV file.",
      priceMinor: 12990,
      sku: "IMP-001",
      categoryId: null,
      imageUrl: null,
      featured: false,
      status: "draft",
      stockQuantity: 7,
      ...overrides,
    };
  }

  async function rejection(promise: Promise<unknown>): Promise<unknown> {
    return promise.then(
      () => {
        throw new Error("expected a rejection");
      },
      (error: unknown) => error,
    );
  }

  it("finds existing products by slug and by SKU", async () => {
    const found = await repository().findExisting({
      slugs: ["vortex-wireless-mouse", "no-such-product"],
      skus: ["DEMO-MOU-002", "NO-SUCH-SKU"],
    });
    expect(found.map(({ slug, sku }) => ({ slug, sku }))).toEqual([
      { slug: "pulse-ultralight-mouse", sku: "DEMO-MOU-002" },
      { slug: "vortex-wireless-mouse", sku: "DEMO-MOU-001" },
    ]);
    expect(await repository().findExisting({ slugs: [], skus: [] })).toEqual([]);
  });

  it("creates every product with its status, initial stock and category, and records no stock change", async () => {
    const mice = await categoryId("mice");
    const adjustmentsBefore = await scalar("select count(*)::int from stock_adjustments");
    const created = await repository().createMany([
      imported({ categoryId: mice }),
      imported({
        name: "Imported Pad",
        slug: "imported-pad",
        sku: null,
        status: "published",
        stockQuantity: 0,
        featured: true,
      }),
    ]);

    expect(created).toEqual([
      { id: expect.any(String), name: "Imported Mouse", status: "draft" },
      { id: expect.any(String), name: "Imported Pad", status: "published" },
    ]);
    const rows = await orm.em
      .fork()
      .execute(
        "select slug, sku, price_minor, stock_quantity, status, featured, category_id from products where slug like 'imported-%' order by slug",
      );
    expect(rows).toEqual([
      {
        slug: "imported-mouse",
        sku: "IMP-001",
        price_minor: 12990,
        stock_quantity: 7,
        status: "draft",
        featured: false,
        category_id: mice,
      },
      {
        slug: "imported-pad",
        sku: null,
        price_minor: 12990,
        stock_quantity: 0,
        status: "published",
        featured: true,
        category_id: null,
      },
    ]);
    expect(await scalar("select count(*)::int from stock_adjustments")).toBe(adjustmentsBefore);
  });

  it("rolls back every row when one slug is taken, and leaves the existing product unchanged", async () => {
    const before = await orm.em
      .fork()
      .execute("select name, price_minor, stock_quantity, status from products where slug = ?", [
        "vortex-wireless-mouse",
      ]);
    const error = await rejection(
      repository().createMany([
        imported({ slug: "rollback-first", sku: "RB-1" }),
        imported({ slug: "vortex-wireless-mouse", sku: "RB-2", stockQuantity: 999 }),
      ]),
    );

    expect(isUniqueFieldConflict(error) && error.field).toBe("slug");
    expect(await scalar("select count(*)::int from products where slug = 'rollback-first'")).toBe(
      0,
    );
    expect(
      await orm.em
        .fork()
        .execute("select name, price_minor, stock_quantity, status from products where slug = ?", [
          "vortex-wireless-mouse",
        ]),
    ).toEqual(before);
  });

  it("rolls back every row when a category no longer exists", async () => {
    const error = await rejection(
      repository().createMany([
        imported({ slug: "rollback-cat-1", sku: "RBC-1" }),
        imported({ slug: "rollback-cat-2", sku: "RBC-2", categoryId: MISSING_CATEGORY_ID }),
      ]),
    );

    expect(hasAppErrorCode(error, "VALIDATION_FAILED")).toBe(true);
    expect(
      await scalar("select count(*)::int from products where slug like 'rollback-cat-%'"),
    ).toBe(0);
  });
});

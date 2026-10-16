import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { hasAppErrorCode, isUniqueFieldConflict, type ProductCreate } from "@commerceos/core";
import type { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "../cli/cli-orm";
import { DEMO_CATALOG, seedCatalog } from "../seeders/DatabaseSeeder";
import { E2E_CATALOG } from "../testing/catalog-fixtures";
import "../testing/provided-context";
import { toCatalogWriteError } from "./catalog-write-error";
import { DatabaseProductRepository } from "./database-product-repository";

const MISSING_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3eff";

describe("DatabaseProductRepository (PostgreSQL)", () => {
  let orm: MikroORM;

  const repository = () => new DatabaseProductRepository({ em: orm.em.fork() });

  beforeAll(async () => {
    orm = await initToolingOrm(inject("databaseUrl"));
    await orm.schema.drop({ dropMigrationsTable: true });
    await orm.migrator.up();
    await seedCatalog(orm.em.fork(), DEMO_CATALOG);
    await seedCatalog(orm.em.fork(), E2E_CATALOG);
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  async function categoryId(slug: string): Promise<string> {
    const rows = await orm.em.fork().execute("select id from categories where slug = ?", [slug]);
    const id: unknown = rows[0]?.id;
    if (typeof id !== "string") throw new Error(`category ${slug} missing`);
    return id;
  }

  async function rejection(promise: Promise<unknown>): Promise<unknown> {
    return promise.then(
      () => {
        throw new Error("expected a rejection");
      },
      (error: unknown) => error,
    );
  }

  function phantom(overrides: Partial<ProductCreate> = {}): ProductCreate {
    return {
      name: "Phantom Pro Mouse",
      slug: "phantom-pro-mouse",
      description: "[DEMO] A light wireless mouse.",
      priceMinor: 19990,
      sku: "DEMO-MOU-009",
      categoryId: null,
      imageUrl: null,
      featured: false,
      status: "draft",
      stockQuantity: 5,
      ...overrides,
    };
  }

  it("lists every product, drafts included, sorted by name", async () => {
    const products = await repository().list();
    expect(products).toHaveLength(17);
    const names = products.map((product) => product.name);
    // Names whose case does not differ, so the byte collation does not matter (lessons).
    expect(names.indexOf("Apex Wireless Controller")).toBeLessThan(
      names.indexOf("Vortex Wireless Mouse"),
    );
    expect(names[0]).toBe("Apex Wireless Controller");
    expect(products.find((product) => product.slug === "titan-mmo-mouse")).toMatchObject({
      sku: "DEMO-MOU-003",
      stockQuantity: 0,
      status: "published",
      featured: true,
      currency: "PLN",
      category: { slug: "mice", name: "Mice", id: await categoryId("mice") },
    });
  });

  it("creates, reads and edits a product; an edit keeps stock and status", async () => {
    const mice = await categoryId("mice");
    const created = await repository().create(
      phantom({ categoryId: mice, status: "published", stockQuantity: 0, featured: true }),
    );
    expect(created).toEqual({
      id: expect.any(String),
      slug: "phantom-pro-mouse",
      name: "Phantom Pro Mouse",
      description: "[DEMO] A light wireless mouse.",
      priceMinor: 19990,
      currency: "PLN",
      sku: "DEMO-MOU-009",
      stockQuantity: 0,
      imageUrl: null,
      status: "published",
      featured: true,
      category: { id: mice, slug: "mice", name: "Mice" },
    });
    expect(await repository().findById(created.id)).toEqual(created);

    const { status: _status, stockQuantity: _stock, ...edit } = phantom();
    const updated = await repository().update(created.id, {
      ...edit,
      name: "Phantom Pro Mouse 2",
      categoryId: await categoryId("keyboards"),
      imageUrl: "https://images.example.com/phantom.png",
    });
    expect(updated).toMatchObject({
      name: "Phantom Pro Mouse 2",
      featured: false,
      stockQuantity: 0,
      status: "published",
      imageUrl: "https://images.example.com/phantom.png",
      category: { slug: "keyboards" },
    });

    const uncategorized = await repository().update(created.id, { ...edit, categoryId: null });
    expect(uncategorized?.category).toBeNull();
    expect(await repository().update(MISSING_ID, edit)).toBeNull();
  });

  it("publishes and unpublishes", async () => {
    const created = await repository().create(phantom({ slug: "status-probe", sku: null }));
    expect((await repository().setStatus(created.id, "published"))?.status).toBe("published");
    expect((await repository().findById(created.id))?.status).toBe("published");
    expect((await repository().setStatus(created.id, "draft"))?.status).toBe("draft");
    expect(await repository().setStatus(MISSING_ID, "draft")).toBeNull();
  });

  it("maps a duplicate slug and a duplicate SKU to their fields, on create and update", async () => {
    const slug = await rejection(repository().create(phantom({ slug: "vortex-wireless-mouse" })));
    expect(isUniqueFieldConflict(slug)).toBe(true);
    expect(slug).toMatchObject({ field: "slug" });

    const sku = await rejection(
      repository().create(phantom({ slug: "sku-probe", sku: "DEMO-MOU-001" })),
    );
    expect(sku).toMatchObject({
      field: "sku",
      message: "This SKU is already used by another product.",
    });

    const own = await repository().create(phantom({ slug: "update-probe", sku: "DEMO-UPD-001" }));
    const { status: _status, stockQuantity: _stock, ...edit } = phantom();
    const onUpdate = await rejection(
      repository().update(own.id, { ...edit, slug: "update-probe", sku: "DEMO-KEY-001" }),
    );
    expect(onUpdate).toMatchObject({ field: "sku" });
  });

  it("lets exactly one of two concurrent creates with the same slug succeed", async () => {
    const results = await Promise.allSettled([
      repository().create(phantom({ slug: "race-slug", sku: "DEMO-RACE-1" })),
      repository().create(phantom({ slug: "race-slug", sku: "DEMO-RACE-2" })),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((result) => result.status === "rejected");
    expect(failed?.status === "rejected" && isUniqueFieldConflict(failed.reason)).toBe(true);
  });

  it("maps a deleted or unknown category to a field error on categoryId", async () => {
    const error = await rejection(
      repository().create(phantom({ slug: "fk-probe", sku: null, categoryId: MISSING_ID })),
    );
    expect(hasAppErrorCode(error, "VALIDATION_FAILED")).toBe(true);
    expect(error).toMatchObject({ fieldErrors: { categoryId: ["Choose an existing category."] } });
  });

  it("maps a negative stock or price that reaches the database to its field", async () => {
    const stock = await rejection(
      repository().create(phantom({ slug: "stock-probe", sku: null, stockQuantity: -1 })),
    );
    expect(stock).toMatchObject({ fieldErrors: { stockQuantity: expect.any(Array) } });

    const price = await rejection(
      repository().create(phantom({ slug: "price-probe", sku: null, priceMinor: -1 })),
    );
    expect(price).toMatchObject({ fieldErrors: { price: expect.any(Array) } });

    // The real constraint name of the stock check, as the mapping expects it.
    const raw = await rejection(
      orm.em
        .fork()
        .execute(
          "insert into products (name, slug, price_minor, stock_quantity) values ('X', 'raw-stock', 1, -1)",
        ),
    );
    expect(raw).toMatchObject({ code: "23514", constraint: "products_stock_quantity_check" });
    expect(hasAppErrorCode(toCatalogWriteError(raw), "VALIDATION_FAILED")).toBe(true);
  });
});

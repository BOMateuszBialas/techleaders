import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "../cli/cli-orm";
import { DEMO_CATALOG, seedCatalog } from "../seeders/DatabaseSeeder";
import { E2E_CATALOG } from "../testing/catalog-fixtures";
import "../testing/provided-context";
import { DatabaseCatalogRepository } from "./database-catalog-repository";

describe("DatabaseCatalogRepository (PostgreSQL)", () => {
  let orm: MikroORM;

  const repository = () => new DatabaseCatalogRepository({ em: orm.em.fork() });

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
    const category = await repository().findCategoryBySlug(slug);
    if (!category) throw new Error(`category ${slug} missing`);
    return category.id;
  }

  it("lists every category sorted by name, empty ones included", async () => {
    const names = (await repository().listCategories()).map((category) => category.name);
    // The database collation orders letters before the "[" of the test fixtures.
    expect(names).toEqual(["Brewing gear", "Coffee", "[E2E] Drafts only", "[E2E] Empty category"]);
  });

  it("returns published products only, sorted by name, with their category", async () => {
    const { items, total } = await repository().findProducts({ status: "published", limit: 48 });

    expect(total).toBe(5);
    expect(items.map((product) => product.slug)).toEqual([
      "brazil-santos-1kg",
      "colombia-huila-250g",
      "ethiopia-yirgacheffe-250g",
      "gooseneck-kettle",
      "v60-dripper",
    ]);
    expect(items.every((product) => product.status === "published")).toBe(true);
    expect(items[4]).toMatchObject({
      category: { slug: "brewing", name: "Brewing gear" },
      imageUrl: "/demo/products/v60-dripper.svg",
      priceMinor: 8900,
      currency: "PLN",
    });
  });

  it("filters by category", async () => {
    const { items } = await repository().findProducts({
      status: "published",
      categoryId: await categoryId("brewing"),
      limit: 48,
    });
    expect(items.map((product) => product.slug)).toEqual(["gooseneck-kettle", "v60-dripper"]);
  });

  it("returns nothing for an empty category and for one holding only drafts", async () => {
    for (const slug of ["e2e-empty", "e2e-drafts-only"]) {
      const result = await repository().findProducts({
        status: "published",
        categoryId: await categoryId(slug),
        limit: 48,
      });
      expect(result).toEqual({ items: [], total: 0 });
    }
  });

  it("limits the items but counts every match", async () => {
    const { items, total } = await repository().findProducts({ status: "published", limit: 2 });
    expect(items.map((product) => product.slug)).toEqual([
      "brazil-santos-1kg",
      "colombia-huila-250g",
    ]);
    expect(total).toBe(5);
  });

  it("finds a product by slug in any status (the use case filters drafts)", async () => {
    expect(await repository().findProductBySlug("e2e-draft-kettle")).toMatchObject({
      status: "draft",
      category: { slug: "e2e-drafts-only" },
    });
    expect(await repository().findProductBySlug("missing")).toBeNull();
  });
});

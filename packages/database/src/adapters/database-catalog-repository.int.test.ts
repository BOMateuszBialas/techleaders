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
    expect(names).toEqual([
      "Controllers",
      "Headsets",
      "Keyboards",
      "Mice",
      "Mousepads",
      "[E2E] Drafts only",
      "[E2E] Empty category",
    ]);
  });

  it("returns published products only, sorted by name, with their category", async () => {
    const { items, total } = await repository().findProducts({ status: "published", limit: 48 });

    expect(total).toBe(15);
    expect(items.map((product) => product.name)).toEqual([
      "Apex Wireless Controller",
      "Arena Fight Stick",
      "Aurora Full-Size Keyboard",
      "Control Cloth Mousepad",
      "Drift Wireless Headset",
      "Echo Surround Headset",
      "Glide XL Mousepad",
      "Nimbus Stereo Headset",
      "Nova TKL Mechanical Keyboard",
      "Pulse Ultralight Mouse",
      "Retro Wired Controller",
      "Strike 60 Keyboard",
      "Tempered Glass Mousepad",
      "Titan MMO Mouse",
      "Vortex Wireless Mouse",
    ]);
    expect(items.every((product) => product.status === "published")).toBe(true);
    expect(items[14]).toMatchObject({
      slug: "vortex-wireless-mouse",
      category: { slug: "mice", name: "Mice" },
      imageUrl: "/demo/products/vortex-wireless-mouse.svg",
      priceMinor: 24900,
      currency: "PLN",
    });
  });

  it("filters by category", async () => {
    const { items } = await repository().findProducts({
      status: "published",
      categoryId: await categoryId("mice"),
      limit: 48,
    });
    // The "[E2E] Draft Vortex mouse" fixture in the same category is excluded.
    expect(items.map((product) => product.slug)).toEqual([
      "pulse-ultralight-mouse",
      "titan-mmo-mouse",
      "vortex-wireless-mouse",
    ]);
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
      "apex-wireless-controller",
      "arena-fight-stick",
    ]);
    expect(total).toBe(15);
  });

  it("finds a product by slug in any status (the use case filters drafts)", async () => {
    expect(await repository().findProductBySlug("e2e-draft-keyboard")).toMatchObject({
      status: "draft",
      category: { slug: "e2e-drafts-only" },
    });
    expect(await repository().findProductBySlug("missing")).toBeNull();
  });
});

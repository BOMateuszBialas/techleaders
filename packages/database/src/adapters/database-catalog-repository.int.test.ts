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

  it("filters featured products, drafts included unless the status excludes them", async () => {
    const published = await repository().findProducts({
      status: "published",
      featured: true,
      limit: 12,
    });
    expect(published.items.map((product) => product.slug)).toEqual([
      "apex-wireless-controller",
      "echo-surround-headset",
      "glide-xl-mousepad",
      "nova-tkl-mechanical-keyboard",
      "titan-mmo-mouse",
      "vortex-wireless-mouse",
    ]);
    expect(published.items.every((product) => product.featured)).toBe(true);

    const drafts = await repository().findProducts({ status: "draft", featured: true, limit: 12 });
    // Sorted by name with the database collation: "[E2E] Draft Vortex…" before "…keyboard".
    expect(drafts.items.map((product) => product.slug)).toEqual([
      "e2e-draft-mouse",
      "e2e-draft-keyboard",
    ]);
  });

  it("combines the featured flag with a category and the limit", async () => {
    const { items, total } = await repository().findProducts({
      status: "published",
      featured: true,
      categoryId: await categoryId("mice"),
      limit: 1,
    });
    expect(items.map((product) => product.slug)).toEqual(["titan-mmo-mouse"]);
    expect(total).toBe(2);

    const none = await repository().findProducts({
      status: "published",
      featured: true,
      categoryId: await categoryId("e2e-empty"),
      limit: 12,
    });
    expect(none).toEqual({ items: [], total: 0 });
  });

  it("finds a product by slug in any status (the use case filters drafts)", async () => {
    expect(await repository().findProductBySlug("e2e-draft-keyboard")).toMatchObject({
      status: "draft",
      category: { slug: "e2e-drafts-only" },
    });
    expect(await repository().findProductBySlug("missing")).toBeNull();
  });

  it("searches names case-insensitively and never returns a matching draft", async () => {
    const { items, total } = await repository().findProducts({
      status: "published",
      search: "VORTEX",
      limit: 48,
    });
    // "[E2E] Draft Vortex mouse" matches the term too, but it is a draft.
    expect(items.map((product) => product.slug)).toEqual(["vortex-wireless-mouse"]);
    expect(total).toBe(1);
  });

  it("searches descriptions and counts every match", async () => {
    const byDescription = await repository().findProducts({
      status: "published",
      search: "hall-effect",
      limit: 48,
    });
    expect(byDescription.items.map((product) => product.slug)).toEqual([
      "apex-wireless-controller",
    ]);

    const { items, total } = await repository().findProducts({
      status: "published",
      search: "wireless",
      limit: 2,
    });
    expect(items.map((product) => product.slug)).toEqual([
      "apex-wireless-controller",
      "drift-wireless-headset",
    ]);
    expect(total).toBe(3);
  });

  it("returns the intersection of a search and a category", async () => {
    const inMice = await repository().findProducts({
      status: "published",
      categoryId: await categoryId("mice"),
      search: "wireless",
      limit: 48,
    });
    expect(inMice.items.map((product) => product.slug)).toEqual(["vortex-wireless-mouse"]);

    const inMousepads = await repository().findProducts({
      status: "published",
      categoryId: await categoryId("mousepads"),
      search: "wireless",
      limit: 48,
    });
    expect(inMousepads).toEqual({ items: [], total: 0 });
  });

  // Last in the file: it adds a published product that the listings above must not see.
  it("matches %, _ and \\ literally", async () => {
    const search = (term: string) =>
      repository()
        .findProducts({ status: "published", search: term, limit: 48 })
        .then(({ items }) => items.map((product) => product.slug));

    // No seeded product contains these characters, so a wildcard would match everything.
    expect(await search("%")).toEqual([]);
    expect(await search("_")).toEqual([]);
    expect(await search("\\")).toEqual([]);

    await seedCatalog(orm.em.fork(), {
      categories: [{ slug: "int-search", name: "[INT] Search", description: "[INT] Search." }],
      products: [
        {
          slug: "int-wildcards",
          name: "[INT] 100% wool_pad \\ edition",
          category: "int-search",
          priceMinor: 1000,
          stockQuantity: 1,
          sku: "INT-SEARCH-001",
        },
        {
          slug: "int-woolypad",
          name: "[INT] Woolypad",
          category: "int-search",
          priceMinor: 1000,
          stockQuantity: 1,
          sku: "INT-SEARCH-002",
        },
      ],
    });
    expect(await search("100%")).toEqual(["int-wildcards"]);
    // An unescaped "_" would also match "Woolypad".
    expect(await search("wool_pad")).toEqual(["int-wildcards"]);
    expect(await search("\\ edition")).toEqual(["int-wildcards"]);
    // An unescaped "%" would match "100% wool" here.
    expect(await search("100%wool")).toEqual([]);
  });
});

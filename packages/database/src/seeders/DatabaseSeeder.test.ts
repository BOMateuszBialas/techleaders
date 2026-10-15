import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createUnitTestOrm } from "../testing/unit-orm";
import { DEMO_CATALOG, DatabaseSeeder, seedCatalog, type SeedCatalog } from "./DatabaseSeeder";

const orm = createUnitTestOrm();

afterAll(async () => {
  await orm.close();
});

function fakeRow(data: unknown): { id: string } {
  const slug = typeof data === "object" && data !== null && "slug" in data ? data.slug : "?";
  return { id: `id-${String(slug)}` };
}

function stubEntityManager() {
  const em = orm.em.fork();
  // `upsert` is generic over every entity type; the stub returns only the `id`
  // the seeder reads, so its result is typed loosely on purpose.
  const upsert = vi
    .spyOn(em, "upsert")
    .mockImplementation(async (_entity: unknown, data: unknown) => fakeRow(data) as never);
  const flush = vi.spyOn(em, "flush").mockResolvedValue();
  return { em, upsert, flush };
}

describe("seedCatalog", () => {
  let stub: ReturnType<typeof stubEntityManager>;

  beforeEach(() => {
    stub = stubEntityManager();
  });

  it("upserts categories and products by slug and links products to their category", async () => {
    await seedCatalog(stub.em, DEMO_CATALOG);

    const calls = stub.upsert.mock.calls;
    expect(calls).toHaveLength(DEMO_CATALOG.categories.length + DEMO_CATALOG.products.length);
    for (const call of calls) expect(call[2]).toEqual({ onConflictFields: ["slug"] });
    expect(calls[DEMO_CATALOG.categories.length]?.[1]).toMatchObject({
      slug: "vortex-wireless-mouse",
      category: "id-mice",
      status: "published",
      imageUrl: "/demo/products/vortex-wireless-mouse.svg",
      description: expect.stringMatching(/^\[DEMO] Wireless gaming mouse/),
    });
    expect(stub.flush).toHaveBeenCalledOnce();
  });

  it("marks every demo record as demo data", () => {
    for (const category of DEMO_CATALOG.categories)
      expect(category.description).toMatch(/^\[DEMO]/);
    for (const product of DEMO_CATALOG.products) expect(product.sku).toMatch(/^DEMO-/);
  });

  it("is a gaming-accessories store with an out-of-stock product (decision D10)", () => {
    expect(DEMO_CATALOG.categories.map((category) => category.slug)).toEqual([
      "mice",
      "keyboards",
      "headsets",
      "controllers",
      "mousepads",
    ]);
    expect(DEMO_CATALOG.products.length).toBeGreaterThanOrEqual(15);
    expect(DEMO_CATALOG.products.some((product) => product.stockQuantity === 0)).toBe(true);
    for (const product of DEMO_CATALOG.products)
      expect(product.imageUrl).toBe(`/demo/products/${product.slug}.svg`);
  });

  it("seeds an explicit status, a generic description and no image when none is given", async () => {
    const [category] = DEMO_CATALOG.categories;
    const draft: SeedCatalog = {
      categories: [category!],
      products: [
        {
          slug: "draft-pad",
          name: "Draft pad",
          category: category!.slug,
          priceMinor: 100,
          stockQuantity: 1,
          sku: "TEST-001",
          status: "draft",
        },
      ],
    };
    await seedCatalog(stub.em, draft);
    expect(stub.upsert.mock.calls[1]?.[1]).toMatchObject({
      status: "draft",
      imageUrl: null,
      description: "[DEMO] Draft pad. Seed data for local development.",
    });
  });

  it("rejects a product that references an unknown category", async () => {
    const broken: SeedCatalog = {
      categories: [],
      products: DEMO_CATALOG.products.slice(0, 1).map((p) => ({ ...p, category: "missing" })),
    };
    await expect(seedCatalog(stub.em, broken)).rejects.toThrow('Seed category "missing" missing');
    expect(stub.flush).not.toHaveBeenCalled();
  });
});

describe("DatabaseSeeder", () => {
  it("seeds the demo catalog", async () => {
    const stub = stubEntityManager();
    await new DatabaseSeeder().run(stub.em);
    expect(stub.upsert).toHaveBeenCalledTimes(
      DEMO_CATALOG.categories.length + DEMO_CATALOG.products.length,
    );
  });
});

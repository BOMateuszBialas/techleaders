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
      slug: "ethiopia-yirgacheffe-250g",
      category: "id-coffee",
      status: "published",
    });
    expect(stub.flush).toHaveBeenCalledOnce();
  });

  it("marks every demo record as demo data", () => {
    for (const category of DEMO_CATALOG.categories)
      expect(category.description).toMatch(/^\[DEMO]/);
    for (const product of DEMO_CATALOG.products) expect(product.sku).toMatch(/^DEMO-/);
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

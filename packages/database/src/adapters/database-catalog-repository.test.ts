import { afterAll, describe, expect, it, vi } from "vitest";
import { createUnitTestOrm } from "../testing/unit-orm";
import { DatabaseCatalogRepository, toContainsPattern } from "./database-catalog-repository";

const orm = createUnitTestOrm();

afterAll(async () => {
  await orm.close();
});

const coffee = { id: "cat-1", slug: "coffee", name: "Coffee", description: "[DEMO] Beans." };
const product = {
  id: "p-1",
  slug: "v60-dripper",
  name: "V60 Dripper",
  description: "A dripper.",
  priceMinor: 8900,
  currency: "PLN",
  stockQuantity: 8,
  imageUrl: "/demo/products/v60-dripper.svg",
  status: "published",
  sku: "DEMO-BRW-001",
  category: coffee,
};

// The stubs return plain rows shaped like the entities; the ORM's generic signatures
// cannot be satisfied by plain objects, so their results are typed loosely on purpose.
function setup() {
  const em = orm.em.fork();
  return {
    em,
    find: vi.spyOn(em, "find"),
    findOne: vi.spyOn(em, "findOne"),
    findAndCount: vi.spyOn(em, "findAndCount"),
    repository: new DatabaseCatalogRepository({ em }),
  };
}

describe("DatabaseCatalogRepository", () => {
  it("lists categories sorted by name as plain records", async () => {
    const { find, repository } = setup();
    find.mockResolvedValue([coffee, { ...coffee, id: "cat-2", description: null }] as never);

    expect(await repository.listCategories()).toEqual([
      coffee,
      { ...coffee, id: "cat-2", description: null },
    ]);
    expect(find.mock.calls[0]?.[2]).toEqual({ orderBy: { name: "asc", slug: "asc" } });
  });

  it("finds a category by slug, or null", async () => {
    const { findOne, repository } = setup();
    findOne.mockResolvedValueOnce({ ...coffee, description: undefined } as never);
    expect(await repository.findCategoryBySlug("coffee")).toEqual({ ...coffee, description: null });
    findOne.mockResolvedValueOnce(null);
    expect(await repository.findCategoryBySlug("missing")).toBeNull();
    expect(findOne.mock.calls[1]?.[1]).toEqual({ slug: "missing" });
  });

  it("applies the status, category and limit criteria and maps products to records", async () => {
    const { findAndCount, repository } = setup();
    findAndCount.mockResolvedValue([
      [product, { ...product, id: "p-2", imageUrl: undefined, category: null }],
      7,
    ] as never);

    const result = await repository.findProducts({
      status: "published",
      categoryId: "cat-1",
      limit: 2,
    });

    const [, where, options] = findAndCount.mock.calls[0] ?? [];
    expect(where).toEqual({ status: "published", category: "cat-1" });
    expect(options).toEqual({
      populate: ["category"],
      orderBy: { name: "asc", slug: "asc" },
      limit: 2,
    });
    expect(result.total).toBe(7);
    expect(result.items[0]).toEqual({
      id: "p-1",
      slug: "v60-dripper",
      name: "V60 Dripper",
      description: "A dripper.",
      priceMinor: 8900,
      currency: "PLN",
      stockQuantity: 8,
      imageUrl: "/demo/products/v60-dripper.svg",
      status: "published",
      category: { slug: "coffee", name: "Coffee" },
    });
    expect(result.items[1]).toMatchObject({ imageUrl: null, category: null });
    expect(Object.keys(result.items[0] ?? {})).not.toContain("sku");
  });

  it("omits the category filter when none is given", async () => {
    const { findAndCount, repository } = setup();
    findAndCount.mockResolvedValue([[], 0] as never);
    await repository.findProducts({ status: "published", limit: 48 });
    expect(findAndCount.mock.calls[0]?.[1]).toEqual({ status: "published" });
  });

  it("finds a product by slug in any status, or null", async () => {
    const { findOne, repository } = setup();
    findOne.mockResolvedValueOnce({ ...product, status: "draft" } as never);
    expect(await repository.findProductBySlug("v60-dripper")).toMatchObject({ status: "draft" });
    expect(findOne.mock.calls[0]?.[2]).toEqual({ populate: ["category"] });
    findOne.mockResolvedValueOnce(null);
    expect(await repository.findProductBySlug("missing")).toBeNull();
  });
});

describe("toContainsPattern", () => {
  it("wraps the term and escapes LIKE wildcards and the escape character", () => {
    expect(toContainsPattern("kettle")).toBe("%kettle%");
    expect(toContainsPattern("100%_\\")).toBe("%100\\%\\_\\\\%");
  });
});

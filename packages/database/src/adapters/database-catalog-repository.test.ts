import { afterAll, describe, expect, it, vi } from "vitest";
import { createUnitTestOrm } from "../testing/unit-orm";
import { DatabaseCatalogRepository, toContainsPattern } from "./database-catalog-repository";

const orm = createUnitTestOrm();

afterAll(async () => {
  await orm.close();
});

const mice = { id: "cat-1", slug: "mice", name: "Mice", description: "[DEMO] Gaming mice." };
const product = {
  id: "p-1",
  slug: "vortex-wireless-mouse",
  name: "Vortex Wireless Mouse",
  description: "A wireless mouse.",
  priceMinor: 24900,
  currency: "PLN",
  stockQuantity: 8,
  imageUrl: "/demo/products/vortex-wireless-mouse.svg",
  technicalSpecs: [{ label: "Sensor", value: "Optical" }],
  status: "published",
  featured: true,
  sku: "DEMO-MOU-001",
  category: mice,
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
    find.mockResolvedValue([mice, { ...mice, id: "cat-2", description: null }] as never);

    expect(await repository.listCategories()).toEqual([
      mice,
      { ...mice, id: "cat-2", description: null },
    ]);
    expect(find.mock.calls[0]?.[2]).toEqual({ orderBy: { name: "asc", slug: "asc" } });
  });

  it("finds a category by slug, or null", async () => {
    const { findOne, repository } = setup();
    findOne.mockResolvedValueOnce({ ...mice, description: undefined } as never);
    expect(await repository.findCategoryBySlug("mice")).toEqual({ ...mice, description: null });
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
      slug: "vortex-wireless-mouse",
      name: "Vortex Wireless Mouse",
      description: "A wireless mouse.",
      priceMinor: 24900,
      currency: "PLN",
      stockQuantity: 8,
      imageUrl: "/demo/products/vortex-wireless-mouse.svg",
      technicalSpecs: [{ label: "Sensor", value: "Optical" }],
      status: "published",
      featured: true,
      category: { slug: "mice", name: "Mice" },
    });
    expect(result.items[1]).toMatchObject({ imageUrl: null, category: null });
    expect(Object.keys(result.items[0] ?? {})).not.toContain("sku");
  });

  it("filters by the featured flag when it is given", async () => {
    const { findAndCount, repository } = setup();
    findAndCount.mockResolvedValue([[], 0] as never);
    await repository.findProducts({ status: "published", featured: true, limit: 12 });
    await repository.findProducts({ status: "published", featured: false, limit: 12 });
    expect(findAndCount.mock.calls[0]?.[1]).toEqual({ status: "published", featured: true });
    expect(findAndCount.mock.calls[1]?.[1]).toEqual({ status: "published", featured: false });
  });

  it("matches a search term in the name or description with an escaped pattern", async () => {
    const { findAndCount, repository } = setup();
    findAndCount.mockResolvedValue([[], 0] as never);
    await repository.findProducts({
      status: "published",
      categoryId: "cat-1",
      search: "100%",
      limit: 48,
    });
    expect(findAndCount.mock.calls[0]?.[1]).toEqual({
      status: "published",
      category: "cat-1",
      $or: [{ name: { $ilike: "%100\\%%" } }, { description: { $ilike: "%100\\%%" } }],
    });
  });

  it("omits the category, featured and search filters when none is given", async () => {
    const { findAndCount, repository } = setup();
    findAndCount.mockResolvedValue([[], 0] as never);
    await repository.findProducts({ status: "published", limit: 48 });
    expect(findAndCount.mock.calls[0]?.[1]).toEqual({ status: "published" });
  });

  it("finds a product by slug in any status, or null", async () => {
    const { findOne, repository } = setup();
    findOne.mockResolvedValueOnce({ ...product, status: "draft" } as never);
    expect(await repository.findProductBySlug("vortex-wireless-mouse")).toMatchObject({
      status: "draft",
    });
    expect(findOne.mock.calls[0]?.[2]).toEqual({ populate: ["category"] });
    findOne.mockResolvedValueOnce(null);
    expect(await repository.findProductBySlug("missing")).toBeNull();
  });

  it("finds products by id with their category, and skips the query for no ids", async () => {
    const { find, repository } = setup();
    find.mockResolvedValue([product] as never);

    expect(await repository.findProductsByIds(["p-1", "p-2"])).toEqual([
      expect.objectContaining({ id: "p-1", category: { slug: "mice", name: "Mice" } }),
    ]);
    expect(find.mock.calls[0]?.[1]).toEqual({ id: { $in: ["p-1", "p-2"] } });
    expect(find.mock.calls[0]?.[2]).toEqual({ populate: ["category"] });

    expect(await repository.findProductsByIds([])).toEqual([]);
    expect(find).toHaveBeenCalledTimes(1);
  });
});

describe("toContainsPattern", () => {
  it("wraps the term and escapes LIKE wildcards and the escape character", () => {
    expect(toContainsPattern("mouse")).toBe("%mouse%");
    expect(toContainsPattern("100%_\\")).toBe("%100\\%\\_\\\\%");
  });
});

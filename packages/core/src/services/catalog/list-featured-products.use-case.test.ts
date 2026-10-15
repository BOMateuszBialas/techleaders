import { describe, expect, it } from "vitest";
import { EMPTY, InMemoryCatalog, MICE, productRecord } from "./in-memory-catalog.fixture";
import {
  FEATURED_PRODUCTS_LIMIT,
  ListFeaturedProductsUseCase,
} from "./list-featured-products.use-case";

const vortex = productRecord({ featured: true });
const titan = productRecord({
  id: "p-2",
  slug: "titan-mmo-mouse",
  name: "Titan MMO Mouse",
  stockQuantity: 0,
  featured: true,
});
const pulse = productRecord({ id: "p-3", slug: "pulse-ultralight-mouse", name: "Pulse" });
const draft = productRecord({
  id: "p-4",
  slug: "draft-mouse",
  name: "Draft mouse",
  status: "draft",
  featured: true,
});
const pad = productRecord({
  id: "p-5",
  slug: "glide-xl-mousepad",
  name: "Glide XL Mousepad",
  featured: true,
  category: null,
});

function catalog() {
  return new InMemoryCatalog([EMPTY, MICE], [vortex, titan, pulse, draft, pad], {
    [vortex.slug]: MICE.id,
    [titan.slug]: MICE.id,
    [pulse.slug]: MICE.id,
    [draft.slug]: MICE.id,
  });
}

describe("ListFeaturedProductsUseCase", () => {
  it("lists published featured products of every category, sorted by name", async () => {
    const repository = catalog();
    const result = await new ListFeaturedProductsUseCase({
      catalogRepository: repository,
    }).execute();

    expect(repository.criteria).toEqual([
      { status: "published", featured: true, limit: FEATURED_PRODUCTS_LIMIT },
    ]);
    expect(FEATURED_PRODUCTS_LIMIT).toBe(12);
    expect(result.category).toBeNull();
    expect(result.products.map((product) => product.slug)).toEqual([
      "glide-xl-mousepad",
      "titan-mmo-mouse",
      "vortex-wireless-mouse",
    ]);
  });

  it("keeps out-of-stock featured products and labels them (spec G18)", async () => {
    const result = await new ListFeaturedProductsUseCase({
      catalogRepository: catalog(),
    }).execute();
    expect(result.products.find((product) => product.slug === "titan-mmo-mouse")).toMatchObject({
      availability: "out_of_stock",
    });
  });

  it("narrows to one category", async () => {
    const repository = catalog();
    const result = await new ListFeaturedProductsUseCase({ catalogRepository: repository }).execute(
      { categorySlug: "mice" },
    );

    expect(repository.criteria).toEqual([
      { status: "published", featured: true, categoryId: MICE.id, limit: FEATURED_PRODUCTS_LIMIT },
    ]);
    expect(result.category).toEqual({ slug: "mice", name: "Mice", description: "Gaming mice" });
    expect(result.products.map((product) => product.slug)).toEqual([
      "titan-mmo-mouse",
      "vortex-wireless-mouse",
    ]);
  });

  it("returns no products for a category without featured products", async () => {
    const result = await new ListFeaturedProductsUseCase({ catalogRepository: catalog() }).execute({
      categorySlug: "empty",
    });
    expect(result).toEqual({
      category: { slug: "empty", name: "Empty", description: null },
      products: [],
    });
  });

  it("falls back to every category for an unknown slug (spec G19)", async () => {
    const repository = catalog();
    const result = await new ListFeaturedProductsUseCase({ catalogRepository: repository }).execute(
      { categorySlug: "missing" },
    );
    expect(result.category).toBeNull();
    expect(result.products).toHaveLength(3);
    expect(repository.criteria[0]).not.toHaveProperty("categoryId");
  });

  it("applies the limit", async () => {
    const many = Array.from({ length: 15 }, (_, index) =>
      productRecord({ id: `p-${index}`, slug: `mouse-${index}`, featured: true }),
    );
    const result = await new ListFeaturedProductsUseCase({
      catalogRepository: new InMemoryCatalog([], many),
    }).execute();
    expect(result.products).toHaveLength(FEATURED_PRODUCTS_LIMIT);
  });
});

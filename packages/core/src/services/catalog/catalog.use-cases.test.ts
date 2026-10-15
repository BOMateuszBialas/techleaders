import { describe, expect, it } from "vitest";
import { InvalidMoneyError } from "../../domain/money";
import { NotFoundError } from "../../errors/app-error";
import { GetCatalogProductUseCase } from "./get-catalog-product.use-case";
import { MICE, EMPTY, InMemoryCatalog, productRecord } from "./in-memory-catalog.fixture";
import { ListCatalogCategoriesUseCase } from "./list-catalog-categories.use-case";
import { CATALOG_PAGE_LIMIT, ListCatalogProductsUseCase } from "./list-catalog-products.use-case";

const vortex = productRecord();
const titan = productRecord({
  id: "p-2",
  slug: "titan-mmo-mouse",
  name: "Titan MMO Mouse",
  stockQuantity: 0,
  category: null,
});
const draft = productRecord({
  id: "p-3",
  slug: "draft-mouse",
  name: "Draft mouse",
  status: "draft",
});

function catalog() {
  return new InMemoryCatalog([EMPTY, MICE], [titan, draft, vortex], {
    [vortex.slug]: MICE.id,
    [draft.slug]: MICE.id,
  });
}

describe("ListCatalogCategoriesUseCase", () => {
  it("returns every category sorted by name, including empty ones", async () => {
    const result = await new ListCatalogCategoriesUseCase({
      catalogRepository: catalog(),
    }).execute();
    expect(result).toEqual([
      { slug: "empty", name: "Empty", description: null },
      { slug: "mice", name: "Mice", description: "Gaming mice" },
    ]);
  });
});

describe("ListCatalogProductsUseCase", () => {
  it("lists published products only, with the page limit, sorted by name", async () => {
    const repository = catalog();
    const result = await new ListCatalogProductsUseCase({
      catalogRepository: repository,
    }).execute();

    expect(repository.criteria).toEqual([{ status: "published", limit: CATALOG_PAGE_LIMIT }]);
    expect(result.category).toBeNull();
    expect(result.products.map((p) => p.slug)).toEqual([
      "titan-mmo-mouse",
      "vortex-wireless-mouse",
    ]);
    expect(result.total).toBe(2);
    expect(result.limit).toBe(48);
  });

  it("filters by category and always keeps the published criterion", async () => {
    const repository = catalog();
    const result = await new ListCatalogProductsUseCase({ catalogRepository: repository }).execute({
      categorySlug: "mice",
    });

    expect(repository.criteria).toEqual([
      { status: "published", categoryId: MICE.id, limit: CATALOG_PAGE_LIMIT },
    ]);
    expect(result.category).toEqual({ slug: "mice", name: "Mice", description: "Gaming mice" });
    expect(result.products.map((p) => p.slug)).toEqual(["vortex-wireless-mouse"]);
  });

  it("returns an empty listing for an empty category", async () => {
    const result = await new ListCatalogProductsUseCase({ catalogRepository: catalog() }).execute({
      categorySlug: "empty",
    });
    expect(result).toMatchObject({ products: [], total: 0, category: { slug: "empty" } });
  });

  it("rejects an unknown category without listing products", async () => {
    const repository = catalog();
    await expect(
      new ListCatalogProductsUseCase({ catalogRepository: repository }).execute({
        categorySlug: "missing",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.criteria).toEqual([]);
  });

  it("maps records to shopper DTOs without internal fields", async () => {
    const result = await new ListCatalogProductsUseCase({ catalogRepository: catalog() }).execute();
    const [titanSummary, vortexSummary] = result.products;

    expect(vortexSummary).toEqual({
      id: "p-1",
      slug: "vortex-wireless-mouse",
      name: "Vortex Wireless Mouse",
      price: { amountMinor: 24900, currency: "PLN" },
      category: { slug: "mice", name: "Mice" },
      availability: "in_stock",
      imageUrl: "/demo/products/vortex-wireless-mouse.svg",
    });
    expect(titanSummary).toMatchObject({ category: null, availability: "out_of_stock" });
    for (const key of ["status", "sku", "stockQuantity", "description"])
      expect(Object.keys(vortexSummary ?? {})).not.toContain(key);
  });

  it("fails loudly on a broken price invariant", async () => {
    const broken = productRecord({ priceMinor: 1.5 });
    await expect(
      new ListCatalogProductsUseCase({
        catalogRepository: new InMemoryCatalog([], [broken]),
      }).execute(),
    ).rejects.toBeInstanceOf(InvalidMoneyError);
  });
});

describe("GetCatalogProductUseCase", () => {
  it("returns a published product with its description", async () => {
    const result = await new GetCatalogProductUseCase({ catalogRepository: catalog() }).execute({
      slug: "vortex-wireless-mouse",
    });
    expect(result).toMatchObject({
      slug: "vortex-wireless-mouse",
      description: "A wireless mouse.",
    });
    expect(Object.keys(result)).not.toContain("status");
  });

  it("treats a draft exactly like a missing product", async () => {
    const useCase = new GetCatalogProductUseCase({ catalogRepository: catalog() });
    await expect(useCase.execute({ slug: "draft-mouse" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(useCase.execute({ slug: "missing" })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a malformed slug without querying", async () => {
    const repository = catalog();
    await expect(
      new GetCatalogProductUseCase({ catalogRepository: repository }).execute({
        slug: "Vortex Wireless Mouse",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.productLookups).toEqual([]);
  });
});

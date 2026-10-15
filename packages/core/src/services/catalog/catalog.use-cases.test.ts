import { describe, expect, it } from "vitest";
import { InvalidMoneyError } from "../../domain/money";
import { NotFoundError } from "../../errors/app-error";
import { GetCatalogProductUseCase } from "./get-catalog-product.use-case";
import { COFFEE, EMPTY, InMemoryCatalog, productRecord } from "./in-memory-catalog.fixture";
import { ListCatalogCategoriesUseCase } from "./list-catalog-categories.use-case";
import { CATALOG_PAGE_LIMIT, ListCatalogProductsUseCase } from "./list-catalog-products.use-case";

const dripper = productRecord();
const kettle = productRecord({
  id: "p-2",
  slug: "gooseneck-kettle",
  name: "Gooseneck Kettle",
  stockQuantity: 0,
  category: null,
});
const draft = productRecord({
  id: "p-3",
  slug: "draft-beans",
  name: "Draft beans",
  status: "draft",
});

function catalog() {
  return new InMemoryCatalog([EMPTY, COFFEE], [kettle, draft, dripper], {
    [dripper.slug]: COFFEE.id,
    [draft.slug]: COFFEE.id,
  });
}

describe("ListCatalogCategoriesUseCase", () => {
  it("returns every category sorted by name, including empty ones", async () => {
    const result = await new ListCatalogCategoriesUseCase({
      catalogRepository: catalog(),
    }).execute();
    expect(result).toEqual([
      { slug: "coffee", name: "Coffee", description: "Beans" },
      { slug: "empty", name: "Empty", description: null },
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
    expect(result.products.map((p) => p.slug)).toEqual(["gooseneck-kettle", "v60-dripper"]);
    expect(result.total).toBe(2);
    expect(result.limit).toBe(48);
  });

  it("filters by category and always keeps the published criterion", async () => {
    const repository = catalog();
    const result = await new ListCatalogProductsUseCase({ catalogRepository: repository }).execute({
      categorySlug: "coffee",
    });

    expect(repository.criteria).toEqual([
      { status: "published", categoryId: COFFEE.id, limit: CATALOG_PAGE_LIMIT },
    ]);
    expect(result.category).toEqual({ slug: "coffee", name: "Coffee", description: "Beans" });
    expect(result.products.map((p) => p.slug)).toEqual(["v60-dripper"]);
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
    const [kettleSummary, dripperSummary] = result.products;

    expect(dripperSummary).toEqual({
      id: "p-1",
      slug: "v60-dripper",
      name: "V60 Dripper",
      price: { amountMinor: 8900, currency: "PLN" },
      category: { slug: "coffee", name: "Coffee" },
      availability: "in_stock",
      imageUrl: "/demo/products/v60-dripper.svg",
    });
    expect(kettleSummary).toMatchObject({ category: null, availability: "out_of_stock" });
    for (const key of ["status", "sku", "stockQuantity", "description"])
      expect(Object.keys(dripperSummary ?? {})).not.toContain(key);
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
      slug: "v60-dripper",
    });
    expect(result).toMatchObject({ slug: "v60-dripper", description: "A dripper." });
    expect(Object.keys(result)).not.toContain("status");
  });

  it("treats a draft exactly like a missing product", async () => {
    const useCase = new GetCatalogProductUseCase({ catalogRepository: catalog() });
    await expect(useCase.execute({ slug: "draft-beans" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(useCase.execute({ slug: "missing" })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a malformed slug without querying", async () => {
    const repository = catalog();
    await expect(
      new GetCatalogProductUseCase({ catalogRepository: repository }).execute({
        slug: "V60 Dripper",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.productLookups).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { EMPTY, InMemoryCatalog, MICE, productRecord } from "./in-memory-catalog.fixture";
import { ListCategoryCountsUseCase } from "./list-category-counts.use-case";

const KEYBOARDS = {
  id: "cat-keyboards",
  slug: "keyboards",
  name: "Keyboards",
  description: null,
  imageUrl: "/photos/product-keyboard-rgb.jpg",
};

const categoryIds = {
  "vortex-wireless-mouse": MICE.id,
  "titan-mmo-mouse": MICE.id,
  "draft-mouse": MICE.id,
  "nova-keyboard": KEYBOARDS.id,
};

const products = [
  productRecord(),
  productRecord({ id: "p-2", slug: "titan-mmo-mouse", name: "Titan", stockQuantity: 0 }),
  productRecord({ id: "p-3", slug: "draft-mouse", name: "Draft mouse", status: "draft" }),
  productRecord({
    id: "p-4",
    slug: "nova-keyboard",
    name: "Nova",
    category: { slug: KEYBOARDS.slug, name: KEYBOARDS.name },
  }),
];

describe("ListCategoryCountsUseCase", () => {
  it("counts published products per category and omits categories without any", async () => {
    const catalog = new InMemoryCatalog([MICE, EMPTY, KEYBOARDS], products, categoryIds);
    const useCase = new ListCategoryCountsUseCase({ catalogRepository: catalog });

    expect(await useCase.execute()).toEqual([
      {
        slug: "keyboards",
        name: "Keyboards",
        productCount: 1,
        imageUrl: "/photos/product-keyboard-rgb.jpg",
      },
      { slug: "mice", name: "Mice", productCount: 2, imageUrl: "/photos/category-mice.jpg" },
    ]);
  });

  it("carries a null image for a category without a photo", async () => {
    const catalog = new InMemoryCatalog([{ ...MICE, imageUrl: null }], [productRecord()], {
      "vortex-wireless-mouse": MICE.id,
    });
    const useCase = new ListCategoryCountsUseCase({ catalogRepository: catalog });

    expect(await useCase.execute()).toEqual([
      { slug: "mice", name: "Mice", productCount: 1, imageUrl: null },
    ]);
  });

  it("returns an empty list when no category holds a published product", async () => {
    const catalog = new InMemoryCatalog([EMPTY], [], {});
    const useCase = new ListCategoryCountsUseCase({ catalogRepository: catalog });

    expect(await useCase.execute()).toEqual([]);
  });
});

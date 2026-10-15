import { beforeEach, describe, expect, it } from "vitest";
import { isNotFoundError, isUniqueFieldConflict, hasAppErrorCode } from "../../errors/app-error";
import { CATEGORY_PRODUCT_PREVIEW_LIMIT } from "./category.dto";
import { CreateCategoryUseCase } from "./create-category.use-case";
import { categoryInUseMessage, DeleteCategoryUseCase } from "./delete-category.use-case";
import { GetCategoryUseCase } from "./get-category.use-case";
import {
  InMemoryCategoryRepository,
  MICE_ID,
  MISSING_ID,
  MOUSEPADS_ID,
} from "./in-memory-category-repository.fixture";
import { ListCategoriesUseCase } from "./list-categories.use-case";
import { UpdateCategoryUseCase } from "./update-category.use-case";

let categoryRepository: InMemoryCategoryRepository;

beforeEach(() => {
  categoryRepository = new InMemoryCategoryRepository();
});

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("expected a rejection");
    },
    (error: unknown) => error,
  );
}

describe("ListCategoriesUseCase", () => {
  it("lists categories by name with their product counts", async () => {
    categoryRepository.addProducts(MICE_ID, 2);
    const categories = await new ListCategoriesUseCase({ categoryRepository }).execute();
    expect(categories).toEqual([
      { id: MICE_ID, slug: "mice", name: "Mice", description: "Gaming mice", productCount: 2 },
      {
        id: MOUSEPADS_ID,
        slug: "mousepads",
        name: "Mousepads",
        description: null,
        productCount: 0,
      },
    ]);
  });
});

describe("GetCategoryUseCase", () => {
  const useCase = () => new GetCategoryUseCase({ categoryRepository });

  it("returns an empty category without listing products", async () => {
    expect(await useCase().execute({ id: MOUSEPADS_ID })).toMatchObject({
      slug: "mousepads",
      productCount: 0,
      products: [],
    });
  });

  it("returns the first products of a used category, capped at the preview limit", async () => {
    categoryRepository.addProducts(MICE_ID, 12);
    const category = await useCase().execute({ id: MICE_ID });
    expect(category.productCount).toBe(12);
    expect(category.products).toHaveLength(CATEGORY_PRODUCT_PREVIEW_LIMIT);
    expect(category.products[0]).toEqual({ id: "p-01", slug: "product-01", name: "Product 01" });
  });

  it.each([MISSING_ID, "not-a-uuid", ""])("treats %j as not found", async (id) => {
    const error = await rejection(useCase().execute({ id }));
    expect(isNotFoundError(error)).toBe(true);
  });
});

describe("CreateCategoryUseCase", () => {
  const useCase = () => new CreateCategoryUseCase({ categoryRepository });

  it("creates a category with no products", async () => {
    const created = await useCase().execute({
      name: "Headsets",
      slug: "headsets",
      description: null,
    });
    expect(created).toMatchObject({ name: "Headsets", slug: "headsets", productCount: 0 });
    expect(categoryRepository.categories.has(created.id)).toBe(true);
  });

  it("passes on the repository's slug conflict", async () => {
    const error = await rejection(
      useCase().execute({ name: "Mice again", slug: "mice", description: null }),
    );
    expect(isUniqueFieldConflict(error)).toBe(true);
  });
});

describe("UpdateCategoryUseCase", () => {
  const useCase = () => new UpdateCategoryUseCase({ categoryRepository });

  it("updates name, slug and description", async () => {
    const updated = await useCase().execute({
      id: MICE_ID,
      values: { name: "Gaming mice", slug: "gaming-mice", description: null },
    });
    expect(updated).toEqual({
      id: MICE_ID,
      slug: "gaming-mice",
      name: "Gaming mice",
      description: null,
      productCount: 0,
    });
  });

  it.each([MISSING_ID, "not-a-uuid"])("treats %j as not found", async (id) => {
    const error = await rejection(
      useCase().execute({ id, values: { name: "X", slug: "x", description: null } }),
    );
    expect(isNotFoundError(error)).toBe(true);
  });
});

describe("DeleteCategoryUseCase", () => {
  const useCase = () => new DeleteCategoryUseCase({ categoryRepository });

  it("deletes an empty category", async () => {
    await useCase().execute({ id: MOUSEPADS_ID });
    expect(categoryRepository.categories.has(MOUSEPADS_ID)).toBe(false);
  });

  it("refuses a category that products use, naming the count, and keeps it", async () => {
    categoryRepository.addProducts(MICE_ID, 3);
    const error = await rejection(useCase().execute({ id: MICE_ID }));
    expect(hasAppErrorCode(error, "CONFLICT")).toBe(true);
    expect(error).toMatchObject({
      message:
        "3 products still use this category. Move them to another category or remove the category from them first.",
    });
    expect(categoryRepository.categories.has(MICE_ID)).toBe(true);
  });

  it.each([MISSING_ID, "not-a-uuid"])("treats %j as not found", async (id) => {
    const error = await rejection(useCase().execute({ id }));
    expect(isNotFoundError(error)).toBe(true);
  });

  it("uses the singular for one product", () => {
    expect(categoryInUseMessage(1)).toBe(
      "1 product still uses this category. Move it to another category or remove the category from it first.",
    );
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import {
  hasAppErrorCode,
  isNotFoundError,
  isUniqueFieldConflict,
  ValidationError,
} from "../../errors/app-error";
import {
  PUBLISH_PRICE_MESSAGE,
  PUBLISHED_PRICE_MESSAGE,
} from "../../validators/products/product-input.schema";
import type { ProductCreate, ProductWrite } from "../../ports/catalog.port";
import { CreateProductUseCase } from "./create-product.use-case";
import { GetProductUseCase } from "./get-product.use-case";
import {
  InMemoryProductRepository,
  MICE_CATEGORY,
  MISSING_PRODUCT_ID,
  TITAN_ID,
  VORTEX,
  VORTEX_ID,
} from "./in-memory-product-repository.fixture";
import { ListProductsUseCase } from "./list-products.use-case";
import { SetProductStatusUseCase } from "./set-product-status.use-case";
import { UpdateProductUseCase } from "./update-product.use-case";

let productRepository: InMemoryProductRepository;

beforeEach(() => {
  productRepository = new InMemoryProductRepository();
});

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("expected a rejection");
    },
    (error: unknown) => error,
  );
}

const phantom: ProductWrite = {
  name: "Phantom Pro Mouse",
  slug: "phantom-pro-mouse",
  description: "",
  priceMinor: 19990,
  sku: "DEMO-MOU-009",
  categoryId: MICE_CATEGORY.id,
  imageUrl: null,
  featured: false,
};
const newPhantom: ProductCreate = { ...phantom, status: "draft", stockQuantity: 5 };

describe("ListProductsUseCase", () => {
  it("lists every product by name with its store availability", async () => {
    const products = await new ListProductsUseCase({ productRepository }).execute();
    expect(products.map(({ name, availability }) => [name, availability])).toEqual([
      ["Titan MMO Mouse", "hidden"],
      ["Vortex Wireless Mouse", "available"],
    ]);
  });
});

describe("GetProductUseCase", () => {
  const useCase = () => new GetProductUseCase({ productRepository });

  it("returns the product as a DTO with its availability", async () => {
    expect(await useCase().execute({ id: VORTEX_ID })).toEqual({
      ...VORTEX,
      availability: "available",
    });
  });

  it.each([MISSING_PRODUCT_ID, "not-a-uuid", ""])("treats %j as not found", async (id) => {
    expect(isNotFoundError(await rejection(useCase().execute({ id })))).toBe(true);
  });
});

describe("CreateProductUseCase", () => {
  const useCase = () => new CreateProductUseCase({ productRepository });

  it("creates a product with its initial status and stock", async () => {
    const created = await useCase().execute(newPhantom);
    expect(created).toMatchObject({
      name: "Phantom Pro Mouse",
      stockQuantity: 5,
      status: "draft",
      currency: "PLN",
      category: MICE_CATEGORY,
      availability: "hidden",
    });
    expect(productRepository.products.has(created.id)).toBe(true);
  });

  it("creates a featured, published product without stock as out of stock", async () => {
    const created = await useCase().execute({
      ...newPhantom,
      categoryId: null,
      featured: true,
      status: "published",
      stockQuantity: 0,
    });
    expect(created).toMatchObject({ featured: true, category: null, availability: "out_of_stock" });
  });

  it("passes on the repository's slug, SKU and category errors", async () => {
    const slug = await rejection(useCase().execute({ ...newPhantom, slug: VORTEX.slug }));
    expect(slug).toMatchObject({ field: "slug" });
    const sku = await rejection(useCase().execute({ ...newPhantom, sku: "DEMO-MOU-001" }));
    expect(isUniqueFieldConflict(sku)).toBe(true);
    expect(sku).toMatchObject({ field: "sku" });
    const category = await rejection(
      useCase().execute({ ...newPhantom, categoryId: MISSING_PRODUCT_ID }),
    );
    expect(hasAppErrorCode(category, "VALIDATION_FAILED")).toBe(true);
  });
});

describe("UpdateProductUseCase", () => {
  const useCase = () => new UpdateProductUseCase({ productRepository });

  it("updates the details and keeps stock and status", async () => {
    const updated = await useCase().execute({
      id: VORTEX_ID,
      values: { ...phantom, sku: null },
    });
    expect(updated).toMatchObject({
      id: VORTEX_ID,
      name: "Phantom Pro Mouse",
      sku: null,
      stockQuantity: 8,
      status: "published",
      availability: "available",
    });
  });

  it("turns Featured on and off", async () => {
    const on = await useCase().execute({ id: TITAN_ID, values: { ...phantom, featured: true } });
    expect(on.featured).toBe(true);
    const off = await useCase().execute({ id: TITAN_ID, values: { ...phantom, featured: false } });
    expect(off.featured).toBe(false);
  });

  it("keeps its own SKU but refuses another product's", async () => {
    const own = await useCase().execute({
      id: VORTEX_ID,
      values: { ...phantom, slug: VORTEX.slug, sku: VORTEX.sku },
    });
    expect(own.sku).toBe("DEMO-MOU-001");
    const error = await rejection(
      useCase().execute({ id: TITAN_ID, values: { ...phantom, sku: "DEMO-MOU-001" } }),
    );
    expect(error).toMatchObject({ field: "sku" });
  });

  it.each([MISSING_PRODUCT_ID, "not-a-uuid"])("treats %j as not found", async (id) => {
    expect(isNotFoundError(await rejection(useCase().execute({ id, values: phantom })))).toBe(true);
    expect(
      isNotFoundError(
        await rejection(useCase().execute({ id, values: { ...phantom, priceMinor: 0 } })),
      ),
    ).toBe(true);
  });

  it("refuses 0.00 for a published product under the price field (#41)", async () => {
    const error = await rejection(
      useCase().execute({ id: VORTEX_ID, values: { ...phantom, priceMinor: 0 } }),
    );
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ fieldErrors: { price: [PUBLISHED_PRICE_MESSAGE] } });
    expect((await productRepository.findById(VORTEX_ID))?.priceMinor).toBe(VORTEX.priceMinor);
  });

  it("lets a draft be saved at 0.00", async () => {
    const draft = await useCase().execute({ id: TITAN_ID, values: { ...phantom, priceMinor: 0 } });
    expect(draft).toMatchObject({ status: "draft", priceMinor: 0 });
  });
});

describe("SetProductStatusUseCase", () => {
  const useCase = () => new SetProductStatusUseCase({ productRepository });

  it("publishes and unpublishes, returning the new availability", async () => {
    const published = await useCase().execute({ id: TITAN_ID, status: "published" });
    expect(published).toMatchObject({ status: "published", availability: "out_of_stock" });
    const hidden = await useCase().execute({ id: VORTEX_ID, status: "draft" });
    expect(hidden).toMatchObject({ status: "draft", availability: "hidden" });
  });

  it.each([MISSING_PRODUCT_ID, "not-a-uuid"])("treats %j as not found", async (id) => {
    expect(isNotFoundError(await rejection(useCase().execute({ id, status: "draft" })))).toBe(true);
    expect(isNotFoundError(await rejection(useCase().execute({ id, status: "published" })))).toBe(
      true,
    );
  });

  it("refuses to publish a draft priced at 0.00 (#41)", async () => {
    await new UpdateProductUseCase({ productRepository }).execute({
      id: TITAN_ID,
      values: { ...phantom, priceMinor: 0 },
    });
    const error = await rejection(useCase().execute({ id: TITAN_ID, status: "published" }));
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ message: PUBLISH_PRICE_MESSAGE });
    expect((await productRepository.findById(TITAN_ID))?.status).toBe("draft");
  });
});

import {
  NotFoundError,
  money,
  type CatalogListing,
  type CatalogProductDetail,
} from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listCategories = vi.fn();
const listProducts = vi.fn();
const getProduct = vi.fn();
const dispose = vi.fn(async () => {});

vi.mock("@/server/container", () => ({
  createRequestScope: () => ({
    cradle: {
      listCatalogCategoriesUseCase: { execute: listCategories },
      listCatalogProductsUseCase: { execute: listProducts },
      getCatalogProductUseCase: { execute: getProduct },
    },
    dispose,
  }),
}));

const { loadStorefrontCategories } = await import("./load-storefront-categories");
const { loadCatalogPage } = await import("./products/load-catalog-page");
const { loadProductPage, productPageTitle } = await import("./products/[slug]/load-product-page");

const categories = [{ slug: "coffee", name: "Coffee", description: null }];
const listing: CatalogListing = { category: null, products: [], total: 0, limit: 48 };
const product: CatalogProductDetail = {
  id: "p-1",
  slug: "v60-dripper",
  name: "V60 Dripper",
  description: "A dripper.",
  price: money(8900, "PLN"),
  category: null,
  availability: "in_stock",
  imageUrl: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("loadStorefrontCategories", () => {
  it("returns the categories and disposes the scope", async () => {
    listCategories.mockResolvedValue(categories);
    await expect(loadStorefrontCategories()).resolves.toEqual({ kind: "ok", data: categories });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("returns the error state when the catalog cannot be read", async () => {
    listCategories.mockRejectedValue(new Error("database down"));
    await expect(loadStorefrontCategories()).resolves.toEqual({ kind: "error" });
  });
});

describe("loadCatalogPage", () => {
  it("returns categories and the listing for a category", async () => {
    listCategories.mockResolvedValue(categories);
    listProducts.mockResolvedValue(listing);

    await expect(loadCatalogPage({ category: "coffee", categoryInvalid: false })).resolves.toEqual({
      kind: "ok",
      data: { categories, listing },
    });
    expect(listProducts).toHaveBeenCalledWith({ categorySlug: "coffee" });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("keeps the navigation and has no listing for an unknown category", async () => {
    listCategories.mockResolvedValue(categories);
    listProducts.mockRejectedValue(new NotFoundError());

    await expect(loadCatalogPage({ category: "missing", categoryInvalid: false })).resolves.toEqual(
      { kind: "ok", data: { categories, listing: null } },
    );
  });

  it("does not query products for a malformed category", async () => {
    listCategories.mockResolvedValue(categories);

    await expect(loadCatalogPage({ categoryInvalid: true })).resolves.toEqual({
      kind: "ok",
      data: { categories, listing: null },
    });
    expect(listProducts).not.toHaveBeenCalled();
  });

  it("returns the error state when the listing fails", async () => {
    listCategories.mockResolvedValue(categories);
    listProducts.mockRejectedValue(new Error("database down"));

    await expect(loadCatalogPage({ categoryInvalid: false })).resolves.toEqual({ kind: "error" });
    expect(dispose).toHaveBeenCalledOnce();
  });
});

describe("loadProductPage", () => {
  it("returns a published product", async () => {
    getProduct.mockResolvedValue(product);
    await expect(loadProductPage("v60-dripper")).resolves.toEqual({ kind: "ok", data: product });
    expect(getProduct).toHaveBeenCalledWith({ slug: "v60-dripper" });
  });

  it("maps a draft or missing product to not-found", async () => {
    getProduct.mockRejectedValue(new NotFoundError());
    await expect(loadProductPage("e2e-draft-kettle")).resolves.toEqual({ kind: "not-found" });
  });

  it("titles the page without leaking anything but a published product", () => {
    expect(productPageTitle({ kind: "ok", data: product })).toBe("V60 Dripper");
    expect(productPageTitle({ kind: "not-found" })).toBe("Product not found");
    expect(productPageTitle({ kind: "error" })).toBe("Products");
  });
});

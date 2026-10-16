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
const listFeatured = vi.fn();
const dispose = vi.fn(async () => {});

vi.mock("@/server/container", () => ({
  createRequestScope: () => ({
    cradle: {
      listCatalogCategoriesUseCase: { execute: listCategories },
      listCatalogProductsUseCase: { execute: listProducts },
      getCatalogProductUseCase: { execute: getProduct },
      listFeaturedProductsUseCase: { execute: listFeatured },
    },
    dispose,
  }),
}));

const { loadStorefrontCategories } = await import("./load-storefront-categories");
const { buildFeaturedTabs, loadHomePage } = await import("./load-home-page");
const { loadCatalogPage } = await import("./products/load-catalog-page");
const { loadProductPage, productPageTitle } = await import("./products/[slug]/load-product-page");

const categories = [{ slug: "mice", name: "Mice", description: null }];
const listing: CatalogListing = { category: null, products: [], total: 0, limit: 48 };
const product: CatalogProductDetail = {
  id: "p-1",
  slug: "vortex-wireless-mouse",
  name: "Vortex Wireless Mouse",
  description: "A wireless mouse.",
  price: money(24900, "PLN"),
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

describe("loadHomePage", () => {
  const mice = { slug: "mice", name: "Mice", description: null };

  it("shows every featured product under the active All tab without a category", async () => {
    listCategories.mockResolvedValue(categories);
    listFeatured.mockResolvedValue({ category: null, products: [product] });

    await expect(loadHomePage({})).resolves.toEqual({
      kind: "ok",
      data: {
        tabs: [
          { key: "all", label: "All", href: "/", active: true },
          { key: "mice", label: "Mice", href: "/?category=mice", active: false },
        ],
        active: null,
        products: [product],
      },
    });
    expect(listFeatured).toHaveBeenCalledWith({});
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("narrows the slider to a valid category and marks its tab", async () => {
    listCategories.mockResolvedValue(categories);
    listFeatured.mockResolvedValue({ category: mice, products: [] });

    const result = await loadHomePage({ category: ["Mice", "keyboards"] });

    expect(listFeatured).toHaveBeenCalledWith({ categorySlug: "mice" });
    expect(result).toMatchObject({ kind: "ok", data: { active: mice, products: [] } });
    expect(result.kind === "ok" && result.data.tabs.filter((tab) => tab.active)).toEqual([
      { key: "mice", label: "Mice", href: "/?category=mice", active: true },
    ]);
  });

  it("shows All for a malformed category without passing it on (spec G19)", async () => {
    listCategories.mockResolvedValue(categories);
    listFeatured.mockResolvedValue({ category: null, products: [] });

    const result = await loadHomePage({ category: "not a slug!" });

    expect(listFeatured).toHaveBeenCalledWith({});
    expect(result.kind === "ok" && result.data.tabs[0]?.active).toBe(true);
  });

  it("returns the error state when the catalog cannot be read", async () => {
    listCategories.mockRejectedValue(new Error("database down"));
    await expect(loadHomePage({})).resolves.toEqual({ kind: "error" });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("builds tabs with exactly one active entry", () => {
    expect(buildFeaturedTabs([], null)).toEqual([
      { key: "all", label: "All", href: "/", active: true },
    ]);
    expect(buildFeaturedTabs(categories, "mice").map((tab) => tab.active)).toEqual([false, true]);
  });
});

describe("loadCatalogPage", () => {
  it("returns categories and the listing for a category", async () => {
    listCategories.mockResolvedValue(categories);
    listProducts.mockResolvedValue(listing);

    await expect(loadCatalogPage({ category: "mice", categoryInvalid: false })).resolves.toEqual({
      kind: "ok",
      data: { categories, listing, unknownCategory: false },
    });
    expect(listProducts).toHaveBeenCalledWith({ categorySlug: "mice", search: undefined });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("keeps the navigation and has no listing for an unknown category", async () => {
    listCategories.mockResolvedValue(categories);
    listProducts.mockRejectedValue(new NotFoundError());

    await expect(loadCatalogPage({ category: "missing", categoryInvalid: false })).resolves.toEqual(
      { kind: "ok", data: { categories, listing: null, unknownCategory: true } },
    );
  });

  it("does not query products for a malformed category", async () => {
    listCategories.mockResolvedValue(categories);

    await expect(loadCatalogPage({ categoryInvalid: true })).resolves.toEqual({
      kind: "ok",
      data: { categories, listing: null, unknownCategory: true },
    });
    expect(listProducts).not.toHaveBeenCalled();
  });

  it("passes the search term together with the category", async () => {
    listCategories.mockResolvedValue(categories);
    listProducts.mockResolvedValue(listing);

    await loadCatalogPage({ category: "mice", categoryInvalid: false, q: "wireless" });
    expect(listProducts).toHaveBeenCalledWith({ categorySlug: "mice", search: "wireless" });
  });

  it("runs no product query for a too-long search term but keeps the navigation", async () => {
    listCategories.mockResolvedValue(categories);

    await expect(loadCatalogPage({ categoryInvalid: false, qError: "too_long" })).resolves.toEqual({
      kind: "ok",
      data: { categories, listing: null, unknownCategory: false },
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
    await expect(loadProductPage("vortex-wireless-mouse")).resolves.toEqual({
      kind: "ok",
      data: product,
    });
    expect(getProduct).toHaveBeenCalledWith({ slug: "vortex-wireless-mouse" });
  });

  it("maps a draft or missing product to not-found", async () => {
    getProduct.mockRejectedValue(new NotFoundError());
    await expect(loadProductPage("e2e-draft-keyboard")).resolves.toEqual({ kind: "not-found" });
  });

  it("titles the page without leaking anything but a published product", () => {
    expect(productPageTitle({ kind: "ok", data: product })).toBe("Vortex Wireless Mouse");
    expect(productPageTitle({ kind: "not-found" })).toBe("Product not found");
    expect(productPageTitle({ kind: "error" })).toBe("Products");
  });
});

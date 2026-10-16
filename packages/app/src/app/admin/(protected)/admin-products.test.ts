import { NotFoundError } from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/server/logger";

const listProducts = vi.fn();
const getProduct = vi.fn();
const listCategories = vi.fn();
const dispose = vi.fn(async () => {});

vi.mock("@/server/container", () => ({
  createRequestScope: () => ({
    cradle: {
      listProductsUseCase: { execute: listProducts },
      getProductUseCase: { execute: getProduct },
      listCategoriesUseCase: { execute: listCategories },
    },
    dispose,
  }),
}));

const { loadAdminProduct, loadAdminProducts, loadNewProductForm } =
  await import("./products/load-products");

const mice = { id: "c-1", slug: "mice", name: "Mice", description: null, productCount: 4 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(logger, "error").mockImplementation(() => {});
  listCategories.mockResolvedValue([mice]);
});

describe("admin product loaders", () => {
  it("lists products and disposes the scope", async () => {
    listProducts.mockResolvedValue([]);
    await expect(loadAdminProducts()).resolves.toEqual({ kind: "ok", data: [] });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("loads the category options for a new product", async () => {
    await expect(loadNewProductForm()).resolves.toEqual({
      kind: "ok",
      data: [{ id: "c-1", name: "Mice" }],
    });
  });

  it("loads one product with the category options, or reports not-found", async () => {
    getProduct.mockResolvedValueOnce({ id: "p-1" });
    await expect(loadAdminProduct("p-1")).resolves.toEqual({
      kind: "ok",
      data: { product: { id: "p-1" }, categories: [{ id: "c-1", name: "Mice" }] },
    });
    expect(getProduct).toHaveBeenCalledWith({ id: "p-1" });

    getProduct.mockRejectedValueOnce(new NotFoundError());
    await expect(loadAdminProduct("missing")).resolves.toEqual({ kind: "not-found" });
  });

  it("turns a failure into the error state and logs the page", async () => {
    listProducts.mockRejectedValue(new Error("database down"));
    await expect(loadAdminProducts()).resolves.toEqual({ kind: "error" });
    expect(logger.error).toHaveBeenCalledWith(
      "Page data could not be loaded",
      expect.objectContaining({ page: "/admin/products" }),
    );
  });
});

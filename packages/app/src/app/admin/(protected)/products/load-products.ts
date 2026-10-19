import "server-only";
import type { AdminProduct, StockAdjustment } from "@commerceos/core";
import type { ProductCategoryOption } from "@/components/admin/products/product-form-view";
import type { Cradle } from "@/server/container";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";

/** The categories a product can be assigned to, by name, as select options. */
async function categoryOptions(cradle: Cradle): Promise<ProductCategoryOption[]> {
  const categories = await cradle.listCategoriesUseCase.execute();
  return categories.map(({ id, name }) => ({ id, name }));
}

/** Every product with its availability, sorted by name, for `/admin/products`. */
export function loadAdminProducts(): Promise<LoadResult<AdminProduct[]>> {
  return loadWithRequestScope({ page: "/admin/products" }, (cradle) =>
    cradle.listProductsUseCase.execute(),
  );
}

/** Whether AI description drafts can run (descriptions spec, Phase 2): an LLM key is set. */
function aiDraftAvailable(cradle: Cradle): boolean {
  return cradle.llmProvider.isConfigured;
}

export type NewProductFormData = {
  categories: ProductCategoryOption[];
  aiDraftAvailable: boolean;
};

/** The category options for `/admin/products/new`, and whether AI drafts are available. */
export function loadNewProductForm(): Promise<LoadResult<NewProductFormData>> {
  return loadWithRequestScope({ page: "/admin/products/new" }, async (cradle) => ({
    categories: await categoryOptions(cradle),
    aiDraftAvailable: aiDraftAvailable(cradle),
  }));
}

export type AdminProductPageData = {
  product: AdminProduct;
  categories: ProductCategoryOption[];
  /** The last stock changes, newest first (spec Phase 2, "Stock panel"). */
  stockHistory: StockAdjustment[];
  aiDraftAvailable: boolean;
};

/**
 * One product, the category options and its stock history; a malformed or unknown id is
 * "not-found".
 */
export function loadAdminProduct(id: string): Promise<LoadResult<AdminProductPageData>> {
  return loadWithRequestScope({ page: "/admin/products/[id]" }, async (cradle) => ({
    product: await cradle.getProductUseCase.execute({ id }),
    categories: await categoryOptions(cradle),
    stockHistory: await cradle.listStockAdjustmentsUseCase.execute({ productId: id }),
    aiDraftAvailable: aiDraftAvailable(cradle),
  }));
}

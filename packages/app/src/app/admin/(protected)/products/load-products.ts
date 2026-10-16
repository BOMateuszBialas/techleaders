import "server-only";
import type { AdminProduct } from "@commerceos/core";
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

/** The category options for `/admin/products/new`. */
export function loadNewProductForm(): Promise<LoadResult<ProductCategoryOption[]>> {
  return loadWithRequestScope({ page: "/admin/products/new" }, categoryOptions);
}

export type AdminProductPageData = {
  product: AdminProduct;
  categories: ProductCategoryOption[];
};

/** One product and the category options; a malformed or unknown id is "not-found". */
export function loadAdminProduct(id: string): Promise<LoadResult<AdminProductPageData>> {
  return loadWithRequestScope({ page: "/admin/products/[id]" }, async (cradle) => ({
    product: await cradle.getProductUseCase.execute({ id }),
    categories: await categoryOptions(cradle),
  }));
}

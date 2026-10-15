import "server-only";
import type { CatalogCategory } from "@commerceos/core";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";

/** Every category for the storefront home page. */
export function loadStorefrontCategories(): Promise<LoadResult<CatalogCategory[]>> {
  return loadWithRequestScope({ page: "/" }, (cradle) =>
    cradle.listCatalogCategoriesUseCase.execute(),
  );
}

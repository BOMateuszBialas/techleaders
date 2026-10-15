import "server-only";
import type { CatalogCategory } from "@commerceos/core";
import { cache } from "react";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";

/**
 * Every category, for the storefront header menu and footer. Wrapped in React `cache()`, so
 * the header and the footer share one query per request.
 */
export const loadStorefrontCategories = cache((): Promise<LoadResult<CatalogCategory[]>> =>
  loadWithRequestScope({ page: "storefront-shell" }, (cradle) =>
    cradle.listCatalogCategoriesUseCase.execute(),
  ),
);

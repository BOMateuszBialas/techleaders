import "server-only";
import {
  isNotFoundError,
  type CatalogCategory,
  type CatalogListing,
  type CatalogQuery,
} from "@commerceos/core";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";

export type CatalogPageData = {
  categories: CatalogCategory[];
  /** null when the requested category is unknown or malformed (spec Q11). */
  listing: CatalogListing | null;
};

/**
 * Categories for the navigation plus the listing for the parsed query. An unknown or
 * malformed category keeps the navigation and yields `listing: null`, not an error.
 */
export function loadCatalogPage(query: CatalogQuery): Promise<LoadResult<CatalogPageData>> {
  return loadWithRequestScope({ page: "/products", slug: query.category }, async (cradle) => {
    const categories = await cradle.listCatalogCategoriesUseCase.execute();
    if (query.categoryInvalid) return { categories, listing: null };
    try {
      const listing = await cradle.listCatalogProductsUseCase.execute({
        categorySlug: query.category,
      });
      return { categories, listing };
    } catch (error) {
      if (isNotFoundError(error)) return { categories, listing: null };
      throw error;
    }
  });
}

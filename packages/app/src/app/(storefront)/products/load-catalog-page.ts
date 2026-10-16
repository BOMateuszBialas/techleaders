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
  /**
   * null when the requested category is unknown or malformed (spec Q11), or when the search
   * term is too long (`query.qError`, spec Q14): no product query runs then.
   */
  listing: CatalogListing | null;
  /** The requested category is unknown or malformed; the page says it does not exist. */
  unknownCategory: boolean;
};

/**
 * Categories for the navigation and the search form, plus the listing for the parsed query
 * (category and search term combined). An unknown or malformed category, or a too-long search
 * term, keeps the navigation and yields `listing: null`, not an error. The search term is never
 * logged.
 */
export function loadCatalogPage(query: CatalogQuery): Promise<LoadResult<CatalogPageData>> {
  return loadWithRequestScope({ page: "/products", slug: query.category }, async (cradle) => {
    const categories = await cradle.listCatalogCategoriesUseCase.execute();
    if (query.categoryInvalid) return { categories, listing: null, unknownCategory: true };
    if (query.qError) return { categories, listing: null, unknownCategory: false };
    try {
      const listing = await cradle.listCatalogProductsUseCase.execute({
        categorySlug: query.category,
        search: query.q,
      });
      return { categories, listing, unknownCategory: false };
    } catch (error) {
      if (isNotFoundError(error)) return { categories, listing: null, unknownCategory: true };
      throw error;
    }
  });
}

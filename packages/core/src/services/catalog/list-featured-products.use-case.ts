import type { CatalogReadPort } from "../../ports/catalog-read.port";
import {
  toCatalogCategory,
  toCatalogProductSummary,
  type CatalogCategory,
  type CatalogProductSummary,
} from "./catalog.dto";

/** At most this many products in the home page's featured slider (spec G16). */
export const FEATURED_PRODUCTS_LIMIT = 12;

export type ListFeaturedProductsInput = { categorySlug?: string };

export type FeaturedProducts = {
  /** The tab shown: a category, or null for "All" (also when the requested slug is unknown). */
  category: CatalogCategory | null;
  products: CatalogProductSummary[];
};

/**
 * Published featured products for the home page slider, sorted by name. Drafts never appear;
 * out-of-stock products do (spec G18). An unknown category falls back to all categories
 * instead of failing (spec G19): the home page shows no error for a stale tab link.
 */
export class ListFeaturedProductsUseCase {
  constructor(private readonly deps: { catalogRepository: CatalogReadPort }) {}

  async execute(input: ListFeaturedProductsInput = {}): Promise<FeaturedProducts> {
    const repository = this.deps.catalogRepository;
    const category = input.categorySlug
      ? await repository.findCategoryBySlug(input.categorySlug)
      : null;
    // Visibility is decided here, never by the adapter: shoppers see published products only.
    const { items } = await repository.findProducts({
      status: "published",
      featured: true,
      ...(category ? { categoryId: category.id } : {}),
      limit: FEATURED_PRODUCTS_LIMIT,
    });
    return {
      category: category ? toCatalogCategory(category) : null,
      products: items.map(toCatalogProductSummary),
    };
  }
}

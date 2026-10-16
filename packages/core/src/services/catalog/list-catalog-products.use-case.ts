import { NotFoundError, ValidationError } from "../../errors/app-error";
import type { CatalogReadPort } from "../../ports/catalog-read.port";
import {
  toCatalogCategory,
  toCatalogProductSummary,
  type CatalogCategory,
  type CatalogProductSummary,
} from "./catalog.dto";
import { catalogSearchSchema } from "../../validators/catalog/catalog-query.schema";

/** At most this many products per listing; there is no pagination (spec Q6). */
export const CATALOG_PAGE_LIMIT = 48;

export type ListCatalogProductsInput = {
  categorySlug?: string;
  /** A search term; blank means no search (spec Q14). Combines with the category as AND. */
  search?: string;
};

export type CatalogListing = {
  /** The selected category, or null for all products. */
  category: CatalogCategory | null;
  products: CatalogProductSummary[];
  /** Number of matching products, which can exceed `products.length` (up to `limit` shown). */
  total: number;
  limit: number;
};

/**
 * Published products for the storefront, optionally within one category and matching a
 * search term, sorted by name.
 */
export class ListCatalogProductsUseCase {
  constructor(private readonly deps: { catalogRepository: CatalogReadPort }) {}

  /**
   * Throws `ValidationError` for a search term over the length limit (before any query) and
   * `NotFoundError` when `categorySlug` names no category.
   */
  async execute(input: ListCatalogProductsInput = {}): Promise<CatalogListing> {
    const parsedSearch = catalogSearchSchema.safeParse(input.search ?? "");
    if (!parsedSearch.success) {
      throw new ValidationError("Search term is too long.", { search: ["Too long."] });
    }
    const search = parsedSearch.data;
    const repository = this.deps.catalogRepository;
    const category = input.categorySlug
      ? await repository.findCategoryBySlug(input.categorySlug)
      : null;
    if (input.categorySlug && !category) throw new NotFoundError("Category not found.");

    // Visibility is decided here, never by the adapter: shoppers see published products only.
    const { items, total } = await repository.findProducts({
      status: "published",
      ...(category ? { categoryId: category.id } : {}),
      ...(search ? { search } : {}),
      limit: CATALOG_PAGE_LIMIT,
    });
    return {
      category: category ? toCatalogCategory(category) : null,
      products: items.map(toCatalogProductSummary),
      total,
      limit: CATALOG_PAGE_LIMIT,
    };
  }
}

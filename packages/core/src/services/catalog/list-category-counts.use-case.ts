import type { CatalogReadPort } from "../../ports/catalog-read.port";

/** A category shown as a home page tile, with its published product count. */
export type CategoryCount = {
  slug: string;
  name: string;
  productCount: number;
  /** The tile photo path, or null for "No photo yet" (OA-11a). */
  imageUrl: string | null;
};

/**
 * The categories that hold at least one published product, sorted by name (storefront v2 Q12:
 * an empty category is omitted from the home page). Drafts never count; out-of-stock products do.
 */
export class ListCategoryCountsUseCase {
  constructor(private readonly deps: { catalogRepository: CatalogReadPort }) {}

  async execute(): Promise<CategoryCount[]> {
    const counts = await this.deps.catalogRepository.countPublishedProductsByCategory();
    return counts
      .filter((category) => category.productCount > 0)
      .map(({ slug, name, productCount, imageUrl }) => ({ slug, name, productCount, imageUrl }));
  }
}

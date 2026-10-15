import type { CatalogReadPort } from "../../ports/catalog-read.port";
import { toCatalogCategory, type CatalogCategory } from "./catalog.dto";

/** Every category for storefront navigation, sorted by name (empty ones included, spec Q12). */
export class ListCatalogCategoriesUseCase {
  constructor(private readonly deps: { catalogRepository: CatalogReadPort }) {}

  async execute(): Promise<CatalogCategory[]> {
    const categories = await this.deps.catalogRepository.listCategories();
    return categories.map(toCatalogCategory);
  }
}

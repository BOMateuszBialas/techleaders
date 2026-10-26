import type {
  CatalogCategoryCountRecord,
  CatalogCategoryRecord,
  CatalogProductCriteria,
  CatalogProductRecord,
  CatalogReadPort,
} from "../../ports/catalog-read.port";

export const MICE: CatalogCategoryRecord = {
  id: "cat-mice",
  slug: "mice",
  name: "Mice",
  description: "Gaming mice",
};
export const EMPTY: CatalogCategoryRecord = {
  id: "cat-empty",
  slug: "empty",
  name: "Empty",
  description: null,
};

export function productRecord(overrides: Partial<CatalogProductRecord> = {}): CatalogProductRecord {
  return {
    id: "p-1",
    slug: "vortex-wireless-mouse",
    name: "Vortex Wireless Mouse",
    description: "A wireless mouse.",
    priceMinor: 24900,
    currency: "PLN",
    stockQuantity: 8,
    imageUrl: "/demo/products/vortex-wireless-mouse.svg",
    status: "published",
    featured: false,
    category: { slug: MICE.slug, name: MICE.name },
    ...overrides,
  };
}

/**
 * An in-memory `CatalogReadPort` that applies criteria the way the database adapter does.
 * `productCategoryIds` maps a product slug to its category id.
 */
export class InMemoryCatalog implements CatalogReadPort {
  readonly criteria: CatalogProductCriteria[] = [];
  readonly productLookups: string[] = [];

  constructor(
    private readonly categories: CatalogCategoryRecord[],
    private readonly products: CatalogProductRecord[],
    private readonly productCategoryIds: Record<string, string> = {},
  ) {}

  async listCategories(): Promise<CatalogCategoryRecord[]> {
    return [...this.categories].sort((a, b) => a.name.localeCompare(b.name));
  }

  async findCategoryBySlug(slug: string): Promise<CatalogCategoryRecord | null> {
    return this.categories.find((category) => category.slug === slug) ?? null;
  }

  async findProducts(criteria: CatalogProductCriteria) {
    this.criteria.push(criteria);
    const matches = this.products
      .filter((product) => product.status === criteria.status)
      .filter(
        (product) =>
          !criteria.categoryId || this.productCategoryIds[product.slug] === criteria.categoryId,
      )
      .filter(
        (product) => criteria.featured === undefined || product.featured === criteria.featured,
      )
      .filter(
        (product) =>
          !criteria.search ||
          [product.name, product.description]
            .join(" ")
            .toLowerCase()
            .includes(criteria.search.toLowerCase()),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    return { items: matches.slice(0, criteria.limit), total: matches.length };
  }

  async findProductBySlug(slug: string): Promise<CatalogProductRecord | null> {
    this.productLookups.push(slug);
    return this.products.find((product) => product.slug === slug) ?? null;
  }

  readonly idLookups: (readonly string[])[] = [];

  async findProductsByIds(ids: readonly string[]): Promise<CatalogProductRecord[]> {
    this.idLookups.push(ids);
    return this.products.filter((product) => ids.includes(product.id));
  }

  async countPublishedProductsByCategory(): Promise<CatalogCategoryCountRecord[]> {
    return [...this.categories]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((category) => ({
        slug: category.slug,
        name: category.name,
        productCount: this.products.filter(
          (product) =>
            product.status === "published" && this.productCategoryIds[product.slug] === category.id,
        ).length,
      }));
  }
}

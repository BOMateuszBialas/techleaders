import type {
  CatalogCategoryRecord,
  CatalogProductCriteria,
  CatalogProductRecord,
  CatalogReadPort,
} from "../../ports/catalog-read.port";

export const COFFEE: CatalogCategoryRecord = {
  id: "cat-coffee",
  slug: "coffee",
  name: "Coffee",
  description: "Beans",
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
    slug: "v60-dripper",
    name: "V60 Dripper",
    description: "A dripper.",
    priceMinor: 8900,
    currency: "PLN",
    stockQuantity: 8,
    imageUrl: "/demo/products/v60-dripper.svg",
    status: "published",
    category: { slug: COFFEE.slug, name: COFFEE.name },
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
      .sort((a, b) => a.name.localeCompare(b.name));
    return { items: matches.slice(0, criteria.limit), total: matches.length };
  }

  async findProductBySlug(slug: string): Promise<CatalogProductRecord | null> {
    this.productLookups.push(slug);
    return this.products.find((product) => product.slug === slug) ?? null;
  }
}

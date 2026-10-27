import type { CurrencyCode } from "../domain/money";
import type { ProductStatus } from "../domain/products/product";
import type { TechnicalSpec } from "../validators/catalog/technical-spec.schema";

/** A category as stored, mapped to plain data by the adapter (never an ORM entity). */
export type CatalogCategoryRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** The tile photo path (OA-11a); the storefront shows it only under `/photos/`. Null when none. */
  imageUrl: string | null;
};

/** A category with how many published products it holds (0 when none). */
export type CatalogCategoryCountRecord = {
  slug: string;
  name: string;
  productCount: number;
  imageUrl: string | null;
};

/** A product as stored, with its category (null when it has none). */
export type CatalogProductRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceMinor: number;
  currency: CurrencyCode;
  stockQuantity: number;
  imageUrl: string | null;
  /** Stored as jsonb; the core read mapper validates the shape before it reaches a shopper. */
  technicalSpecs: TechnicalSpec[];
  status: ProductStatus;
  /** Shown in the home page's featured slider (spec G9). */
  featured: boolean;
  category: { slug: string; name: string } | null;
};

/**
 * What to list. The caller decides visibility (`status`); the adapter never does.
 * Results are sorted by name, then slug.
 */
export type CatalogProductCriteria = {
  status: ProductStatus;
  categoryId?: string;
  /** When set, only products whose `featured` flag equals it. */
  featured?: boolean;
  /**
   * When set, only products whose name or description contains this term, case-insensitively
   * and with LIKE wildcards matched literally (spec Q5).
   */
  search?: string;
  limit: number;
};

/** Read access to the catalog, implemented by the database package. */
export interface CatalogReadPort {
  /** Every category, sorted by name. */
  listCategories(): Promise<CatalogCategoryRecord[]>;
  findCategoryBySlug(slug: string): Promise<CatalogCategoryRecord | null>;
  /** Up to `limit` matching products, plus the total number of matches. */
  findProducts(
    criteria: CatalogProductCriteria,
  ): Promise<{ items: CatalogProductRecord[]; total: number }>;
  /** A product in any status; the use case decides whether a shopper may see it. */
  findProductBySlug(slug: string): Promise<CatalogProductRecord | null>;
  /**
   * The products with these ids, in any status and in no particular order; unknown ids are
   * skipped. The cart prices its lines with them (cart spec, step 2) and decides itself what a
   * shopper may buy.
   */
  findProductsByIds(ids: readonly string[]): Promise<CatalogProductRecord[]>;
  /** Every category with its number of published products, sorted by name (0 when none). */
  countPublishedProductsByCategory(): Promise<CatalogCategoryCountRecord[]>;
}

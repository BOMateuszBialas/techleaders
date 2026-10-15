/** A category as the admin sees it: plain data mapped by the adapter (never an ORM entity). */
export type AdminCategoryRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** How many products (any status) reference this category. */
  productCount: number;
};

/** A product that references a category, as listed on the category page. */
export type CategoryProductRef = { id: string; slug: string; name: string };

/** The values a create or update writes. Already validated and normalised by core. */
export type CategoryWrite = { name: string; slug: string; description: string | null };

/** What `deleteIfEmpty` did: deleted, found nothing, or refused because products use it. */
export type CategoryDeleteResult =
  { kind: "deleted" } | { kind: "not_found" } | { kind: "in_use"; productCount: number };

/**
 * Category persistence for the admin, implemented by the database package. Writes raise
 * `UniqueFieldConflictError` (field `slug`) when the slug is taken; the database decides.
 */
export interface CategoryRepositoryPort {
  /** Every category with its product count, sorted by name. */
  list(): Promise<AdminCategoryRecord[]>;
  findById(id: string): Promise<AdminCategoryRecord | null>;
  /** Up to `limit` products in the category, sorted by name. */
  listProducts(categoryId: string, limit: number): Promise<CategoryProductRef[]>;
  create(input: CategoryWrite): Promise<AdminCategoryRecord>;
  /** Null when the category does not exist. */
  update(id: string, input: CategoryWrite): Promise<AdminCategoryRecord | null>;
  /**
   * Deletes the category only if no product references it, race-free: the row is locked
   * `for update` first, so a concurrent product write waits or fails its foreign key.
   */
  deleteIfEmpty(id: string): Promise<CategoryDeleteResult>;
}

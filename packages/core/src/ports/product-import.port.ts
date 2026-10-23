import type { ProductStatus } from "../domain/products/product";
import type { ProductCreate } from "./catalog.port";

/** A product that already uses a slug or SKU of the import file (CSV import spec A1). */
export type ExistingProductRef = { id: string; name: string; slug: string; sku: string | null };

/** A product the import created. */
export type ImportedProductRef = { id: string; name: string; status: ProductStatus };

/**
 * Persistence for the CSV product import, implemented by the database package. It only reads
 * and inserts: an import never updates a product (spec A1), so it never changes the stock,
 * price or status of a product that already exists.
 */
export interface ProductImportRepositoryPort {
  /** Products whose slug is one of `slugs` or whose SKU is one of `skus`. */
  findExisting(keys: { slugs: string[]; skus: string[] }): Promise<ExistingProductRef[]>;
  /**
   * Creates every product in one transaction, or none (spec A2). A taken slug or SKU is a
   * `UniqueFieldConflictError`, a missing category a `ValidationError`, as for one product.
   */
  createMany(products: ProductCreate[]): Promise<ImportedProductRef[]>;
}

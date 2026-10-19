import type {
  ExistingProductRef,
  ImportedProductRef,
  ProductCreate,
  ProductImportRepositoryPort,
} from "@commerceos/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { ProductSchema } from "../entities/products/product.entity";
import { toCatalogWriteError } from "./catalog-write-error";

/**
 * Database adapter for the core `ProductImportRepositoryPort` (CSV import spec). It reads and
 * inserts only: no import updates a product, so the stock, price and status of an existing
 * product never change here (spec A1). New products get their initial stock like a product
 * created in the form (A3); nothing is written to `stock_adjustments`.
 */
export class DatabaseProductImportRepository implements ProductImportRepositoryPort {
  constructor(private readonly deps: { em: EntityManager }) {}

  async findExisting(keys: { slugs: string[]; skus: string[] }): Promise<ExistingProductRef[]> {
    const conditions = [
      ...(keys.slugs.length > 0 ? [{ slug: { $in: keys.slugs } }] : []),
      ...(keys.skus.length > 0 ? [{ sku: { $in: keys.skus } }] : []),
    ];
    if (conditions.length === 0) return [];
    const products = await this.deps.em.find(
      ProductSchema,
      { $or: conditions },
      { fields: ["id", "name", "slug", "sku"], orderBy: { slug: "asc" } },
    );
    return products.map(({ id, name, slug, sku }) => ({ id, name, slug, sku: sku ?? null }));
  }

  /**
   * Inserts every product in one transaction and one flush: a taken slug or SKU, or a deleted
   * category, rolls back all of them (spec A2). The violation is mapped like a form write.
   */
  async createMany(products: ProductCreate[]): Promise<ImportedProductRef[]> {
    try {
      return await this.deps.em.transactional(async (em) => {
        const created = products.map(({ categoryId, ...values }) =>
          em.create(ProductSchema, { ...values, category: categoryId }),
        );
        await em.flush();
        return created.map(({ id, name, status }) => ({ id, name, status }));
      });
    } catch (error) {
      throw toCatalogWriteError(error);
    }
  }
}

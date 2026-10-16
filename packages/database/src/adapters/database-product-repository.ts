import type {
  AdminProductRecord,
  ProductCreate,
  ProductRepositoryPort,
  ProductStatus,
  ProductWrite,
} from "@commerceos/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { ProductSchema, type Product } from "../entities/products/product.entity";
import { toCatalogWriteError } from "./catalog-write-error";

function toRecord(product: Product): AdminProductRecord {
  const category = product.category;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    priceMinor: product.priceMinor,
    currency: product.currency,
    sku: product.sku ?? null,
    stockQuantity: product.stockQuantity,
    imageUrl: product.imageUrl ?? null,
    status: product.status,
    featured: product.featured,
    category: category ? { id: category.id, slug: category.slug, name: category.name } : null,
  };
}

/** The entity values of a product write: the category id becomes the relation. */
function toEntityValues({ categoryId, ...values }: ProductWrite) {
  return { ...values, category: categoryId };
}

/**
 * Database adapter for the core `ProductRepositoryPort` (admin catalog spec, Phase 1b).
 * Request-scoped: it works on the request's EntityManager fork. Uniqueness of slug and SKU
 * and the category foreign key are left to the database, and their violations are mapped by
 * `toCatalogWriteError`. An edit never writes `stockQuantity` (spec A14).
 */
export class DatabaseProductRepository implements ProductRepositoryPort {
  constructor(private readonly deps: { em: EntityManager }) {}

  async list(): Promise<AdminProductRecord[]> {
    const products = await this.deps.em.find(
      ProductSchema,
      {},
      { populate: ["category"], orderBy: { name: "asc", slug: "asc" } },
    );
    return products.map(toRecord);
  }

  async findById(id: string): Promise<AdminProductRecord | null> {
    const product = await this.find(id);
    return product ? toRecord(product) : null;
  }

  async create(input: ProductCreate): Promise<AdminProductRecord> {
    const { status, stockQuantity, ...write } = input;
    const product = this.deps.em.create(ProductSchema, {
      ...toEntityValues(write),
      status,
      stockQuantity,
    });
    await this.flush();
    return this.withCategory(product);
  }

  async update(id: string, input: ProductWrite): Promise<AdminProductRecord | null> {
    const product = await this.find(id);
    if (!product) return null;
    this.deps.em.assign(product, toEntityValues(input));
    await this.flush();
    return this.withCategory(product);
  }

  async setStatus(id: string, status: ProductStatus): Promise<AdminProductRecord | null> {
    const product = await this.find(id);
    if (!product) return null;
    this.deps.em.assign(product, { status });
    await this.flush();
    return toRecord(product);
  }

  private find(id: string): Promise<Product | null> {
    return this.deps.em.findOne(ProductSchema, { id }, { populate: ["category"] });
  }

  /** Loads the (possibly just assigned) category, so the record carries its name and slug. */
  private async withCategory(product: Product): Promise<AdminProductRecord> {
    await this.deps.em.populate(product, ["category"]);
    return toRecord(product);
  }

  private async flush(): Promise<void> {
    try {
      await this.deps.em.flush();
    } catch (error) {
      throw toCatalogWriteError(error);
    }
  }
}

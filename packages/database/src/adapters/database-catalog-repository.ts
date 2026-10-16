import type {
  CatalogCategoryRecord,
  CatalogProductCriteria,
  CatalogProductRecord,
  CatalogReadPort,
} from "@commerceos/core";
import type { EntityManager, FilterQuery } from "@mikro-orm/postgresql";
import { CategorySchema, type Category } from "../entities/categories/category.entity";
import { ProductSchema, type Product } from "../entities/products/product.entity";

/**
 * Turns a search term into an `ILIKE` "contains" pattern that matches `%`, `_` and `\`
 * literally (PostgreSQL's default escape character is the backslash).
 */
export function toContainsPattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

/** Case-insensitive "contains" on name or description, wildcards matched literally (spec Q5). */
function searchFilter(term: string) {
  const pattern = toContainsPattern(term);
  return { $or: [{ name: { $ilike: pattern } }, { description: { $ilike: pattern } }] };
}

function toCategoryRecord(category: Category): CatalogCategoryRecord {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description ?? null,
  };
}

function toProductRecord(product: Product): CatalogProductRecord {
  const category = product.category;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    priceMinor: product.priceMinor,
    currency: product.currency,
    stockQuantity: product.stockQuantity,
    imageUrl: product.imageUrl ?? null,
    status: product.status,
    featured: product.featured,
    category: category ? { slug: category.slug, name: category.name } : null,
  };
}

/**
 * Database adapter for the core `CatalogReadPort`. Request-scoped: it uses the request's
 * EntityManager fork. It applies the criteria it is given and decides no visibility rule.
 */
export class DatabaseCatalogRepository implements CatalogReadPort {
  constructor(private readonly deps: { em: EntityManager }) {}

  async listCategories(): Promise<CatalogCategoryRecord[]> {
    const categories = await this.deps.em.find(
      CategorySchema,
      {},
      { orderBy: { name: "asc", slug: "asc" } },
    );
    return categories.map(toCategoryRecord);
  }

  async findCategoryBySlug(slug: string): Promise<CatalogCategoryRecord | null> {
    const category = await this.deps.em.findOne(CategorySchema, { slug });
    return category ? toCategoryRecord(category) : null;
  }

  async findProducts(
    criteria: CatalogProductCriteria,
  ): Promise<{ items: CatalogProductRecord[]; total: number }> {
    const where: FilterQuery<Product> = {
      status: criteria.status,
      ...(criteria.categoryId ? { category: criteria.categoryId } : {}),
      ...(criteria.featured === undefined ? {} : { featured: criteria.featured }),
      ...(criteria.search ? searchFilter(criteria.search) : {}),
    };
    const [products, total] = await this.deps.em.findAndCount(ProductSchema, where, {
      populate: ["category"],
      orderBy: { name: "asc", slug: "asc" },
      limit: criteria.limit,
    });
    return { items: products.map(toProductRecord), total };
  }

  async findProductBySlug(slug: string): Promise<CatalogProductRecord | null> {
    const product = await this.deps.em.findOne(ProductSchema, { slug }, { populate: ["category"] });
    return product ? toProductRecord(product) : null;
  }
}

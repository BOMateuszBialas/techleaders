import type {
  CatalogCategoryCountRecord,
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

  async findProductsByIds(ids: readonly string[]): Promise<CatalogProductRecord[]> {
    if (ids.length === 0) return [];
    const products = await this.deps.em.find(
      ProductSchema,
      { id: { $in: [...ids] } },
      { populate: ["category"] },
    );
    return products.map(toProductRecord);
  }

  /**
   * One row per category, so an empty category is a zero count, not a missing row. The `::int`
   * cast keeps the count a JavaScript number (PostgreSQL returns `bigint` as a string).
   */
  async countPublishedProductsByCategory(): Promise<CatalogCategoryCountRecord[]> {
    const rows = await this.deps.em.execute<
      { slug: string; name: string; product_count: number }[]
    >(
      `select c.slug, c.name,
              count(p.id) filter (where p.status = 'published')::int as product_count
         from categories c
         left join products p on p.category_id = c.id
        group by c.id, c.slug, c.name
        order by c.name asc, c.slug asc`,
    );
    return rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      productCount: row.product_count,
    }));
  }
}

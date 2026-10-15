import type {
  AdminCategoryRecord,
  CategoryDeleteResult,
  CategoryProductRef,
  CategoryRepositoryPort,
  CategoryWrite,
} from "@commerceos/core";
import type { EntityManager, QueryResult } from "@mikro-orm/postgresql";
import { CategorySchema, type Category } from "../entities/categories/category.entity";
import { ProductSchema } from "../entities/products/product.entity";
import { toCatalogWriteError } from "./catalog-write-error";

function toRecord(category: Category, productCount: number): AdminCategoryRecord {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description ?? null,
    productCount,
  };
}

/**
 * Database adapter for the core `CategoryRepositoryPort` (admin catalog spec, Phase 1a).
 * Request-scoped: it works on the request's EntityManager fork. Uniqueness is left to the
 * database's constraints, and their violations are mapped by `toCatalogWriteError`.
 */
export class DatabaseCategoryRepository implements CategoryRepositoryPort {
  constructor(private readonly deps: { em: EntityManager }) {}

  async list(): Promise<AdminCategoryRecord[]> {
    const { em } = this.deps;
    const categories = await em.find(CategorySchema, {}, { orderBy: { name: "asc", slug: "asc" } });
    const rows = await em.execute<{ category_id: string; product_count: number }[]>(
      "select category_id, count(*)::int as product_count from products where category_id is not null group by category_id",
    );
    const counts = new Map(rows.map((row) => [row.category_id, row.product_count]));
    return categories.map((category) => toRecord(category, counts.get(category.id) ?? 0));
  }

  async findById(id: string): Promise<AdminCategoryRecord | null> {
    const category = await this.deps.em.findOne(CategorySchema, { id });
    return category ? toRecord(category, await this.countProducts(id)) : null;
  }

  async listProducts(categoryId: string, limit: number): Promise<CategoryProductRef[]> {
    const products = await this.deps.em.find(
      ProductSchema,
      { category: categoryId },
      { orderBy: { name: "asc", slug: "asc" }, limit, fields: ["id", "slug", "name"] },
    );
    return products.map(({ id, slug, name }) => ({ id, slug, name }));
  }

  async create(input: CategoryWrite): Promise<AdminCategoryRecord> {
    const category = this.deps.em.create(CategorySchema, { ...input });
    await this.flush();
    return toRecord(category, 0);
  }

  async update(id: string, input: CategoryWrite): Promise<AdminCategoryRecord | null> {
    const category = await this.deps.em.findOne(CategorySchema, { id });
    if (!category) return null;
    this.deps.em.assign(category, { ...input });
    await this.flush();
    return toRecord(category, await this.countProducts(id));
  }

  /**
   * One transaction: lock the category row (`for update`), then delete it only if no product
   * references it. A concurrent product insert or update that points at the category takes a
   * `key share` lock on the same row for its FK check, which conflicts with `for update`, so
   * the two run one after the other: the delete then sees the committed product, or the
   * product write fails its foreign key. The `on delete set null` rule is never reached.
   */
  deleteIfEmpty(id: string): Promise<CategoryDeleteResult> {
    return this.deps.em.transactional(async (em): Promise<CategoryDeleteResult> => {
      const locked = await em.execute("select id from categories where id = ? for update", [id]);
      if (locked.length === 0) return { kind: "not_found" };

      const deleted = await em.execute<QueryResult>(
        "delete from categories where id = ? and not exists (select 1 from products where category_id = ?)",
        [id, id],
        "run",
      );
      if (deleted.affectedRows > 0) return { kind: "deleted" };
      return { kind: "in_use", productCount: await em.count(ProductSchema, { category: id }) };
    });
  }

  private countProducts(categoryId: string): Promise<number> {
    return this.deps.em.count(ProductSchema, { category: categoryId });
  }

  private async flush(): Promise<void> {
    try {
      await this.deps.em.flush();
    } catch (error) {
      throw toCatalogWriteError(error);
    }
  }
}

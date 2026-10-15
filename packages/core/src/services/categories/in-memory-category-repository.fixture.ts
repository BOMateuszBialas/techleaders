import { UniqueFieldConflictError } from "../../errors/app-error";
import type {
  AdminCategoryRecord,
  CategoryDeleteResult,
  CategoryProductRef,
  CategoryRepositoryPort,
  CategoryWrite,
} from "../../ports/catalog.port";

export const MICE_ID = "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01";
export const MOUSEPADS_ID = "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d02";
export const MISSING_ID = "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2dff";

/**
 * A `CategoryRepositoryPort` fake for unit tests. It mirrors the database's behaviour:
 * unique slugs, sorting by name, and refusing to delete a category that products use.
 */
export class InMemoryCategoryRepository implements CategoryRepositoryPort {
  readonly categories = new Map<string, Omit<AdminCategoryRecord, "productCount">>();
  readonly products: (CategoryProductRef & { categoryId: string })[] = [];
  private nextId = 1;

  constructor() {
    this.categories.set(MICE_ID, {
      id: MICE_ID,
      slug: "mice",
      name: "Mice",
      description: "Gaming mice",
    });
    this.categories.set(MOUSEPADS_ID, {
      id: MOUSEPADS_ID,
      slug: "mousepads",
      name: "Mousepads",
      description: null,
    });
  }

  private withCount(category: Omit<AdminCategoryRecord, "productCount">): AdminCategoryRecord {
    const productCount = this.products.filter((p) => p.categoryId === category.id).length;
    return { ...category, productCount };
  }

  private assertSlugFree(slug: string, exceptId?: string): void {
    for (const category of this.categories.values()) {
      if (category.slug === slug && category.id !== exceptId) {
        throw new UniqueFieldConflictError(
          "slug",
          "This slug is already used by another category.",
        );
      }
    }
  }

  async list(): Promise<AdminCategoryRecord[]> {
    return [...this.categories.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((category) => this.withCount(category));
  }

  async findById(id: string): Promise<AdminCategoryRecord | null> {
    const category = this.categories.get(id);
    return category ? this.withCount(category) : null;
  }

  async listProducts(categoryId: string, limit: number): Promise<CategoryProductRef[]> {
    return this.products
      .filter((product) => product.categoryId === categoryId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit)
      .map(({ id, slug, name }) => ({ id, slug, name }));
  }

  async create(input: CategoryWrite): Promise<AdminCategoryRecord> {
    this.assertSlugFree(input.slug);
    const id = `6f1c2a52-6d0e-4a8b-9a51-${String(this.nextId++).padStart(12, "0")}`;
    this.categories.set(id, { id, ...input });
    return this.withCount({ id, ...input });
  }

  async update(id: string, input: CategoryWrite): Promise<AdminCategoryRecord | null> {
    if (!this.categories.has(id)) return null;
    this.assertSlugFree(input.slug, id);
    this.categories.set(id, { id, ...input });
    return this.withCount({ id, ...input });
  }

  async deleteIfEmpty(id: string): Promise<CategoryDeleteResult> {
    const category = this.categories.get(id);
    if (!category) return { kind: "not_found" };
    const { productCount } = this.withCount(category);
    if (productCount > 0) return { kind: "in_use", productCount };
    this.categories.delete(id);
    return { kind: "deleted" };
  }

  /** Adds `count` products named "Product 01", "Product 02", … to a category. */
  addProducts(categoryId: string, count: number): void {
    for (let index = 1; index <= count; index++) {
      const suffix = String(this.products.length + 1).padStart(2, "0");
      this.products.push({
        id: `p-${suffix}`,
        slug: `product-${suffix}`,
        name: `Product ${suffix}`,
        categoryId,
      });
    }
  }
}

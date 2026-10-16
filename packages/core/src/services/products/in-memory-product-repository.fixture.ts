import type { ProductStatus } from "../../domain/products/product";
import { UniqueFieldConflictError, ValidationError } from "../../errors/app-error";
import type {
  AdminProductRecord,
  ProductCreate,
  ProductRepositoryPort,
  ProductWrite,
} from "../../ports/catalog.port";
import { INVALID_FIELDS_MESSAGE } from "../../validators/parse-input";

export const MICE_CATEGORY = {
  id: "6f1c2a52-6d0e-4a8b-9a51-3f3a1c1b2d01",
  slug: "mice",
  name: "Mice",
};
export const VORTEX_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
export const TITAN_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e02";
export const MISSING_PRODUCT_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3eff";

export const VORTEX: AdminProductRecord = {
  id: VORTEX_ID,
  slug: "vortex-wireless-mouse",
  name: "Vortex Wireless Mouse",
  description: "[DEMO] A wireless gaming mouse.",
  priceMinor: 24990,
  currency: "PLN",
  sku: "DEMO-MOU-001",
  stockQuantity: 8,
  imageUrl: "/demo/products/vortex-wireless-mouse.svg",
  status: "published",
  featured: true,
  category: MICE_CATEGORY,
};

export const TITAN: AdminProductRecord = {
  ...VORTEX,
  id: TITAN_ID,
  slug: "titan-mmo-mouse",
  name: "Titan MMO Mouse",
  sku: "DEMO-MOU-003",
  stockQuantity: 0,
  status: "draft",
  featured: false,
};

type StoredOnly = Pick<AdminProductRecord, "currency" | "stockQuantity" | "status">;

/**
 * A `ProductRepositoryPort` fake for unit tests. It mirrors the database: unique slugs and
 * SKUs, a foreign key to the one known category, sorting by name, and edits that keep stock.
 */
export class InMemoryProductRepository implements ProductRepositoryPort {
  readonly products = new Map<string, AdminProductRecord>([
    [TITAN_ID, TITAN],
    [VORTEX_ID, VORTEX],
  ]);
  private nextId = 1;

  private assertWritable(input: ProductWrite, exceptId?: string): void {
    for (const product of this.products.values()) {
      if (product.id === exceptId) continue;
      if (product.slug === input.slug) {
        throw new UniqueFieldConflictError("slug", "This slug is already used by another product.");
      }
      if (input.sku !== null && product.sku === input.sku) {
        throw new UniqueFieldConflictError("sku", "This SKU is already used by another product.");
      }
    }
    if (input.categoryId !== null && input.categoryId !== MICE_CATEGORY.id) {
      throw new ValidationError(INVALID_FIELDS_MESSAGE, {
        categoryId: ["Choose an existing category."],
      });
    }
  }

  private toRecord(id: string, input: ProductWrite, stored: StoredOnly): AdminProductRecord {
    const { categoryId, ...values } = input;
    return {
      id,
      ...values,
      currency: stored.currency,
      stockQuantity: stored.stockQuantity,
      status: stored.status,
      category: categoryId ? MICE_CATEGORY : null,
    };
  }

  async list(): Promise<AdminProductRecord[]> {
    return [...this.products.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async findById(id: string): Promise<AdminProductRecord | null> {
    return this.products.get(id) ?? null;
  }

  async create(input: ProductCreate): Promise<AdminProductRecord> {
    this.assertWritable(input);
    const { status, stockQuantity, ...values } = input;
    const id = `7a2d3b63-7e1f-4b9c-8b62-${String(this.nextId++).padStart(12, "0")}`;
    const record = this.toRecord(id, values, { currency: "PLN", stockQuantity, status });
    this.products.set(id, record);
    return record;
  }

  async update(id: string, input: ProductWrite): Promise<AdminProductRecord | null> {
    const existing = this.products.get(id);
    if (!existing) return null;
    this.assertWritable(input, id);
    const record = this.toRecord(id, input, existing);
    this.products.set(id, record);
    return record;
  }

  async setStatus(id: string, status: ProductStatus): Promise<AdminProductRecord | null> {
    const existing = this.products.get(id);
    if (!existing) return null;
    const record = { ...existing, status };
    this.products.set(id, record);
    return record;
  }
}

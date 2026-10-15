import type { ProductStatus } from "@commerceos/core";
import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { CategorySchema } from "../entities/categories/category.entity";
import { ProductSchema } from "../entities/products/product.entity";

/**
 * Local development / demo seed data. All records are clearly marked as demo
 * content ("[DEMO]" in descriptions, "DEMO-" SKUs).
 *
 * Repeatable: records are upserted by their unique slug, so running the seed
 * again updates them instead of creating duplicates.
 */
type SeedCategory = { slug: string; name: string; description: string };
type SeedProduct = {
  slug: string;
  name: string;
  /** Slug of a category in the same catalog. */
  category: string;
  priceMinor: number;
  stockQuantity: number;
  sku: string;
  /** Defaults to "published"; test fixtures seed drafts. */
  status?: ProductStatus;
  /** A local path under `packages/app/public`, e.g. `/demo/products/<slug>.svg`. */
  imageUrl?: string;
};
export type SeedCatalog = { categories: readonly SeedCategory[]; products: readonly SeedProduct[] };

const demoCategories = [
  { slug: "coffee", name: "Coffee", description: "[DEMO] Specialty coffee beans." },
  { slug: "brewing", name: "Brewing gear", description: "[DEMO] Equipment for home brewing." },
] as const;

const demoProducts = [
  {
    slug: "ethiopia-yirgacheffe-250g",
    name: "Ethiopia Yirgacheffe 250 g",
    category: "coffee",
    priceMinor: 5490,
    stockQuantity: 42,
    sku: "DEMO-COF-001",
    imageUrl: "/demo/products/ethiopia-yirgacheffe-250g.svg",
  },
  {
    slug: "colombia-huila-250g",
    name: "Colombia Huila 250 g",
    category: "coffee",
    priceMinor: 4890,
    stockQuantity: 3,
    sku: "DEMO-COF-002",
    imageUrl: "/demo/products/colombia-huila-250g.svg",
  },
  {
    slug: "brazil-santos-1kg",
    name: "Brazil Santos 1 kg",
    category: "coffee",
    priceMinor: 12900,
    stockQuantity: 15,
    sku: "DEMO-COF-003",
    imageUrl: "/demo/products/brazil-santos-1kg.svg",
  },
  {
    slug: "v60-dripper",
    name: "V60 Dripper",
    category: "brewing",
    priceMinor: 8900,
    stockQuantity: 8,
    sku: "DEMO-BRW-001",
    imageUrl: "/demo/products/v60-dripper.svg",
  },
  {
    slug: "gooseneck-kettle",
    name: "Gooseneck Kettle",
    category: "brewing",
    priceMinor: 21900,
    stockQuantity: 0,
    sku: "DEMO-BRW-002",
    imageUrl: "/demo/products/gooseneck-kettle.svg",
  },
] as const;

export const DEMO_CATALOG: SeedCatalog = { categories: demoCategories, products: demoProducts };

/**
 * Upserts a catalog by unique slug. Throws when a product references a
 * category that is not part of the same catalog.
 */
export async function seedCatalog(em: EntityManager, catalog: SeedCatalog): Promise<void> {
  const categoryIds = new Map<string, string>();
  for (const category of catalog.categories) {
    const saved = await em.upsert(CategorySchema, { ...category }, { onConflictFields: ["slug"] });
    categoryIds.set(category.slug, saved.id);
  }

  for (const { category, status, imageUrl, ...product } of catalog.products) {
    const categoryId = categoryIds.get(category);
    if (!categoryId) throw new Error(`Seed category "${category}" missing`);
    await em.upsert(
      ProductSchema,
      {
        ...product,
        description: `[DEMO] ${product.name}. Seed data for local development.`,
        currency: "PLN",
        status: status ?? "published",
        imageUrl: imageUrl ?? null,
        category: categoryId,
      },
      { onConflictFields: ["slug"] },
    );
  }
  await em.flush();
}

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    await seedCatalog(em, DEMO_CATALOG);
  }
}

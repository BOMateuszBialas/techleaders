import { MikroORM } from "@mikro-orm/postgresql";
import { createOrmConfig } from "../config";
import { DEMO_CATALOG, seedCatalog, type SeedCatalog } from "../seeders/DatabaseSeeder";

const demoCoffee = DEMO_CATALOG.categories.find((category) => category.slug === "coffee");
if (!demoCoffee) throw new Error('DEMO_CATALOG has no "coffee" category');

/**
 * Test-only catalog rows, seeded on top of the demo catalog by the integration and e2e
 * setups (storefront catalog spec, Q9). Marked "[E2E]" and never part of the demo seed:
 * - `e2e-empty`: a category with no products;
 * - `e2e-drafts-only`: a category whose only product is a draft;
 * - a draft in the demo `coffee` category (reused unchanged), so a search for
 *   "Yirgacheffe" can prove drafts are excluded.
 */
export const E2E_CATALOG: SeedCatalog = {
  categories: [
    { slug: "e2e-empty", name: "[E2E] Empty category", description: "[E2E] No products." },
    {
      slug: "e2e-drafts-only",
      name: "[E2E] Drafts only",
      description: "[E2E] Holds only draft products.",
    },
    demoCoffee,
  ],
  products: [
    {
      slug: "e2e-draft-kettle",
      name: "[E2E] Draft kettle",
      category: "e2e-drafts-only",
      priceMinor: 9900,
      stockQuantity: 5,
      sku: "E2E-DRAFT-001",
      status: "draft",
    },
    {
      slug: "e2e-draft-beans",
      name: "[E2E] Draft Yirgacheffe beans",
      category: "coffee",
      priceMinor: 3990,
      stockQuantity: 5,
      sku: "E2E-DRAFT-002",
      status: "draft",
    },
  ],
};

/** Seeds `E2E_CATALOG` into an already migrated and demo-seeded database. */
export async function seedE2eCatalog(databaseUrl: string): Promise<void> {
  const orm = await MikroORM.init(createOrmConfig({ databaseUrl }));
  try {
    await seedCatalog(orm.em.fork(), E2E_CATALOG);
  } finally {
    await orm.close(true);
  }
}

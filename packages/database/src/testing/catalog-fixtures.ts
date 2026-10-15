import { MikroORM } from "@mikro-orm/postgresql";
import { createOrmConfig } from "../config";
import { DEMO_CATALOG, seedCatalog, type SeedCatalog } from "../seeders/DatabaseSeeder";

const demoMice = DEMO_CATALOG.categories.find((category) => category.slug === "mice");
if (!demoMice) throw new Error('DEMO_CATALOG has no "mice" category');

/**
 * Test-only catalog rows, seeded on top of the demo catalog by the integration and e2e
 * setups (storefront catalog spec, Q9). Marked "[E2E]" and never part of the demo seed:
 * - `e2e-empty`: a category with no products;
 * - `e2e-drafts-only`: a category whose only product is a draft;
 * Both drafts are featured, so the home page's slider can prove drafts never appear there
 * (spec G18). The demo seed's featured out-of-stock product (`titan-mmo-mouse`) covers the
 * other half of G18, so no extra published fixture changes the demo listing.
 * - a draft in the demo `mice` category (reused unchanged), so a search for
 *   "Vortex" can prove drafts are excluded.
 */
export const E2E_CATALOG: SeedCatalog = {
  categories: [
    { slug: "e2e-empty", name: "[E2E] Empty category", description: "[E2E] No products." },
    {
      slug: "e2e-drafts-only",
      name: "[E2E] Drafts only",
      description: "[E2E] Holds only draft products.",
    },
    demoMice,
  ],
  products: [
    {
      slug: "e2e-draft-keyboard",
      name: "[E2E] Draft keyboard",
      category: "e2e-drafts-only",
      priceMinor: 9900,
      stockQuantity: 5,
      sku: "E2E-DRAFT-001",
      status: "draft",
      featured: true,
    },
    {
      slug: "e2e-draft-mouse",
      name: "[E2E] Draft Vortex mouse",
      category: "mice",
      priceMinor: 3990,
      stockQuantity: 5,
      sku: "E2E-DRAFT-002",
      status: "draft",
      featured: true,
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

import type { ProductStatus } from "@commerceos/core";
import type { EntityManager } from "@mikro-orm/core";
import { Seeder } from "@mikro-orm/seeder";
import { CategorySchema } from "../entities/categories/category.entity";
import { ProductSchema } from "../entities/products/product.entity";

/**
 * Local development / demo seed data: a fictional gaming-accessories store (decision D10).
 * All records are clearly marked as demo content ("[DEMO]" in descriptions, "DEMO-" SKUs).
 *
 * Repeatable: records are upserted by their unique slug, so running the seed
 * again updates them instead of creating duplicates. It never deletes, so rows removed from
 * this file (for example the old coffee catalog) stay in an existing database until it is reset.
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
  /** Shopper-facing text, stored with a "[DEMO]" prefix. Defaults to a generic line. */
  description?: string;
  /** A local path under `packages/app/public`, e.g. `/demo/products/<slug>.svg`. */
  imageUrl?: string;
};
export type SeedCatalog = { categories: readonly SeedCategory[]; products: readonly SeedProduct[] };

const demoCategories = [
  { slug: "mice", name: "Mice", description: "[DEMO] Gaming mice: wired, wireless and MMO." },
  {
    slug: "keyboards",
    name: "Keyboards",
    description: "[DEMO] Mechanical gaming keyboards in every size.",
  },
  {
    slug: "headsets",
    name: "Headsets",
    description: "[DEMO] Gaming headsets for PC and consoles.",
  },
  { slug: "controllers", name: "Controllers", description: "[DEMO] Gamepads and fight sticks." },
  { slug: "mousepads", name: "Mousepads", description: "[DEMO] Cloth, speed and glass mousepads." },
] as const;

const demoProducts = [
  {
    slug: "vortex-wireless-mouse",
    name: "Vortex Wireless Mouse",
    category: "mice",
    priceMinor: 24900,
    stockQuantity: 25,
    sku: "DEMO-MOU-001",
    description:
      "Wireless gaming mouse with a 26,000 DPI optical sensor, 70 hours of battery life and five programmable buttons.",
    imageUrl: "/demo/products/vortex-wireless-mouse.svg",
  },
  {
    slug: "pulse-ultralight-mouse",
    name: "Pulse Ultralight Mouse",
    category: "mice",
    priceMinor: 18900,
    stockQuantity: 3,
    sku: "DEMO-MOU-002",
    description:
      "A 58 g wired mouse with a honeycomb-free shell and a flexible paracord cable for fast flick shots.",
    imageUrl: "/demo/products/pulse-ultralight-mouse.svg",
  },
  {
    slug: "titan-mmo-mouse",
    name: "Titan MMO Mouse",
    category: "mice",
    priceMinor: 29900,
    stockQuantity: 0,
    sku: "DEMO-MOU-003",
    description:
      "Twelve thumb buttons in a side grid for MMO and MOBA hotkeys, with on-board memory for five profiles.",
    imageUrl: "/demo/products/titan-mmo-mouse.svg",
  },
  {
    slug: "nova-tkl-mechanical-keyboard",
    name: "Nova TKL Mechanical Keyboard",
    category: "keyboards",
    priceMinor: 39900,
    stockQuantity: 12,
    sku: "DEMO-KEY-001",
    description:
      "Tenkeyless mechanical keyboard with hot-swappable linear switches, PBT keycaps and per-key RGB lighting.",
    imageUrl: "/demo/products/nova-tkl-mechanical-keyboard.svg",
  },
  {
    slug: "strike-60-keyboard",
    name: "Strike 60 Keyboard",
    category: "keyboards",
    priceMinor: 32900,
    stockQuantity: 8,
    sku: "DEMO-KEY-002",
    description:
      "Compact 60 percent keyboard with tactile switches and a detachable USB-C cable; more room for wide mouse swipes.",
    imageUrl: "/demo/products/strike-60-keyboard.svg",
  },
  {
    slug: "aurora-full-size-keyboard",
    name: "Aurora Full-Size Keyboard",
    category: "keyboards",
    priceMinor: 45900,
    stockQuantity: 5,
    sku: "DEMO-KEY-003",
    description:
      "Full-size mechanical keyboard with a numpad, a volume roller and a magnetic wrist rest.",
    imageUrl: "/demo/products/aurora-full-size-keyboard.svg",
  },
  {
    slug: "echo-surround-headset",
    name: "Echo Surround Headset",
    category: "headsets",
    priceMinor: 34900,
    stockQuantity: 14,
    sku: "DEMO-HEA-001",
    description:
      "Wired headset with virtual 7.1 surround sound, 50 mm drivers and a detachable noise-cancelling microphone.",
    imageUrl: "/demo/products/echo-surround-headset.svg",
  },
  {
    slug: "drift-wireless-headset",
    name: "Drift Wireless Headset",
    category: "headsets",
    priceMinor: 54900,
    stockQuantity: 6,
    sku: "DEMO-HEA-002",
    description:
      "Low-latency 2.4 GHz wireless headset with Bluetooth, memory-foam ear cushions and 40 hours of battery life.",
    imageUrl: "/demo/products/drift-wireless-headset.svg",
  },
  {
    slug: "nimbus-stereo-headset",
    name: "Nimbus Stereo Headset",
    category: "headsets",
    priceMinor: 15900,
    stockQuantity: 30,
    sku: "DEMO-HEA-003",
    description:
      "Lightweight stereo headset with a 3.5 mm jack that works with PC, consoles and handhelds.",
    imageUrl: "/demo/products/nimbus-stereo-headset.svg",
  },
  {
    slug: "apex-wireless-controller",
    name: "Apex Wireless Controller",
    category: "controllers",
    priceMinor: 27900,
    stockQuantity: 18,
    sku: "DEMO-CON-001",
    description:
      "Wireless controller with Hall-effect sticks, two rear paddles and a USB-C charging cable.",
    imageUrl: "/demo/products/apex-wireless-controller.svg",
  },
  {
    slug: "retro-wired-controller",
    name: "Retro Wired Controller",
    category: "controllers",
    priceMinor: 9900,
    stockQuantity: 40,
    sku: "DEMO-CON-002",
    description:
      "Classic-layout wired controller with a precise D-pad for platformers and emulated games.",
    imageUrl: "/demo/products/retro-wired-controller.svg",
  },
  {
    slug: "arena-fight-stick",
    name: "Arena Fight Stick",
    category: "controllers",
    priceMinor: 64900,
    stockQuantity: 2,
    sku: "DEMO-CON-003",
    description:
      "Arcade fight stick with a ball-top lever, eight 30 mm buttons and a steel base that stays put.",
    imageUrl: "/demo/products/arena-fight-stick.svg",
  },
  {
    slug: "glide-xl-mousepad",
    name: "Glide XL Mousepad",
    category: "mousepads",
    priceMinor: 12900,
    stockQuantity: 50,
    sku: "DEMO-PAD-001",
    description:
      "Extended 900 x 400 mm speed-surface mousepad with stitched edges that covers the whole desk.",
    imageUrl: "/demo/products/glide-xl-mousepad.svg",
  },
  {
    slug: "control-cloth-mousepad",
    name: "Control Cloth Mousepad",
    category: "mousepads",
    priceMinor: 7900,
    stockQuantity: 35,
    sku: "DEMO-PAD-002",
    description:
      "Medium cloth mousepad with a textured control surface and a non-slip rubber base.",
    imageUrl: "/demo/products/control-cloth-mousepad.svg",
  },
  {
    slug: "tempered-glass-mousepad",
    name: "Tempered Glass Mousepad",
    category: "mousepads",
    priceMinor: 29900,
    stockQuantity: 7,
    sku: "DEMO-PAD-003",
    description:
      "Tempered glass mousepad with an etched surface for consistent glide and easy cleaning.",
    imageUrl: "/demo/products/tempered-glass-mousepad.svg",
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

  for (const { category, status, imageUrl, description, ...product } of catalog.products) {
    const categoryId = categoryIds.get(category);
    if (!categoryId) throw new Error(`Seed category "${category}" missing`);
    const text = description ?? `${product.name}. Seed data for local development.`;
    await em.upsert(
      ProductSchema,
      {
        ...product,
        description: `[DEMO] ${text}`,
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

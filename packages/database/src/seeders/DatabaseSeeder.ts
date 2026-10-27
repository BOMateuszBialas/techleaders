import {
  DEMO_ORDER_REFERENCE_LIKE,
  type ProductStatus,
  type TechnicalSpec,
} from "@commerceos/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { Seeder } from "@mikro-orm/seeder";
import { CategorySchema } from "../entities/categories/category.entity";
import { OrderItemSchema } from "../entities/orders/order-item.entity";
import { OrderSchema } from "../entities/orders/order.entity";
import { ProductSchema } from "../entities/products/product.entity";
import { ProductViewDailyStatSchema } from "../entities/traffic/product-view-daily-stat.entity";
import { TrafficDailyStatSchema } from "../entities/traffic/traffic-daily-stat.entity";
import { generateDemoStore, type DemoStoreProduct } from "./demo-store";

/**
 * Local development / demo seed data: a fictional gaming-accessories store (decision D10) with
 * a fictional order history and traffic (orders spec Phase 2, E04-S03; D08). The machine markers
 * are the demo data's labels: "DEMO-" SKUs and order references (storefront v2, R11). Seeded text
 * carries no "[DEMO]" prefix; the demo products and orders are still identified by those markers.
 *
 * Repeatable (orders spec A18):
 * - The catalog is **insert-only**: categories and products missing by slug are created; rows
 *   that exist are never updated, so the owner's edits (stock, Featured, price, status) survive
 *   a re-seed and the stock history stays consistent. Seed changes to an existing demo product
 *   therefore reach only a fresh database.
 * - The demo orders (`DEMO-` references) and both traffic tables are **regenerated** on every
 *   run, in one transaction, re-anchored to the seed date. Real (`CO-`) orders are never touched.
 * Catalog rows are never deleted, so rows removed from this file stay until the database is reset.
 */
type SeedCategory = {
  slug: string;
  name: string;
  description: string;
  /** A local path under `packages/app/public`, shown on the home tile only under `/photos/`. */
  imageUrl?: string;
};
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
  /** Shown in the home page's featured slider when published. Defaults to false. */
  featured?: boolean;
  /** Shopper-facing text, stored as given (no "[DEMO]" prefix). Defaults to a generic line. */
  description?: string;
  /**
   * A local path under `packages/app/public`. Only `/photos/` paths are shown on the storefront
   * (storefront v2 photo rule); other paths are kept for the admin.
   */
  imageUrl?: string;
  /** Fictional technical rows (storefront v2 Q10). Set for created products only. */
  technicalSpecs?: readonly TechnicalSpec[];
};
export type SeedCatalog = { categories: readonly SeedCategory[]; products: readonly SeedProduct[] };

/**
 * The category tile photos (OA-11a). The keyboard tile reuses the keyboard product photo by owner
 * decision (see `packages/app/public/photos/CREDITS.md`). The same paths are set on existing rows
 * by `Migration20261027100100_demo_category_images`.
 */
const demoCategories = [
  {
    slug: "mice",
    name: "Mice",
    description: "Gaming mice: wired, wireless and MMO.",
    imageUrl: "/photos/category-mice.jpg",
  },
  {
    slug: "keyboards",
    name: "Keyboards",
    description: "Mechanical gaming keyboards in every size.",
    imageUrl: "/photos/product-keyboard-rgb.jpg",
  },
  {
    slug: "headsets",
    name: "Headsets",
    description: "Gaming headsets for PC and consoles.",
    imageUrl: "/photos/category-headsets.jpg",
  },
  {
    slug: "controllers",
    name: "Controllers",
    description: "Gamepads and fight sticks.",
    imageUrl: "/photos/category-controllers.jpg",
  },
  {
    slug: "mousepads",
    name: "Mousepads",
    description: "Cloth, speed and glass mousepads.",
    imageUrl: "/photos/category-mouse-pads.jpg",
  },
] as const;

/**
 * Fictional technical rows of the Vortex mouse (storefront v2 Q10, AS-10). The same rows are
 * written by the one-off update `Migration20261026180000_demo_product_media` for existing rows.
 */
const DEMO_MOUSE_TECHNICAL_SPECS: readonly TechnicalSpec[] = [
  { label: "Switch type", value: "Optical-mechanical (fictional)" },
  { label: "Connection", value: "2.4 GHz wireless and USB-C (fictional)" },
  { label: "Weight", value: "65 g (fictional)" },
  { label: "Dimensions", value: "118 × 62 × 38 mm (fictional)" },
  { label: "Warranty", value: "24 months (fictional, AS-10)" },
];

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
    featured: true,
    imageUrl: "/photos/product-mouse-black.jpg",
    technicalSpecs: DEMO_MOUSE_TECHNICAL_SPECS,
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
    featured: true,
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
    featured: true,
    imageUrl: "/photos/product-keyboard-rgb.jpg",
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
    featured: true,
    imageUrl: "/photos/product-headset-black.jpg",
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
    featured: true,
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
    featured: true,
    imageUrl: "/photos/product-mouse-pad.jpg",
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

/** Product slugs the catalog seed could not create or find (reported, never a crash). */
export type SeedCatalogResult = { skipped: string[] };

/**
 * Inserts the categories and products that are missing by slug (`on conflict do nothing`, so a
 * row that exists, or a product whose SKU now collides with an owner's product, is left alone).
 * A product whose category cannot be found, or that is still missing after the insert, is
 * skipped and named in the result. Existing rows are never updated (orders spec A18).
 */
export async function seedCatalog(
  em: EntityManager,
  catalog: SeedCatalog,
): Promise<SeedCatalogResult> {
  if (catalog.categories.length > 0) {
    await em
      .createQueryBuilder(CategorySchema)
      .insert(
        catalog.categories.map(({ imageUrl, ...category }) => ({
          ...category,
          imageUrl: imageUrl ?? null,
        })),
      )
      .onConflict()
      .ignore()
      .execute();
  }
  const categories = await em.find(CategorySchema, {
    slug: { $in: [...new Set(catalog.products.map((product) => product.category))] },
  });
  const categoryIds = new Map(categories.map((category) => [category.slug, category.id]));

  const skipped: string[] = [];
  const rows = catalog.products.flatMap(
    ({ category, status, featured, imageUrl, description, technicalSpecs, ...product }) => {
      const categoryId = categoryIds.get(category);
      if (!categoryId) {
        skipped.push(product.slug);
        return [];
      }
      const text = description ?? `${product.name}. Seed data for local development.`;
      return [
        {
          ...product,
          description: text,
          currency: "PLN" as const,
          status: status ?? ("published" as const),
          featured: featured ?? false,
          imageUrl: imageUrl ?? null,
          technicalSpecs: technicalSpecs ? [...technicalSpecs] : [],
          category: categoryId,
        },
      ];
    },
  );
  if (rows.length > 0) {
    await em.createQueryBuilder(ProductSchema).insert(rows).onConflict().ignore().execute();
    const found = await em.find(ProductSchema, { slug: { $in: rows.map((row) => row.slug) } });
    const present = new Set(found.map((product) => product.slug));
    skipped.push(...rows.map((row) => row.slug).filter((slug) => !present.has(slug)));
  }
  return { skipped };
}

export type SeedDemoStoreResult = { orders: number; items: number; trafficRows: number };

/**
 * Regenerates the demo order history and the fictional traffic (orders spec Phase 2) in one
 * transaction: deletes the `DEMO-` orders (their items cascade) and every traffic row, then
 * inserts what `generateDemoStore` builds for `seedDate`. Lines are priced from the seed
 * catalog (the snapshot a demo order was "placed" with) and point at the products found by
 * slug; a demo product missing from the database is left out. No stock changes: the seeded
 * stock is the stock after this history (A15).
 */
export async function seedDemoStore(
  em: EntityManager,
  seedDate: Date,
  catalog: SeedCatalog = DEMO_CATALOG,
): Promise<SeedDemoStoreResult> {
  const found = await em.find(ProductSchema, {
    slug: { $in: catalog.products.map((product) => product.slug) },
  });
  const ids = new Map(found.map((product) => [product.slug, product.id]));
  const products: DemoStoreProduct[] = catalog.products.flatMap((product) => {
    const id = ids.get(product.slug);
    if (!id) return [];
    const { slug, name, sku, priceMinor } = product;
    return [{ slug, id, name, sku, priceMinor }];
  });
  const store = generateDemoStore({ seedDate, products });

  await em.transactional(async (tx) => {
    await tx.execute("delete from orders where public_reference like ?", [
      DEMO_ORDER_REFERENCE_LIKE,
    ]);
    await tx.execute("delete from product_view_daily_stats");
    await tx.execute("delete from traffic_daily_stats");
    if (store.orders.length > 0) {
      await tx.insertMany(OrderSchema, store.orders);
      await tx.insertMany(
        OrderItemSchema,
        store.items.map(({ orderId, productId, ...item }) => ({
          ...item,
          order: orderId,
          product: productId,
        })),
      );
    }
    if (store.productViewRows.length > 0) {
      await tx.insertMany(
        ProductViewDailyStatSchema,
        store.productViewRows.map(({ productId, ...row }) => ({ ...row, product: productId })),
      );
    }
    await tx.insertMany(TrafficDailyStatSchema, store.trafficRows);
  });
  return {
    orders: store.orders.length,
    items: store.items.length,
    trafficRows: store.trafficRows.length,
  };
}

export class DatabaseSeeder extends Seeder {
  /** The day the demo history ends on: now, or a fixed day in tests. */
  constructor(private readonly seedDate: () => Date = () => new Date()) {
    super();
  }

  async run(em: EntityManager): Promise<void> {
    const { skipped } = await seedCatalog(em, DEMO_CATALOG);
    for (const slug of skipped) {
      // Output of the dev-only seed command (like `cli/seed.ts`), not server logging.
      console.warn(`Demo product "${slug}" was skipped: it could not be created or found.`);
    }
    await seedDemoStore(em, this.seedDate());
  }
}

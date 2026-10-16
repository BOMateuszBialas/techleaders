/** Lowercase words of letters and digits joined by single hyphens, e.g. `vortex-wireless-mouse`. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** True when `slug` follows `SLUG_PATTERN` (shared by product and category slugs). */
export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

/**
 * Derives a slug from a name: diacritics are removed (including Polish "ł", which Unicode
 * does not decompose), anything that is not a letter or digit becomes one hyphen, and
 * leading and trailing hyphens are dropped. A name made only of symbols gives "".
 */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const PRODUCT_STATUSES = ["draft", "published"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

type StockState = { status: ProductStatus; stockQuantity: number };

/** A product can be bought only when it is published and has stock left. */
export function isPurchasable(product: StockState): boolean {
  return product.status === "published" && product.stockQuantity > 0;
}

/** Low stock: a published product whose stock is at or below the threshold (MVP spec §6). */
export function isLowStock(product: StockState, threshold: number): boolean {
  return product.status === "published" && product.stockQuantity <= threshold;
}

export type Availability = "in_stock" | "out_of_stock";

/**
 * What a shopper sees: "in stock" when the product can be bought, otherwise "out of stock".
 * Exact quantities are never shown to shoppers (storefront catalog spec, Q7).
 */
export function getAvailability(product: StockState): Availability {
  return isPurchasable(product) ? "in_stock" : "out_of_stock";
}

/**
 * Where a product stands in the store, as the owner sees it (admin catalog spec, Proposed
 * Solution 1): `hidden` (a draft), `out_of_stock` (published, no stock) or `available`.
 * The one availability rule the admin uses; the shopper view (`getAvailability`) is built on
 * the same `isPurchasable` rule (R05).
 */
export type StoreAvailability = "hidden" | "out_of_stock" | "available";

export function getStoreAvailability(product: StockState): StoreAvailability {
  if (product.status !== "published") return "hidden";
  return isPurchasable(product) ? "available" : "out_of_stock";
}

const STORE_AVAILABILITY_SENTENCES: Record<StoreAvailability, string> = {
  available: "Visible in the store and can be bought.",
  out_of_stock: "Visible in the store, shown as out of stock.",
  hidden: "Hidden: shoppers cannot see or buy it.",
};

/** The sentence the admin shows next to the availability badge (spec D05). */
export function describeStoreAvailability(state: StoreAvailability): string {
  return STORE_AVAILABILITY_SENTENCES[state];
}

/**
 * A SKU as stored (spec A11, G9): trimmed and upper-cased, so `demo-mou-001` and
 * `DEMO-MOU-001` cannot both pass the unique constraint. Blank means "no SKU" (`null`).
 */
export function normalizeSku(raw: string): string | null {
  const sku = raw.trim().toUpperCase();
  return sku === "" ? null : sku;
}

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

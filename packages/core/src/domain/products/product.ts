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

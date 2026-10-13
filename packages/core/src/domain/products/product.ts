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

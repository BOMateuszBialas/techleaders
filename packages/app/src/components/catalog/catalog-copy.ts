import type { Availability, CatalogCategory } from "@commerceos/core";

/** Shown wherever catalog data could not be loaded (database down, invalid configuration). */
export const CATALOG_UNAVAILABLE_MESSAGE =
  "The catalog is temporarily unavailable. Please try again later.";

/** Text labels, so availability is never conveyed by colour alone. */
export const AVAILABILITY_LABELS: Record<Availability, string> = {
  in_stock: "In stock",
  out_of_stock: "Out of stock",
};

export function emptyListingMessage(category: CatalogCategory | null): string {
  return category ? `No products in ${category.name} yet.` : "No products are available yet.";
}

/** The listing shows at most `limit` products; say so when more match (spec Q6). */
export function listingLimitNotice(shown: number, total: number): string | null {
  return total > shown
    ? `Showing ${shown} of ${total}. Narrow your search or pick a category.`
    : null;
}

/** Link to the listing, optionally filtered by category. */
export function productsHref(categorySlug?: string): string {
  return categorySlug ? `/products?category=${encodeURIComponent(categorySlug)}` : "/products";
}

/** Seeded demo images are local files served from `public/demo/` (spec G6, G21). */
export function isLocalDemoImage(url: string): boolean {
  return url.startsWith("/demo/");
}

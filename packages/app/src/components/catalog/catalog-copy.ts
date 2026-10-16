import {
  CATALOG_SEARCH_MAX_LENGTH,
  type Availability,
  type CatalogCategory,
} from "@commerceos/core";

/** Shown wherever catalog data could not be loaded (database down, invalid configuration). */
export const CATALOG_UNAVAILABLE_MESSAGE =
  "The catalog is temporarily unavailable. Please try again later.";

/** Text labels, so availability is never conveyed by colour alone. */
export const AVAILABILITY_LABELS: Record<Availability, string> = {
  in_stock: "In stock",
  out_of_stock: "Out of stock",
};

/** The empty listing. With a search term it is the "no results" state (spec S02-AC3). */
export function emptyListingMessage(category: CatalogCategory | null, search?: string): string {
  if (search) return `No products match "${search}"${category ? ` in ${category.name}` : ""}.`;
  return category ? `No products in ${category.name} yet.` : "No products are available yet.";
}

/** The listing's heading: the category (or all products), plus the search term when set. */
export function listingHeading(category: CatalogCategory | null, search?: string): string {
  const scope = category?.name ?? "All products";
  return search ? `Results for "${search}" in ${scope}` : scope;
}

/** The result count under the heading, e.g. "3 products". */
export function resultCountText(total: number): string {
  return total === 1 ? "1 product" : `${total} products`;
}

/** Shown under the search input when `?q=` is too long; no query runs (spec Q14). */
export const SEARCH_TOO_LONG_MESSAGE = `Use at most ${CATALOG_SEARCH_MAX_LENGTH} characters in a search.`;

/** The listing shows at most `limit` products; say so when more match (spec Q6). */
export function listingLimitNotice(shown: number, total: number): string | null {
  return total > shown
    ? `Showing ${shown} of ${total}. Narrow your search or pick a category.`
    : null;
}

/** Link to the listing, optionally filtered by category and by a search term (spec Q2). */
export function productsHref(categorySlug?: string, search?: string): string {
  const params = new URLSearchParams();
  if (categorySlug) params.set("category", categorySlug);
  if (search) params.set("q", search);
  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}

/** Seeded demo images are local files served from `public/demo/` (spec G6, G21). */
export function isLocalDemoImage(url: string): boolean {
  return url.startsWith("/demo/");
}

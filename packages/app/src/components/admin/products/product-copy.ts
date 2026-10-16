import {
  describeStoreAvailability,
  type AdminProduct,
  type ProductStatus,
  type StoreAvailability,
} from "@commerceos/core";

/**
 * Owner-facing copy for the admin product screens. Each message says what the change does in
 * the store (spec D05, G11, G12), so the wording is kept in one tested place.
 */

export const PRODUCTS_PATH = "/admin/products";
export const NEW_PRODUCT_PATH = `${PRODUCTS_PATH}/new`;

export function productPath(id: string): string {
  return `${PRODUCTS_PATH}/${id}`;
}

/** The storefront product page (`/products/<slug>`). */
export function storefrontProductHref(slug: string): string {
  return `/products/${slug}`;
}

/** Text labels, so availability is never conveyed by colour alone. */
export const STORE_AVAILABILITY_LABELS: Record<StoreAvailability, string> = {
  available: "Available",
  out_of_stock: "Out of stock",
  hidden: "Hidden",
};

export const FEATURED_BADGE = "Featured";
export const FEATURED_LABEL = "Featured on home page";
export const FEATURED_HINT = "Shown in the home page slider when the product is published.";

/**
 * What "Featured" means for this product right now, or null when it is not featured. The
 * slider shows at most `FEATURED_PRODUCTS_LIMIT` (12) products by name, so the note says so
 * instead of promising a place (spec D05).
 */
export function featuredNote(product: { featured: boolean; status: ProductStatus }): string | null {
  if (!product.featured) return null;
  return product.status === "published"
    ? "It is in the home page slider, which shows up to 12 featured products by name."
    : "It is featured, but it will not show in the home page slider until it is published.";
}

/** Shown after a save (G12): the product's store availability, then its featured effect. */
export function productSavedMessage(product: AdminProduct): string {
  const note = featuredNote(product);
  const saved = `Saved. ${describeStoreAvailability(product.availability)}`;
  return note ? `${saved} ${note}` : saved;
}

/** Shown after publish or unpublish: what shoppers now see. */
export function statusChangedMessage(product: AdminProduct): string {
  const sentence = describeStoreAvailability(product.availability);
  return product.status === "published"
    ? `Published. ${sentence} Shoppers find it at ${storefrontProductHref(product.slug)}.`
    : `Unpublished. ${sentence} Existing orders are not affected.`;
}

/** G11: the outcome of the publish button, stated before the click. */
export function publishHelp(product: { slug: string; stockQuantity: number }): string {
  const where = `Publish: shoppers will see it at ${storefrontProductHref(product.slug)}`;
  return product.stockQuantity === 0 ? `${where} and it will show as out of stock.` : `${where}.`;
}

export const UNPUBLISH_HELP =
  "Unpublish: shoppers will no longer see or buy it. Existing orders are not affected.";

export const PRICE_HINT =
  "For example 249.90 or 249,90. A published product needs a price above 0.00; a draft may be 0.00.";
export const SKU_HINT = "Optional. Saved in capitals, for example DEMO-MOU-001.";
export const IMAGE_URL_HINT = "Optional. An address starting with https://.";
export const IMAGE_LOAD_FAILED = "Image could not be loaded.";
export const NO_CATEGORY_LABEL = "No category";

export const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "draft", label: "Draft: hidden from shoppers" },
  { value: "published", label: "Published: visible in the store" },
];

export const INITIAL_STOCK_HINT =
  "The quantity in stock when the product is created. A published product with 0 shows as out of stock.";

export const EMPTY_PRODUCTS_MESSAGE = "No products yet. Create the first one.";

/** Fixed notices after a redirect (`?notice=`), so no free text travels in the URL. */
const NOTICES: Record<string, string> = { created: "Product created." };

export function productNotice(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? (NOTICES[value] ?? null) : null;
}

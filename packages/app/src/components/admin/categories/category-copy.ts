/**
 * Owner-facing copy for the admin category screens. Each message says what the change does
 * in the store (spec D05, G12, G13), so the wording is kept in one tested place.
 */

export const CATEGORIES_PATH = "/admin/categories";

export function categoryPath(id: string): string {
  return `${CATEGORIES_PATH}/${id}`;
}

/** The storefront listing the category's slug opens (`/products?category=<slug>`). */
export function storefrontCategoryHref(slug: string): string {
  return `/products?category=${slug}`;
}

/** Shown after a save, describing the store effect of the saved slug. */
export function categorySavedMessage(category: { slug: string; productCount: number }): string {
  const where = `Shoppers find it at ${storefrontCategoryHref(category.slug)}`;
  return category.productCount === 0
    ? `Saved. ${where}; it has no products yet.`
    : `Saved. ${where} and in the home page tabs.`;
}

export const SLUG_HINT = "Leave blank to derive it from the name.";

/** G13: a used category's slug is part of store URLs, and there are no redirects. */
export const SLUG_CHANGE_WARNING =
  "Changing the slug changes the store URL; old links stop working.";

export const EMPTY_CATEGORIES_MESSAGE = "No categories yet. Create the first one.";

export function productCountLabel(count: number): string {
  return count === 1 ? "1 product" : `${count} products`;
}

/** G1: the usage line on the category page, e.g. "Used by 4 products". */
export function usedByMessage(productCount: number): string {
  return `Used by ${productCountLabel(productCount)}`;
}

/** "and 3 more" below a capped list of product names, or null when every name is shown. */
export function moreProductsMessage(productCount: number, shown: number): string | null {
  return productCount > shown ? `and ${productCount - shown} more` : null;
}

export const DELETE_REFUSED_HINT =
  "A category that products still use cannot be deleted. Move its products to another category first.";

export const DELETE_EMPTY_HINT =
  "No products use this category. Deleting it removes it from the store navigation.";

/** Fixed notices after a redirect (`?notice=`), so no free text travels in the URL. */
const NOTICES: Record<string, string> = {
  created: "Category created.",
  deleted: "Category deleted.",
};

export function categoryNotice(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? (NOTICES[value] ?? null) : null;
}

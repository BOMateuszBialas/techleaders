import type { CatalogCategory } from "@commerceos/core";

/** Storefront copy (English UI). The shop sells gaming accessories (decision D10). */
export const STORE_NAME = "CommerceOS";

/** The footer's one-line store description (storefront v2, Phase 1: no demo wording). */
export const STORE_TAGLINE =
  "Mice, keyboards, headsets, controllers and mousepads for every setup.";

/**
 * The footer's fictional company block (R11, owner decision 2, OA-8). Static text only: no legal
 * form, address, tax number or contact. The register check is a pre-merge step (see the PR).
 */
export const FICTIONAL_COMPANY = {
  name: "CommerceOS Demo Shop",
  label: "Fictional company. No address, tax number or contact.",
} as const;

/** Link to the home page, optionally with a featured-products category tab (spec G11). */
export function homeHref(categorySlug?: string): string {
  return categorySlug ? `/?category=${encodeURIComponent(categorySlug)}` : "/";
}

/** The featured slider's empty state; nothing is silently substituted (spec G17). */
export function featuredEmptyMessage(category: CatalogCategory | null): string {
  return category ? `No featured products in ${category.name} yet.` : "No featured products yet.";
}

/** The store error page (retrofit checkout Phase 4, OA-6). No technical detail is shown. */
export const STOREFRONT_ERROR_TITLE = "Something went wrong";
export const STOREFRONT_ERROR_DESCRIPTION =
  "This page could not load. Try again, or browse the catalogue.";
export const STOREFRONT_ERROR_RETRY_LABEL = "Try again";
export const STOREFRONT_ERROR_BROWSE_LABEL = "Browse all products";

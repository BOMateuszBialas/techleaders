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

export const HERO_HEADLINE = "Gear up for your next match";

/** The hero copy is replaced by the approved copy in Phase 4 (Q14); the demo sentence is removed now. */
export const HERO_DESCRIPTION =
  "Fast mice, clicky keyboards, clear headsets and responsive controllers, picked for players who care about every frame.";

/** Link to the home page, optionally with a featured-products category tab (spec G11). */
export function homeHref(categorySlug?: string): string {
  return categorySlug ? `/?category=${encodeURIComponent(categorySlug)}` : "/";
}

/** The featured slider's empty state; nothing is silently substituted (spec G17). */
export function featuredEmptyMessage(category: CatalogCategory | null): string {
  return category ? `No featured products in ${category.name} yet.` : "No featured products yet.";
}

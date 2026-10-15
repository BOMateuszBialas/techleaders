import type { CatalogCategory } from "@commerceos/core";

/** Storefront copy (English UI). The demo store sells gaming accessories (decision D10). */
export const STORE_NAME = "CommerceOS";

/** The footer's one-line store description. */
export const STORE_TAGLINE =
  "Mice, keyboards, headsets, controllers and mousepads for every setup. A CommerceOS demo store.";

/** Demo data must always be presented as demo data (rule R07). */
export const DEMO_NOTICE =
  "Demo store. Products and prices are fictional; no real orders or payments.";

export const HERO_HEADLINE = "Gear up for your next match";

export const HERO_DESCRIPTION =
  "Fast mice, clicky keyboards, clear headsets and responsive controllers, picked for players who care about every frame. Everything here is demo data, so browse freely.";

/** Link to the home page, optionally with a featured-products category tab (spec G11). */
export function homeHref(categorySlug?: string): string {
  return categorySlug ? `/?category=${encodeURIComponent(categorySlug)}` : "/";
}

/** The featured slider's empty state; nothing is silently substituted (spec G17). */
export function featuredEmptyMessage(category: CatalogCategory | null): string {
  return category ? `No featured products in ${category.name} yet.` : "No featured products yet.";
}

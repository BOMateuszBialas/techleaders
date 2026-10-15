import "server-only";
import {
  parseCatalogQuery,
  type CatalogCategory,
  type CatalogProductSummary,
  type RawSearchParams,
} from "@commerceos/core";
import { homeHref } from "@/components/storefront/storefront-copy";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";

/** One tab above the featured slider: "All" or a category (spec G11). */
export type FeaturedTab = { key: string; label: string; href: string; active: boolean };

export type HomePageData = {
  tabs: FeaturedTab[];
  /** The category whose featured products are shown, or null for "All". */
  active: CatalogCategory | null;
  products: CatalogProductSummary[];
};

/** "All" plus one tab per category; exactly one is active. */
export function buildFeaturedTabs(
  categories: CatalogCategory[],
  activeSlug: string | null,
): FeaturedTab[] {
  return [
    { key: "all", label: "All", href: homeHref(), active: activeSlug === null },
    ...categories.map((category) => ({
      key: category.slug,
      label: category.name,
      href: homeHref(category.slug),
      active: category.slug === activeSlug,
    })),
  ];
}

/**
 * The home page's featured slider for `/?category=<slug>`. The parameter follows the same
 * slug rules as on `/products`, but an unknown or malformed value silently shows "All"
 * (spec G19) instead of an error message.
 */
export function loadHomePage(raw: RawSearchParams): Promise<LoadResult<HomePageData>> {
  const { category } = parseCatalogQuery(raw);
  return loadWithRequestScope({ page: "/" }, async (cradle) => {
    const categories = await cradle.listCatalogCategoriesUseCase.execute();
    const featured = await cradle.listFeaturedProductsUseCase.execute(
      category ? { categorySlug: category } : {},
    );
    return {
      tabs: buildFeaturedTabs(categories, featured.category?.slug ?? null),
      active: featured.category,
      products: featured.products,
    };
  });
}

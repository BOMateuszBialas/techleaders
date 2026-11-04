import "server-only";
import { resolvePeriod, type CategoryCount, type LowStockRow } from "@commerceos/core";
import type { BestSeller } from "@/components/storefront/best-sellers";
import {
  BEST_SELLERS_LIMIT,
  BEST_SELLERS_PRESET,
} from "@/components/storefront/storefront-content";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";

/** Categories that hold published products, for the home category tiles (storefront v2 Q12). */
export function loadCategoryCounts(): Promise<LoadResult<CategoryCount[]>> {
  return loadWithRequestScope({ page: "home: categories" }, (cradle) =>
    cradle.listCategoryCountsUseCase.execute(),
  );
}

/**
 * The best sellers of the last 30 days of paid orders (storefront v2 Q11, A-4), ranked by the
 * existing `GetTopProductsUseCase`, which computes the metric once. A row whose product is still
 * published carries its photo and link (storefront refresh, 2026-11-04); a deleted or unpublished
 * product keeps its name and no link. Shopper-public data only: published products are read
 * through `ListCatalogProductsUseCase`.
 */
export function loadBestSellers(now: Date): Promise<LoadResult<BestSeller[]>> {
  return loadWithRequestScope({ page: "home: best sellers" }, async (cradle) => {
    const top = await cradle.getTopProductsUseCase.execute({
      period: resolvePeriod(BEST_SELLERS_PRESET, now),
      limit: BEST_SELLERS_LIMIT,
    });
    const listing = await cradle.listCatalogProductsUseCase.execute({});
    const published = new Map(listing.products.map((product) => [product.id, product]));
    return top.rows.map((row) => {
      const product = row.productId ? published.get(row.productId) : undefined;
      return {
        name: row.name,
        units: row.units,
        product: product ? { slug: product.slug, imageUrl: product.imageUrl } : null,
      };
    });
  });
}

/**
 * The lowest-stock published product at or below the default threshold, from the existing
 * `GetLowStockProductsUseCase`, or null when none is low (storefront v2 A28).
 */
export function loadLowStockProduct(): Promise<LoadResult<LowStockRow | null>> {
  return loadWithRequestScope({ page: "home: low stock" }, async (cradle) => {
    const low = await cradle.getLowStockProductsUseCase.execute({ limit: 1 });
    return low.rows[0] ?? null;
  });
}

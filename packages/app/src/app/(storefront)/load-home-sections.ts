import "server-only";
import { resolvePeriod, type CategoryCount, type LowStockRow } from "@commerceos/core";
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
 * Names of the best sellers, from the existing `GetTopProductsUseCase` over the last 30 days of
 * paid orders (storefront v2 Q11, A-4). The metric is computed once, by that use case.
 */
export function loadBestSellerNames(now: Date): Promise<LoadResult<string[]>> {
  return loadWithRequestScope({ page: "home: best sellers" }, async (cradle) => {
    const top = await cradle.getTopProductsUseCase.execute({
      period: resolvePeriod(BEST_SELLERS_PRESET, now),
      limit: BEST_SELLERS_LIMIT,
    });
    return top.rows.map((row) => row.name);
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

import "server-only";
import type { CatalogProductDetail } from "@commerceos/core";
import { cache } from "react";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";

/**
 * One published product for its page. Wrapped in React `cache()`, so `generateMetadata`
 * and the page share one query per request. Drafts and unknown slugs are "not-found".
 */
export const loadProductPage = cache((slug: string): Promise<LoadResult<CatalogProductDetail>> =>
  loadWithRequestScope({ page: "/products/[slug]", slug }, (cradle) =>
    cradle.getCatalogProductUseCase.execute({ slug }),
  ),
);

/** The page title. Never derived from anything but a published product (no draft leaks). */
export function productPageTitle(result: LoadResult<CatalogProductDetail>): string {
  if (result.kind === "ok") return result.data.name;
  return result.kind === "not-found" ? "Product not found" : "Products";
}

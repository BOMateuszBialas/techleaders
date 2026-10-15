import "server-only";
import type { AdminCategoryDetail, AdminCategoryRecord } from "@commerceos/core";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";

/** Every category with its product count, for `/admin/categories`. */
export function loadAdminCategories(): Promise<LoadResult<AdminCategoryRecord[]>> {
  return loadWithRequestScope({ page: "/admin/categories" }, (cradle) =>
    cradle.listCategoriesUseCase.execute(),
  );
}

/** One category and its first products; a malformed or unknown id is "not-found". */
export function loadAdminCategory(id: string): Promise<LoadResult<AdminCategoryDetail>> {
  return loadWithRequestScope({ page: "/admin/categories/[id]" }, (cradle) =>
    cradle.getCategoryUseCase.execute({ id }),
  );
}

/** Thrown to the admin error boundary when a page's data cannot be loaded (already logged). */
export class AdminPageLoadError extends Error {
  constructor() {
    super("Admin page data could not be loaded.");
    this.name = "AdminPageLoadError";
  }
}

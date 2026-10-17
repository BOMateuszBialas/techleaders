import "server-only";
import type { Dashboard } from "@commerceos/core";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";

/**
 * The dashboard metrics for `/admin?period=…`. `period` is the raw, untrusted search parameter;
 * the use case falls back to "Last 7 days" for anything it does not know.
 */
export function loadDashboard(period: unknown): Promise<LoadResult<Dashboard>> {
  return loadWithRequestScope({ page: "/admin" }, (cradle) =>
    cradle.getDashboardUseCase.execute({ period }),
  );
}

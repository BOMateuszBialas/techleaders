import "server-only";
import type { Dashboard, UnpaidOrdersSummary } from "@commerceos/core";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";

/**
 * The dashboard metrics for `/admin?period=…` or `?from=…&to=…`: the raw, untrusted search
 * parameters; the use case validates them and falls back to a preset for anything invalid.
 */
export function loadDashboard(params: {
  period?: unknown;
  from?: unknown;
  to?: unknown;
}): Promise<LoadResult<Dashboard>> {
  return loadWithRequestScope({ page: "/admin" }, (cradle) =>
    cradle.getDashboardUseCase.execute(params),
  );
}

/** The unpaid-orders card on `/admin`: the count, the stale count and the oldest creation time. */
export function loadUnpaidOrders(): Promise<LoadResult<UnpaidOrdersSummary>> {
  return loadWithRequestScope({ page: "/admin" }, (cradle) =>
    cradle.unpaidOrdersSummaryUseCase.execute(),
  );
}

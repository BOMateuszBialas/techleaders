import "server-only";
import type { Dashboard } from "@commerceos/core";
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

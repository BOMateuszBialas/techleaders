import "server-only";
import type { CopilotRecommendationList } from "@commerceos/core";
import { loadWithRequestScope, type LoadResult } from "@/server/load-with-request-scope";
import { firstQueryValue } from "../orders/load-orders";

/** One page of "Your recommendations" on `/admin/copilot`, newest first (Copilot spec Phase 4). */
export function loadCopilotRecommendations(
  page: string | string[] | undefined,
): Promise<LoadResult<CopilotRecommendationList>> {
  return loadWithRequestScope({ page: "/admin/copilot" }, (cradle) =>
    cradle.listCopilotRecommendationsUseCase.execute({ page: firstQueryValue(page) }),
  );
}

"use server";

import { isStaleRecommendationStatusError, type RecommendationStatus } from "@commerceos/core";
import { refresh } from "next/cache";
import {
  statusChangedMessage,
  type RecommendationStatusState,
} from "@/components/admin/copilot/recommendation-copy";
import { readFormValue } from "../catalog/form-data";
import { runAdminAction } from "../catalog/run-admin-action";

// Every export of a "use server" file is a public POST endpoint. Each one runs through
// runAdminAction, which calls requireAdmin() before the handler (unit-tested per export).

/**
 * Saves, dismisses or completes a Copilot recommendation (Copilot spec, API Contracts
 * `changeRecommendationStatus`; #26). The use case checks the pair against the transition table
 * (A14) and applies it only while the recommendation is still in `from`. It writes the
 * recommendation's status and time only: never store data (D02). Only the recommendation id is
 * logged.
 *
 * The returned state carries the status the recommendation has now, so the card in the client's
 * answer shows it at once. When a second tab changed it meanwhile (stale), nothing was written
 * and `runAdminAction` does not refresh; this action refreshes the page itself so
 * "Your recommendations" shows the current state. `runAdminAction` also updates the `catalog`
 * cache tag after a change: a harmless no-op here (Copilot spec, Modules).
 */
export async function changeRecommendationStatus(
  _previous: RecommendationStatusState,
  formData: FormData,
): Promise<RecommendationStatusState> {
  const recommendationId = readFormValue(formData, "recommendationId");
  const from = readFormValue(formData, "from");
  const to = readFormValue(formData, "to");
  let currentStatus: RecommendationStatus | undefined;
  let stale = false;
  const state = await runAdminAction(
    "copilot.recommendation.status.change",
    {},
    async ({ changeRecommendationStatusUseCase }) => {
      const result = await changeRecommendationStatusUseCase
        .execute({ recommendationId, from, to })
        .catch((error: unknown) => {
          if (isStaleRecommendationStatusError(error)) {
            stale = true;
            currentStatus = error.currentStatus;
          }
          throw error;
        });
      currentStatus = result.to;
      return {
        event: "copilot.recommendation.status.changed",
        id: result.recommendation.id,
        message: statusChangedMessage(result.to),
      };
    },
  );
  if (stale) refresh();
  return currentStatus ? { ...state, currentStatus } : state;
}

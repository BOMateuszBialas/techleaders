"use client";

import { use, useActionState, useMemo } from "react";
import {
  IDLE_RECOMMENDATION_STATUS_STATE,
  reportingStatusAction,
  type RecommendationStatusAction,
} from "./recommendation-copy";
import {
  RecommendationStatusFormView,
  type RecommendationStatusFormViewProps,
} from "./recommendation-status-form-view";
import { RecommendationStatusesContext } from "./recommendation-statuses";

/**
 * Thin client wrapper: `useActionState` plus the view, no branches. The action reports the
 * status the server returned to the page, and the view shows the latest one reported for this
 * recommendation by any card (#67).
 */
export function RecommendationStatusForm({
  action,
  recommendation,
}: {
  action: RecommendationStatusAction;
  recommendation: RecommendationStatusFormViewProps["recommendation"];
}) {
  const { statuses, report } = use(RecommendationStatusesContext);
  const reporting = useMemo(
    () => reportingStatusAction(action, recommendation.id, report),
    [action, recommendation.id, report],
  );
  const [state, formAction, pending] = useActionState(reporting, IDLE_RECOMMENDATION_STATUS_STATE);
  return (
    <RecommendationStatusFormView
      action={formAction}
      state={state}
      pending={pending}
      recommendation={recommendation}
      reportedStatus={statuses[recommendation.id]}
    />
  );
}

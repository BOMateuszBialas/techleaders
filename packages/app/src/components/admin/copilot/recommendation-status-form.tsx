"use client";

import { use, useActionState, useMemo } from "react";
import type { RecommendationStatus } from "@commerceos/core";
import {
  IDLE_RECOMMENDATION_STATUS_STATE,
  reportingStatusAction,
  type RecommendationStatusAction,
} from "./recommendation-copy";
import {
  RecommendationStatusBadgeView,
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

/**
 * The status badge of a card header (D12). It shows the latest status reported on the page for
 * this recommendation, else the one rendered, so it agrees with the form in the card body.
 */
export function RecommendationStatusBadge({
  id,
  status,
}: {
  id: string;
  status: RecommendationStatus;
}) {
  const { statuses } = use(RecommendationStatusesContext);
  const reported: RecommendationStatus | undefined = statuses[id];
  return <RecommendationStatusBadgeView status={reported ?? status} />;
}

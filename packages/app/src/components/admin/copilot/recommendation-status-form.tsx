"use client";

import { useActionState } from "react";
import {
  IDLE_RECOMMENDATION_STATUS_STATE,
  type RecommendationStatusAction,
} from "./recommendation-copy";
import {
  RecommendationStatusFormView,
  type RecommendationStatusFormViewProps,
} from "./recommendation-status-form-view";

/** Thin client wrapper: `useActionState` plus the view, no branches. */
export function RecommendationStatusForm({
  action,
  recommendation,
}: {
  action: RecommendationStatusAction;
  recommendation: RecommendationStatusFormViewProps["recommendation"];
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_RECOMMENDATION_STATUS_STATE);
  return (
    <RecommendationStatusFormView
      action={formAction}
      state={state}
      pending={pending}
      recommendation={recommendation}
    />
  );
}

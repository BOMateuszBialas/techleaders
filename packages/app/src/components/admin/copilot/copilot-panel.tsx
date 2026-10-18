"use client";

import { useActionState } from "react";
import { IDLE_COPILOT_STATE, createAskCopilotAction, type SuggestedQuestion } from "./copilot-copy";
import { CopilotPanelView } from "./copilot-panel-view";
import type { RecommendationStatusAction } from "./recommendation-copy";

// Called as a plain function (no `this`), which the global fetch accepts.
const askCopilot = createAskCopilotAction(fetch);

/** Thin client wrapper: `useActionState` over the JSON route plus the view, no branches. */
export function CopilotPanel({
  questions,
  statusAction,
}: {
  questions: SuggestedQuestion[];
  statusAction: RecommendationStatusAction;
}) {
  const [state, formAction, pending] = useActionState(askCopilot, IDLE_COPILOT_STATE);
  return (
    <CopilotPanelView
      action={formAction}
      state={state}
      pending={pending}
      questions={questions}
      statusAction={statusAction}
    />
  );
}

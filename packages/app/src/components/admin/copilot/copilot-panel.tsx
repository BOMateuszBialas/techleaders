"use client";

import { useActionState, useState } from "react";
import { createAskCopilotAction, IDLE_COPILOT_STATE, type SuggestedQuestion } from "./copilot-copy";
import { CopilotPanelView } from "./copilot-panel-view";
import type { RecommendationStatusAction } from "./recommendation-copy";

// Called as a plain function (no `this`), which the global fetch accepts.
const askCopilot = createAskCopilotAction(fetch);

/**
 * Thin client wrapper: `useActionState` over the JSON route, plus one `useState` for the question
 * counter (C5, OA-4). The view stays hook-free; the focus after a refused question is a ref
 * callback in the view (`focusRefusedQuestion`), so the wrapper has no effect and no ref.
 */
export function CopilotPanel({
  questions,
  statusAction,
}: {
  questions: SuggestedQuestion[];
  statusAction: RecommendationStatusAction;
}) {
  const [state, formAction, pending] = useActionState(askCopilot, IDLE_COPILOT_STATE);
  const [questionLength, setQuestionLength] = useState(state.question.length);
  return (
    <CopilotPanelView
      action={formAction}
      state={state}
      pending={pending}
      questions={questions}
      questionLength={questionLength}
      onQuestionChange={setQuestionLength}
      statusAction={statusAction}
    />
  );
}

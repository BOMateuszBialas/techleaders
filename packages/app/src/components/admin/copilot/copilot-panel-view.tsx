import { COPILOT_QUESTION_MAX_LENGTH } from "@commerceos/core";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { CopilotAnswerView } from "./copilot-answer-view";
import {
  PENDING_TEXT,
  questionLengthText,
  type CopilotPanelState,
  type SuggestedQuestion,
} from "./copilot-copy";
import type { RecommendationStatusAction } from "./recommendation-copy";

/**
 * Hook-free Copilot panel: the suggested-question buttons and a typed question in one form,
 * then the answer region (`aria-live`) with the pending state, an error or the answer.
 * `questionLength` and `onQuestionChange` come from the wrapper, which holds the counter's state
 * (OA-4); the counter is not in an `aria-live` region, so it is not read on each keystroke (A6).
 */
export function CopilotPanelView({
  action,
  state,
  pending,
  questions,
  questionLength,
  onQuestionChange,
  statusAction,
}: {
  action: (formData: FormData) => void;
  state: CopilotPanelState;
  pending: boolean;
  questions: SuggestedQuestion[];
  /** Characters in the typed question (the counter). */
  questionLength: number;
  onQuestionChange: (length: number) => void;
  /** Saves, dismisses or completes a stored recommendation (Phase 4). */
  statusAction?: RecommendationStatusAction;
}) {
  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-4" aria-busy={pending}>
        <FieldSet disabled={pending}>
          <FieldLegend>Suggested questions</FieldLegend>
          <div className="flex flex-wrap gap-2">
            {questions.map((item) => (
              <Button
                key={item.intent}
                type="submit"
                name="intent"
                value={item.intent}
                variant="outline"
                size="sm-wrap"
              >
                {item.question}
              </Button>
            ))}
          </div>
        </FieldSet>
        <Field>
          <FieldLabel htmlFor="copilot-question">Or ask about your store</FieldLabel>
          <Textarea
            id="copilot-question"
            name="question"
            maxLength={COPILOT_QUESTION_MAX_LENGTH}
            defaultValue={state.question}
            readOnly={pending}
            placeholder="Which products are low on stock?"
            aria-describedby="copilot-question-hint"
            onChange={(event) => onQuestionChange(event.currentTarget.value.length)}
          />
          <FieldDescription id="copilot-question-hint">
            Up to {COPILOT_QUESTION_MAX_LENGTH} characters, in English.{" "}
            <span>{questionLengthText(questionLength, COPILOT_QUESTION_MAX_LENGTH)}</span>
          </FieldDescription>
        </Field>
        <div>
          <Button type="submit" disabled={pending}>
            Ask
          </Button>
        </div>
      </form>
      <div aria-live="polite">
        {pending ? (
          <p role="status" className="text-sm text-muted-foreground">
            {PENDING_TEXT}
          </p>
        ) : state.status === "error" ? (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        ) : state.answer ? (
          <CopilotAnswerView
            answer={state.answer}
            questions={questions}
            statusAction={statusAction}
          />
        ) : null}
      </div>
    </div>
  );
}

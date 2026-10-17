import { COPILOT_QUESTION_MAX_LENGTH } from "@commerceos/core";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CopilotAnswerView } from "./copilot-answer-view";
import { PENDING_TEXT, type CopilotPanelState, type SuggestedQuestion } from "./copilot-copy";

/**
 * Hook-free Copilot panel: the suggested-question buttons and a typed question in one form,
 * then the answer region (`aria-live`) with the pending state, an error or the answer.
 */
export function CopilotPanelView({
  action,
  state,
  pending,
  questions,
}: {
  action: (formData: FormData) => void;
  state: CopilotPanelState;
  pending: boolean;
  questions: SuggestedQuestion[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-4" aria-busy={pending}>
        <fieldset className="flex flex-col gap-2" disabled={pending}>
          <legend className="mb-2 text-sm font-medium">Suggested questions</legend>
          <div className="flex flex-wrap gap-2">
            {questions.map((item) => (
              <Button
                key={item.intent}
                type="submit"
                name="intent"
                value={item.intent}
                variant="outline"
                size="sm"
              >
                {item.question}
              </Button>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-2">
          <Label htmlFor="copilot-question">Or ask about your store</Label>
          <Textarea
            id="copilot-question"
            name="question"
            maxLength={COPILOT_QUESTION_MAX_LENGTH}
            defaultValue={state.question}
            readOnly={pending}
            placeholder="Which products are low on stock?"
            aria-describedby="copilot-question-hint"
          />
          <p id="copilot-question-hint" className="text-sm text-muted-foreground">
            Up to {COPILOT_QUESTION_MAX_LENGTH} characters, in English.
          </p>
          <div>
            <Button type="submit" disabled={pending}>
              Ask
            </Button>
          </div>
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
          <CopilotAnswerView answer={state.answer} questions={questions} />
        ) : null}
      </div>
    </div>
  );
}

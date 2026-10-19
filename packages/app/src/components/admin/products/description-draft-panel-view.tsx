import { Button } from "@/components/ui/button";
import type { DraftButtonEvent, DraftPanelState } from "./description-draft-client";
import {
  APPLIED_TEXT,
  basedOnText,
  DISCARD_LABEL,
  DRAFT_BUTTON_LABEL,
  DRAFT_HEADING,
  DRAFT_WARNING,
  IDLE_HINT,
  NOT_CONFIGURED_TEXT,
  PENDING_TEXT,
  REPLACE_LABEL,
  UNDO_LABEL,
} from "./description-draft-copy";

export type DescriptionDraftPanelViewProps = {
  /** False without an AI key (`llmProvider.isConfigured`): the button is disabled and says why. */
  available: boolean;
  state: DraftPanelState;
  pending: boolean;
  onDraft: (event: DraftButtonEvent) => void;
  onApply: (event: DraftButtonEvent) => void;
  onUndo: (event: DraftButtonEvent) => void;
  onDiscard: () => void;
};

const HINT_ID = "description-draft-hint";

/**
 * "Draft with AI" under the product form's Description field (descriptions spec, UI/UX), in one
 * given state: no hooks, so a unit test renders every state. `DescriptionDraftPanel` connects
 * it to `useActionState`. The draft is model text, so it is rendered only as React text (never
 * HTML or Markdown), apart from the form, until the owner copies it in and saves the form.
 */
export function DescriptionDraftPanelView({
  available,
  state,
  pending,
  onDraft,
  onApply,
  onUndo,
  onDiscard,
}: DescriptionDraftPanelViewProps) {
  if (!available) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <Button
          type="button"
          variant="secondary"
          disabled
          focusableWhenDisabled
          aria-describedby={HINT_ID}
        >
          {DRAFT_BUTTON_LABEL}
        </Button>
        <p id={HINT_ID} className="text-sm text-muted-foreground">
          {NOT_CONFIGURED_TEXT}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          focusableWhenDisabled
          aria-describedby={HINT_ID}
          onClick={onDraft}
        >
          {DRAFT_BUTTON_LABEL}
        </Button>
        <p id={HINT_ID} className="text-sm text-muted-foreground">
          {pending ? PENDING_TEXT : IDLE_HINT}
        </p>
      </div>
      <div aria-live="polite" aria-busy={pending} className="flex flex-col gap-2">
        {state.kind === "ready" ? (
          <section
            aria-labelledby="description-draft-heading"
            className="flex flex-col gap-2 rounded-lg border p-3"
          >
            <h3 id="description-draft-heading" className="text-sm font-semibold">
              {DRAFT_HEADING}
            </h3>
            <p className="text-sm break-words whitespace-pre-line">{state.text}</p>
            <p className="text-xs text-muted-foreground">{basedOnText(state.fieldsUsed)}</p>
            <p className="text-sm text-amber-700 dark:text-amber-400">{DRAFT_WARNING}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={pending} onClick={onApply}>
                {REPLACE_LABEL}
              </Button>
              <Button type="button" variant="outline" disabled={pending} onClick={onDiscard}>
                {DISCARD_LABEL}
              </Button>
            </div>
          </section>
        ) : null}
        {state.kind === "applied" ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm">{APPLIED_TEXT}</p>
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onUndo}>
              {UNDO_LABEL}
            </Button>
          </div>
        ) : null}
        {state.kind === "message" ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : null}
      </div>
    </div>
  );
}

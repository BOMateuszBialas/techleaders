import type { RecommendationStatus } from "@commerceos/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormMessage } from "../form-feedback";
import {
  ACTIONS_NOTE,
  NO_FURTHER_ACTIONS,
  STATUS_BUTTON_TEXT,
  shownRecommendationStatus,
  statusActions,
  statusText,
  type RecommendationStatusState,
} from "./recommendation-copy";

export type RecommendationStatusFormViewProps = {
  action: (formData: FormData) => void;
  state: RecommendationStatusState;
  pending: boolean;
  recommendation: { id: string; status: RecommendationStatus; title: string };
  /** The latest status another card on the page reported for this recommendation (#67). */
  reportedStatus?: RecommendationStatus;
};

/**
 * A recommendation's status and the owner's actions in one given state (Copilot spec, UI/UX;
 * #26): no hooks, so a unit test renders every state; `RecommendationStatusForm` connects it to
 * `useActionState`. The form posts the status the card shows (`from`, the server's lost-update
 * guard) and the pressed button's target. After a change the status shown is the one the server
 * reported, so the card is right before the page refreshes; a status reported by the other card
 * of the same recommendation (answer and list) wins, so neither offers a refused action (#67).
 * Each button's accessible name ends with the recommendation's title (`aria-label`, starting
 * with the visible text), so screen-reader users can tell the cards apart.
 */
export function RecommendationStatusFormView({
  action,
  state,
  pending,
  recommendation,
  reportedStatus,
}: RecommendationStatusFormViewProps) {
  const { status, showMessage } = shownRecommendationStatus(
    state,
    recommendation.status,
    reportedStatus,
  );
  const actions = statusActions(status);
  return (
    <div className="flex flex-col gap-2 border-t pt-3" data-testid="recommendation-status">
      <div>
        <Badge variant={status === "new" ? "outline" : "secondary"}>{statusText(status)}</Badge>
      </div>
      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{NO_FURTHER_ACTIONS}</p>
      ) : (
        <form action={action} aria-busy={pending} className="flex flex-col gap-2">
          <input type="hidden" name="recommendationId" value={recommendation.id} />
          <input type="hidden" name="from" value={status} />
          <div className="flex flex-wrap gap-2">
            {actions.map((to) => (
              <Button
                key={to}
                type="submit"
                name="to"
                value={to}
                size="sm"
                variant={to === "dismissed" ? "outline" : "default"}
                disabled={pending}
                aria-label={`${STATUS_BUTTON_TEXT[to]}: ${recommendation.title}`}
              >
                {STATUS_BUTTON_TEXT[to]}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{ACTIONS_NOTE}</p>
        </form>
      )}
      {showMessage ? <FormMessage state={state} /> : null}
    </div>
  );
}

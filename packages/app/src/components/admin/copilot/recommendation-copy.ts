import {
  RECOMMENDATION_STATUS_LABELS,
  STORE_TIME_ZONE,
  allowedRecommendationTransitions,
  type CopilotRecommendationRecord,
  type RecommendationStatus,
} from "@commerceos/core";
import type { CopilotAnswerRecommendation } from "@commerceos/ai";
import type { ActionState } from "@/lib/action-state";

/** Client-safe: the status forms import it, so it holds no server code. */

/**
 * What the status action returns: the form-level message plus the status the recommendation
 * has now (after a change, or the newer one a second tab set), so the card shows it at once.
 */
export type RecommendationStatusState = ActionState & { currentStatus?: RecommendationStatus };

/** The signature `useActionState` expects from the recommendation status action. */
export type RecommendationStatusAction = (
  previous: RecommendationStatusState,
  formData: FormData,
) => Promise<RecommendationStatusState>;

export const IDLE_RECOMMENDATION_STATUS_STATE: RecommendationStatusState = { status: "idle" };

/**
 * The latest status the server reported for each recommendation on the page, by id (#67). The
 * same recommendation can show twice, in the answer and under "Your recommendations"; each card
 * reports what its action returned, so the other card never offers a refused action.
 */
export type ReportedStatuses = Readonly<Record<string, RecommendationStatus>>;
export type StatusReport = { id: string; status: RecommendationStatus };
export type ReportedStatusesValue = {
  statuses: ReportedStatuses;
  report: (report: StatusReport) => void;
};

/** The reducer behind `RecommendationStatusesProvider`. */
export function recordReportedStatus(
  statuses: ReportedStatuses,
  report: StatusReport,
): ReportedStatuses {
  return { ...statuses, [report.id]: report.status };
}

/** Outside a provider nothing is shared: a card shows only its own state. */
export function ignoreStatusReport(): void {}
export const NO_SHARED_STATUSES: ReportedStatusesValue = {
  statuses: {},
  report: ignoreStatusReport,
};

/** The status action of one card, reporting the status the server returned to the page. */
export function reportingStatusAction(
  action: RecommendationStatusAction,
  id: string,
  report: ReportedStatusesValue["report"],
): RecommendationStatusAction {
  return async (previous, formData) => {
    const next = await action(previous, formData);
    if (next.currentStatus) report({ id, status: next.currentStatus });
    return next;
  };
}

/**
 * What a card shows: the latest status reported on the page, else its own action's, else the
 * one it was rendered with. Its own message only while it describes that status: after the
 * other card of the same recommendation changed it, "Recommendation saved." would be stale.
 */
export function shownRecommendationStatus(
  state: RecommendationStatusState,
  rendered: RecommendationStatus,
  reported: RecommendationStatus | undefined,
): { status: RecommendationStatus; showMessage: boolean } {
  return {
    status: reported ?? state.currentStatus ?? rendered,
    showMessage: reported === undefined || reported === state.currentStatus,
  };
}

/** The button that moves a recommendation to each status (Copilot spec, UI/UX). */
export const STATUS_BUTTON_TEXT: Readonly<Record<Exclude<RecommendationStatus, "new">, string>> = {
  saved: "Save",
  dismissed: "Dismiss",
  completed: "Mark completed",
};

/** The owner's next steps for a status: none for dismissed and completed (A14). */
export function statusActions(
  status: RecommendationStatus,
): Exclude<RecommendationStatus, "new">[] {
  return allowedRecommendationTransitions(status).filter(
    (to): to is Exclude<RecommendationStatus, "new"> => to !== "new",
  );
}

/** "Status: Saved". */
export function statusText(status: RecommendationStatus): string {
  return `Status: ${RECOMMENDATION_STATUS_LABELS[status]}`;
}

export const NO_FURTHER_ACTIONS = "No further actions.";
export const ACTIONS_NOTE =
  "Your decision is recorded here only; Copilot changes nothing in your store.";

/** The success message of a status change (Copilot spec, API Contracts). */
export function statusChangedMessage(to: RecommendationStatus): string {
  if (to === "completed") {
    return "Recommendation marked as completed. Copilot did not change anything in your store.";
  }
  return `Recommendation ${RECOMMENDATION_STATUS_LABELS[to].toLowerCase()}.`;
}

export const YOUR_RECOMMENDATIONS_HEADING = "Your recommendations";
export const YOUR_RECOMMENDATIONS_INTRO = "Saved and completed recommendations, newest first.";
export const EMPTY_RECOMMENDATIONS_TEXT = "Saved recommendations appear here.";
export const EMPTY_RECOMMENDATIONS_PAGE_TEXT = "There are no recommendations on this page.";
export const RECOMMENDATIONS_UNAVAILABLE_TEXT =
  "Your recommendations could not be loaded. Try again in a moment.";
export const DELETED_PRODUCT_TEXT = "(deleted product)";

/** `/admin/copilot?page=N` (page 1 has no query). */
export function recommendationsPageHref(page: number): string {
  return page <= 1 ? "/admin/copilot" : `/admin/copilot?page=${page}`;
}

/** `YYYY-MM-DD` in the store time zone, like every Copilot period (numeric parts only). */
const STORE_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: STORE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "Suggested on 2026-10-18": the store-time-zone day the recommendation was shown. */
export function storedOnText(createdAt: Date): string {
  return `Suggested on ${STORE_DAY.format(createdAt)}`;
}

/** What a recommendation card shows; a stored product may have been deleted since (no name). */
export type RecommendationCardData = Omit<CopilotAnswerRecommendation, "relatedProducts"> & {
  relatedProducts: { id: string; name: string | null }[];
};

/** A stored recommendation as a card. */
export function toRecommendationCard(record: CopilotRecommendationRecord): RecommendationCardData {
  return {
    id: record.id,
    status: record.status,
    title: record.title,
    priority: record.priority,
    observation: record.observation,
    evidence: record.evidence,
    reasoning: record.reasoning,
    suggestedAction: record.suggestedAction,
    limitations: record.limitations,
    relatedProducts: record.relatedProducts,
  };
}

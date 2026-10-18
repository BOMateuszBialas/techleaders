import { ConflictError, hasAppErrorCode } from "../../errors/app-error";

/** What the owner did with a stored Copilot recommendation (Copilot spec A14, #26). */
export const RECOMMENDATION_STATUSES = ["new", "saved", "dismissed", "completed"] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

/**
 * The owner's recommendation workflow (Copilot spec A14). Each status lists the statuses the
 * owner may move it to. `dismissed` and `completed` are terminal (an undo is additive later).
 * A status change records the owner's decision only: Copilot never changes store data (D02).
 */
export const RECOMMENDATION_TRANSITIONS: Readonly<
  Record<RecommendationStatus, readonly RecommendationStatus[]>
> = {
  new: ["saved", "dismissed", "completed"],
  saved: ["completed", "dismissed"],
  dismissed: [],
  completed: [],
};

/** Owner-facing names of the statuses. */
export const RECOMMENDATION_STATUS_LABELS: Readonly<Record<RecommendationStatus, string>> = {
  new: "New",
  saved: "Saved",
  dismissed: "Dismissed",
  completed: "Completed",
};

/** True for a value the database's status column accepts. */
export function isRecommendationStatus(value: unknown): value is RecommendationStatus {
  return (
    typeof value === "string" && (RECOMMENDATION_STATUSES as readonly string[]).includes(value)
  );
}

/** The statuses the owner may move a recommendation in `from` to, in workflow order. */
export function allowedRecommendationTransitions(
  from: RecommendationStatus,
): readonly RecommendationStatus[] {
  return RECOMMENDATION_TRANSITIONS[from];
}

/** True when the owner may move a recommendation from `from` to `to` (A14). */
export function canChangeRecommendationStatus(
  from: RecommendationStatus,
  to: RecommendationStatus,
): boolean {
  return RECOMMENDATION_TRANSITIONS[from].includes(to);
}

/**
 * The recommendation is no longer in the status the page showed (a second tab changed it):
 * nothing was written. `currentStatus` lets the page show what it is now.
 */
export class StaleRecommendationStatusError extends ConflictError {
  constructor(readonly currentStatus: RecommendationStatus) {
    super(
      `This recommendation is already ${RECOMMENDATION_STATUS_LABELS[currentStatus].toLowerCase()}. Nothing was changed.`,
    );
  }
}

/** True for a `StaleRecommendationStatusError` from any copy of this package (see `hasAppErrorCode`). */
export function isStaleRecommendationStatusError(
  error: unknown,
): error is Error & { readonly code: "CONFLICT"; readonly currentStatus: RecommendationStatus } {
  return (
    hasAppErrorCode(error, "CONFLICT") &&
    "currentStatus" in error &&
    isRecommendationStatus(error.currentStatus)
  );
}

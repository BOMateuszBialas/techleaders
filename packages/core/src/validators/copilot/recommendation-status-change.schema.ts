import { z } from "zod";
import { RECOMMENDATION_STATUSES } from "../../domain/copilot/recommendation-status";

/** The one message for a status change outside the transition table or with unknown values. */
export const RECOMMENDATION_CHANGE_NOT_ALLOWED_MESSAGE = "This status change is not allowed.";
export const RECOMMENDATION_NOT_FOUND_MESSAGE = "This recommendation does not exist.";

/**
 * An owner's recommendation status change (Copilot spec, API Contracts
 * `changeRecommendationStatus`): the recommendation, the status the page showed (`from`, the
 * lost-update guard) and the target. All three come from hidden form fields and the pressed
 * button; the id is checked by the use case (malformed → "not found").
 */
export const recommendationStatusChangeSchema = z.object({
  recommendationId: z.string().trim(),
  from: z.enum(RECOMMENDATION_STATUSES),
  to: z.enum(RECOMMENDATION_STATUSES),
});

/** What the status form posts: untrusted text, checked by the schema above. */
export type RecommendationStatusChangeRequest = {
  recommendationId: string;
  from: string;
  to: string;
};

/** Stored recommendations per page of "Your recommendations" (Copilot spec, UI/UX). */
export const COPILOT_RECOMMENDATIONS_PAGE_SIZE = 20;

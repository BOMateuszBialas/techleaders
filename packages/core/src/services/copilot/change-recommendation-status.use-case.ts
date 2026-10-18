import {
  StaleRecommendationStatusError,
  canChangeRecommendationStatus,
  type RecommendationStatus,
} from "../../domain/copilot/recommendation-status";
import { NotFoundError, ValidationError } from "../../errors/app-error";
import type {
  CopilotRecommendationRecord,
  CopilotRecommendationRepositoryPort,
} from "../../ports/copilot-recommendation-repository.port";
import { isUuid } from "../../validators/common/uuid.schema";
import {
  RECOMMENDATION_CHANGE_NOT_ALLOWED_MESSAGE,
  RECOMMENDATION_NOT_FOUND_MESSAGE,
  recommendationStatusChangeSchema,
  type RecommendationStatusChangeRequest,
} from "../../validators/copilot/recommendation-status-change.schema";

export type ChangeRecommendationStatusResult = {
  recommendation: CopilotRecommendationRecord;
  from: RecommendationStatus;
  to: RecommendationStatus;
};

/**
 * The owner saves, dismisses or completes a recommendation (Copilot spec A14, #26). Unknown
 * values and pairs outside the transition table are one `ValidationError`; nothing reaches the
 * port. The change applies only while the row is still in `from`; otherwise
 * `StaleRecommendationStatusError` names the status it has now. It writes the recommendation's
 * status and time only: Copilot never changes store data (D02).
 */
export class ChangeRecommendationStatusUseCase {
  constructor(
    private readonly deps: { copilotRecommendationRepository: CopilotRecommendationRepositoryPort },
  ) {}

  async execute(
    request: RecommendationStatusChangeRequest,
  ): Promise<ChangeRecommendationStatusResult> {
    const parsed = recommendationStatusChangeSchema.safeParse(request);
    if (!parsed.success) throw new ValidationError(RECOMMENDATION_CHANGE_NOT_ALLOWED_MESSAGE);
    const { recommendationId, from, to } = parsed.data;
    if (!canChangeRecommendationStatus(from, to)) {
      throw new ValidationError(RECOMMENDATION_CHANGE_NOT_ALLOWED_MESSAGE);
    }
    if (!isUuid(recommendationId)) throw new NotFoundError(RECOMMENDATION_NOT_FOUND_MESSAGE);

    const result = await this.deps.copilotRecommendationRepository.changeStatus({
      id: recommendationId,
      from,
      to,
    });
    if (result.kind === "not_found") throw new NotFoundError(RECOMMENDATION_NOT_FOUND_MESSAGE);
    if (result.kind === "stale") throw new StaleRecommendationStatusError(result.currentStatus);
    return { recommendation: result.recommendation, from, to };
  }
}

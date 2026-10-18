import type { RecommendationStatus } from "../../domain/copilot/recommendation-status";
import type {
  CopilotRecommendationRecord,
  CopilotRecommendationRepositoryPort,
} from "../../ports/copilot-recommendation-repository.port";
import { COPILOT_RECOMMENDATIONS_PAGE_SIZE } from "../../validators/copilot/recommendation-status-change.schema";
import { parseAdminOrderPage } from "../../validators/orders/order-status-change.schema";

/** "Your recommendations" lists what the owner kept: saved and completed (Copilot spec, UI/UX). */
export const LISTED_RECOMMENDATION_STATUSES: readonly RecommendationStatus[] = [
  "saved",
  "completed",
];

export type CopilotRecommendationList = {
  rows: CopilotRecommendationRecord[];
  page: number;
  pageCount: number;
  total: number;
};

/**
 * "Your recommendations" on `/admin/copilot`: saved and completed recommendations, newest first,
 * 20 per page. `page` is the raw query value and follows the order list's rule: anything that is
 * not a whole number from 1 is page 1. A page beyond the last returns no rows.
 */
export class ListCopilotRecommendationsUseCase {
  constructor(
    private readonly deps: { copilotRecommendationRepository: CopilotRecommendationRepositoryPort },
  ) {}

  async execute(input: { page?: unknown } = {}): Promise<CopilotRecommendationList> {
    const page = parseAdminOrderPage(input.page);
    const { rows, total } = await this.deps.copilotRecommendationRepository.listByStatus(
      LISTED_RECOMMENDATION_STATUSES,
      {
        offset: (page - 1) * COPILOT_RECOMMENDATIONS_PAGE_SIZE,
        limit: COPILOT_RECOMMENDATIONS_PAGE_SIZE,
      },
    );
    return {
      rows,
      page,
      pageCount: Math.max(1, Math.ceil(total / COPILOT_RECOMMENDATIONS_PAGE_SIZE)),
      total,
    };
  }
}

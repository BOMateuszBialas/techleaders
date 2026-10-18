import type {
  CopilotRecommendationRepositoryPort,
  NewCopilotAnswer,
} from "../../ports/copilot-recommendation-repository.port";

export type SavedCopilotAnswer = {
  /** `null` when the answer had no recommendation: nothing was stored. */
  answerId: string | null;
  /** The new rows' ids, in the order of `answer.recommendations`. */
  recommendationIds: string[];
};

/**
 * Stores an answered question's recommendations as `new` when they are generated (Copilot spec
 * A13), so the owner can save, dismiss or complete them. Rows never acted on stay `new` as the
 * audit of what was shown. Called by `AskCopilotUseCase`; it writes only Copilot's own table.
 */
export class SaveCopilotAnswerUseCase {
  constructor(
    private readonly deps: { copilotRecommendationRepository: CopilotRecommendationRepositoryPort },
  ) {}

  async execute(answer: NewCopilotAnswer): Promise<SavedCopilotAnswer> {
    if (answer.recommendations.length === 0) return { answerId: null, recommendationIds: [] };
    return this.deps.copilotRecommendationRepository.saveAnswer(answer);
  }
}

import type { CopilotIntentId } from "../domain/copilot/copilot-intent";
import type {
  CopilotAnswerOrigin,
  CopilotFallbackReason,
  RecommendationEvidenceRecord,
  RecommendationPriority,
} from "../domain/copilot/copilot-recommendation";
import type { RecommendationStatus } from "../domain/copilot/recommendation-status";

/** One recommendation of an answer, as the server built it (text, evidence and product ids). */
export type NewCopilotRecommendation = {
  title: string;
  priority: RecommendationPriority;
  observation: string;
  evidence: RecommendationEvidenceRecord[];
  reasoning: string;
  suggestedAction: string;
  relatedProductIds: string[];
  limitations: string[];
};

/**
 * An answered question's recommendations, stored as `new` when generated (Copilot spec A13).
 * Provider, model and prompt version are set only for an LLM answer; the owner's question is
 * never stored (A16).
 */
export type NewCopilotAnswer = {
  intent: CopilotIntentId;
  origin: CopilotAnswerOrigin;
  fallbackReason: CopilotFallbackReason | null;
  provider: string | null;
  model: string | null;
  promptVersion: string | null;
  periodFrom: Date;
  periodTo: Date;
  /** At least one; an answer without recommendations stores nothing. */
  recommendations: NewCopilotRecommendation[];
};

/** A stored recommendation as the owner's list shows it. */
export type CopilotRecommendationRecord = {
  id: string;
  answerId: string;
  intent: CopilotIntentId;
  origin: CopilotAnswerOrigin;
  model: string | null;
  title: string;
  priority: RecommendationPriority;
  observation: string;
  evidence: RecommendationEvidenceRecord[];
  reasoning: string;
  suggestedAction: string;
  limitations: string[];
  /** The related products in stored order; `name` is null once the product was deleted. */
  relatedProducts: { id: string; name: string | null }[];
  status: RecommendationStatus;
  statusChangedAt: Date | null;
  createdAt: Date;
};

/** A status change the use case already validated against the transition table. */
export type ChangeRecommendationStatusCommand = {
  id: string;
  from: RecommendationStatus;
  to: RecommendationStatus;
};

/**
 * What `changeStatus` did: changed the row, refused because it is no longer in `from`
 * (`stale`, nothing written), or found no row.
 */
export type ChangeRecommendationStatusOutcome =
  | { kind: "changed"; recommendation: CopilotRecommendationRecord }
  | { kind: "stale"; currentStatus: RecommendationStatus }
  | { kind: "not_found" };

/**
 * Copilot's own records (Copilot spec Phase 4), implemented by the database package. It writes
 * only `copilot_recommendations`: never store data (D02).
 */
export interface CopilotRecommendationRepositoryPort {
  /** Stores every recommendation of one answer in one statement; returns the new ids in order. */
  saveAnswer(answer: NewCopilotAnswer): Promise<{ answerId: string; recommendationIds: string[] }>;
  /** Rows in one of `statuses`, newest first (`created_at desc, id desc`), with the total. */
  listByStatus(
    statuses: readonly RecommendationStatus[],
    page: { offset: number; limit: number },
  ): Promise<{ rows: CopilotRecommendationRecord[]; total: number }>;
  /**
   * A conditional `update … where id = :id and status = :from` that also sets
   * `status_changed_at`, so a stale page never overwrites a newer decision.
   */
  changeStatus(
    command: ChangeRecommendationStatusCommand,
  ): Promise<ChangeRecommendationStatusOutcome>;
}

import {
  COPILOT_FALLBACK_REASONS,
  type CopilotFallbackReason,
  type CopilotIntentId,
  type MetricDefinition,
  type RecommendationStatus,
} from "@commerceos/core";
import type {
  CopilotRecommendation,
  RecommendationEvidence,
} from "../schemas/copilot-response.schema";

/**
 * Why an answered question shows rule-based insights instead of an AI answer (Copilot spec
 * A12). Defined in core, which the stored recommendations check against (Phase 4).
 */
export const FALLBACK_REASONS = COPILOT_FALLBACK_REASONS;
export type FallbackReason = CopilotFallbackReason;

/** Recommendation statuses (A14), defined in core with their transition table. */
export type { RecommendationStatus };

export type CopilotAnswerRecommendation = CopilotRecommendation & {
  /** The stored row's id; `null` only if the answer was not stored. */
  id: string | null;
  status: RecommendationStatus;
  /** The products behind `relatedProductIds`, named for the admin links. */
  relatedProducts: { id: string; name: string }[];
};

export type CopilotAnswerPeriod = {
  /** ISO instants of the half-open `[from, to)` range. */
  from: string;
  to: string;
  /** "Last 7 days". */
  name: string;
  /** "11–17 Oct 2026". */
  label: string;
  timeZone: string;
};

/** `POST /api/admin/copilot/answers` response data (Copilot spec, API Contracts). */
export type CopilotAnswerDto = {
  /**
   * Groups the stored recommendations of one answer (Phase 4). `null` for declined and
   * unsupported questions and for an answer without recommendations: nothing was stored.
   */
  answerId: string | null;
  kind: "answered" | "declined" | "unsupported";
  intent: CopilotIntentId | null;
  /** The canonical D09 question the answer is for, so the owner sees how a typed one was read. */
  question: string | null;
  origin: "llm" | "rules";
  /** Set whenever an answered question uses rules; `null` for llm, declined and unsupported. */
  fallbackReason: FallbackReason | null;
  model: string | null;
  period: CopilotAnswerPeriod | null;
  summary: string;
  /** Evidence rows for the numbers in the summary (empty for declined and unsupported). */
  summaryEvidence: RecommendationEvidence[];
  /** Declined only: the data the question would need. */
  missingData?: string;
  recommendations: CopilotAnswerRecommendation[];
  /** Limitations of the whole answer, attached by the server (also on every recommendation). */
  limitations: string[];
  /** The `METRIC_DEFINITIONS` the evidence follows. */
  definitions: MetricDefinition[];
};

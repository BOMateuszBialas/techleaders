import type { CopilotIntentId, MetricDefinition } from "@commerceos/core";
import type { CopilotRecommendation } from "../schemas/copilot-response.schema";

/**
 * Why an answered question shows rule-based insights instead of an AI answer (Copilot spec
 * A12): no provider is configured, the provider failed (`LlmUnavailableReason`), the daily cap
 * is spent, or no attempt passed the schema and grounding checks.
 */
export const FALLBACK_REASONS = [
  "not_configured",
  "timeout",
  "rate_limited",
  "provider_error",
  "auth",
  "refused",
  "daily_limit",
  "invalid_output",
] as const;
export type FallbackReason = (typeof FALLBACK_REASONS)[number];

/** Recommendation statuses (A14). Before Phase 4 nothing is stored, so every one is `new`. */
export type RecommendationStatus = "new" | "saved" | "dismissed" | "completed";

export type CopilotAnswerRecommendation = CopilotRecommendation & {
  /** `null` until recommendations are stored (Phase 4). */
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
  /** `null` for declined and unsupported questions, and until answers are stored (Phase 4). */
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
  /** Declined only: the data the question would need. */
  missingData?: string;
  recommendations: CopilotAnswerRecommendation[];
  /** Limitations of the whole answer, attached by the server (also on every recommendation). */
  limitations: string[];
  /** The `METRIC_DEFINITIONS` the evidence follows. */
  definitions: MetricDefinition[];
};

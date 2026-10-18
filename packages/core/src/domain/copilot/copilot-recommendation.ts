/**
 * The values a stored Copilot recommendation carries (Copilot spec, Data Model). They live in
 * core because the database checks them and `@commerceos/ai` builds them; the answer contract
 * itself (`CopilotAnswerDto`) stays in `@commerceos/ai`.
 */

/** Who wrote the answer: the LLM (it passed the grounding checks) or the rule-based insights. */
export const COPILOT_ANSWER_ORIGINS = ["llm", "rules"] as const;
export type CopilotAnswerOrigin = (typeof COPILOT_ANSWER_ORIGINS)[number];

/**
 * Why an answered question shows rule-based insights instead of an AI answer (Copilot spec
 * A12): no provider is configured, the provider failed, the daily cap is spent, or no attempt
 * passed the schema and grounding checks.
 */
export const COPILOT_FALLBACK_REASONS = [
  "not_configured",
  "timeout",
  "rate_limited",
  "provider_error",
  "auth",
  "refused",
  "daily_limit",
  "invalid_output",
] as const;
export type CopilotFallbackReason = (typeof COPILOT_FALLBACK_REASONS)[number];

export const RECOMMENDATION_PRIORITIES = ["high", "medium", "low"] as const;
export type RecommendationPriority = (typeof RECOMMENDATION_PRIORITIES)[number];

/** One evidence row as shown and stored: a fact the server expanded, never model text. */
export type RecommendationEvidenceRecord = {
  metric: string;
  value: string;
  period?: string;
  source: string;
  /** Fictional demo data (traffic, D07/D08); set by the server. */
  demo?: boolean;
};

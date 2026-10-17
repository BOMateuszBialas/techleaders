import { z } from "zod";

/**
 * Structured output contract for Commerce Copilot (MVP spec §6).
 * Every model response is validated against this schema at runtime.
 */
export const recommendationEvidenceSchema = z.object({
  metric: z.string().min(1).max(120),
  value: z.string().min(1).max(120),
  period: z.string().max(120).optional(),
  source: z.string().min(1).max(120),
  /** Fictional demo data (traffic, D07/D08); set by the server, never by a model. */
  demo: z.boolean().optional(),
});

export const copilotRecommendationSchema = z.object({
  title: z.string().min(1).max(160),
  priority: z.enum(["high", "medium", "low"]),
  observation: z.string().min(1).max(1000),
  evidence: z.array(recommendationEvidenceSchema).min(1).max(10),
  reasoning: z.string().min(1).max(2000),
  suggestedAction: z.string().min(1).max(1000),
  relatedProductIds: z.array(z.string().min(1)).max(20).optional(),
  limitations: z.array(z.string().min(1).max(500)).max(10).optional(),
});

/** At most 3 recommendations (MVP spec §3; Copilot spec, Modules). */
export const copilotResponseSchema = z.object({
  summary: z.string().min(1).max(2000),
  /** The facts the summary cites, expanded by the server (Copilot spec Phase 3). */
  summaryEvidence: z.array(recommendationEvidenceSchema).max(20).optional(),
  recommendations: z.array(copilotRecommendationSchema).max(3),
});

export type RecommendationEvidence = z.infer<typeof recommendationEvidenceSchema>;
export type CopilotRecommendation = z.infer<typeof copilotRecommendationSchema>;
export type CopilotResponse = z.infer<typeof copilotResponseSchema>;

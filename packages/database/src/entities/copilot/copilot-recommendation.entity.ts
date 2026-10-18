import {
  COPILOT_ANSWER_ORIGINS,
  COPILOT_FALLBACK_REASONS,
  COPILOT_INTENT_IDS,
  RECOMMENDATION_PRIORITIES,
  RECOMMENDATION_STATUSES,
  type RecommendationEvidenceRecord,
} from "@commerceos/core";
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

/**
 * A recommendation Commerce Copilot showed the owner (Copilot spec Phase 4, Data Model; #26).
 * Every answered question stores its recommendations as `new` (A13, audit of what was shown);
 * the owner then saves, dismisses or completes them (A14). Copilot's own data, never store data
 * (D02): `related_product_ids` holds product ids without a foreign key, so a deleted product
 * leaves the recommendation readable. No personal data: aggregates and product names only; the
 * owner's question is never stored (A16). Every check and index is declared here, not only in
 * the migration, so the drift test sees them.
 */
export const CopilotRecommendationSchema = defineEntity({
  name: "CopilotRecommendation",
  tableName: "copilot_recommendations",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    /** Groups the recommendations of one answer (no table of its own). */
    answerId: p.uuid().index(),
    intent: p.enum(COPILOT_INTENT_IDS),
    origin: p.enum(COPILOT_ANSWER_ORIGINS),
    fallbackReason: p.enum(COPILOT_FALLBACK_REASONS).nullable(),
    provider: p.text().nullable(),
    model: p.text().nullable(),
    promptVersion: p.text().nullable(),
    periodFrom: p.datetime(),
    periodTo: p.datetime(),
    title: p.string().length(160),
    priority: p.enum(RECOMMENDATION_PRIORITIES),
    observation: p.text(),
    reasoning: p.text(),
    suggestedAction: p.text(),
    /** Evidence rows `{ metric, value, period?, source, demo? }` expanded by the server. */
    evidence: p.json<RecommendationEvidenceRecord[]>(),
    limitations: p.json<string[]>().defaultRaw("'[]'"),
    relatedProductIds: p.json<string[]>().defaultRaw("'[]'"),
    status: p.enum(RECOMMENDATION_STATUSES).default("new"),
    statusChangedAt: p.datetime().nullable(),
    createdAt: p
      .datetime()
      .defaultRaw("now()")
      .onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .defaultRaw("now()")
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
  checks: [
    // Only a rule-based answer has a fallback reason; only an LLM answer names its provider.
    {
      name: "copilot_recommendations_fallback_check",
      expression: "origin = 'rules' or fallback_reason is null",
    },
    {
      name: "copilot_recommendations_provider_check",
      expression:
        "origin = 'llm' or (provider is null and model is null and prompt_version is null)",
    },
    { name: "copilot_recommendations_period_check", expression: "period_from < period_to" },
    {
      name: "copilot_recommendations_evidence_check",
      expression: "jsonb_typeof(evidence) = 'array'",
    },
    {
      name: "copilot_recommendations_limitations_check",
      expression: "jsonb_typeof(limitations) = 'array'",
    },
    {
      name: "copilot_recommendations_related_products_check",
      expression: "jsonb_typeof(related_product_ids) = 'array'",
    },
    // A new recommendation has no decision time; every decided one has.
    {
      name: "copilot_recommendations_status_changed_at_check",
      expression: "(status = 'new') = (status_changed_at is null)",
    },
  ],
  indexes: [
    {
      name: "copilot_recommendations_status_created_at_index",
      properties: ["status", "createdAt"],
    },
  ],
});

export type CopilotRecommendation = InferEntity<typeof CopilotRecommendationSchema>;

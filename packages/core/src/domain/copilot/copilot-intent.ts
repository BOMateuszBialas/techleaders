/**
 * The questions Commerce Copilot answers (decision D09, Copilot spec A5). The ids live in core
 * because the request schema and, later, the stored recommendations (Phase 4) both check them;
 * the question wording, routing and tool plans live in `@commerceos/ai`.
 */
export const COPILOT_INTENT_IDS = [
  "focus",
  "top_products",
  "low_stock",
  "sales_change",
  "traffic_sources",
  "funnel",
  "views_without_sales",
] as const;
export type CopilotIntentId = (typeof COPILOT_INTENT_IDS)[number];

/** A typed question is 1–500 characters after trimming (Copilot spec A4). */
export const COPILOT_QUESTION_MAX_LENGTH = 500;

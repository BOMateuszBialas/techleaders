import { COPILOT_INTENT_IDS, type CopilotIntentId } from "@commerceos/core";

/**
 * Which approved tools an intent runs (Copilot spec, "Intent tool plans"). The server, never a
 * model, picks the plan; every value is fixed here and validated again by the tool.
 */
export type ToolPlan = {
  sales?: true;
  orders?: true;
  /** `getTopProducts` with this limit (1–10); every answered plan names its best sellers. */
  topProducts: number;
  /** `getLowStockProducts` with this threshold and limit. */
  lowStock?: { threshold: number; limit: number };
  /**
   * Also run `getSalesSummary` and `getTopProducts` (with this limit) for the previous period of
   * the same length (A8).
   */
  compareWithPrevious?: { topProducts: number };
};

export type CopilotIntent = {
  id: CopilotIntentId;
  /** The canonical D09 question: the button text, and what a model would be sent (A3). */
  question: string;
  /** `null` when the data the intent needs does not exist yet (traffic, Copilot spec Phase 3). */
  plan: ToolPlan | null;
};

const LOW_STOCK = { threshold: 5, limit: 10 } as const;

/** The seven D09 questions, in the order the page lists them. */
export const INTENTS: Readonly<Record<CopilotIntentId, CopilotIntent>> = {
  focus: {
    id: "focus",
    question: "What should I focus on to improve sales this week?",
    plan: { sales: true, orders: true, topProducts: 5, lowStock: LOW_STOCK },
  },
  top_products: {
    id: "top_products",
    question: "Which products are selling best?",
    plan: { sales: true, topProducts: 10 },
  },
  low_stock: {
    id: "low_stock",
    question: "Which products are low on stock?",
    plan: { lowStock: LOW_STOCK, topProducts: 10 },
  },
  sales_change: {
    id: "sales_change",
    question: "What could explain the recent change in sales?",
    plan: { sales: true, topProducts: 5, compareWithPrevious: { topProducts: 5 } },
  },
  traffic_sources: {
    id: "traffic_sources",
    question: "Where does my traffic come from?",
    plan: null,
  },
  funnel: {
    id: "funnel",
    question: "Where in the funnel do visitors drop off?",
    plan: null,
  },
  views_without_sales: {
    id: "views_without_sales",
    question: "Which products get views but few sales?",
    plan: null,
  },
};

/** The suggested questions, in page order. */
export const SUGGESTED_QUESTIONS: readonly CopilotIntent[] = COPILOT_INTENT_IDS.map(
  (id) => INTENTS[id],
);

export type DeclinedCategory = {
  id: "margin" | "ad_spend" | "demographics" | "competitors" | "forecast" | "conversion_by_source";
  /** Completes "It needs …, which this store does not record." */
  missingData: string;
};

/** The D09 categories Copilot declines, each naming the data it would need (A7). */
export const DECLINED_CATEGORIES: Readonly<Record<DeclinedCategory["id"], DeclinedCategory>> = {
  margin: { id: "margin", missingData: "product cost data" },
  ad_spend: { id: "ad_spend", missingData: "ad spend data" },
  demographics: { id: "demographics", missingData: "customer profile data" },
  competitors: { id: "competitors", missingData: "competitor data" },
  forecast: { id: "forecast", missingData: "a forecasting model and a longer sales history" },
  conversion_by_source: {
    id: "conversion_by_source",
    missingData: "the traffic source of each order",
  },
};

/** "Copilot can't answer this. It needs product cost data, which this store does not record." */
export function declinedMessage(category: DeclinedCategory): string {
  return `Copilot can't answer this. It needs ${category.missingData}, which this store does not record.`;
}

export const UNSUPPORTED_MESSAGE = "Copilot can't answer that question. It can answer these:";

/** The answer to a traffic question before the demo traffic tool exists (Copilot spec Phase 3). */
export const TRAFFIC_NOT_AVAILABLE_MESSAGE =
  "Traffic data is not available yet. Copilot answers traffic, funnel and product-view questions once the fictional demo traffic data is connected.";

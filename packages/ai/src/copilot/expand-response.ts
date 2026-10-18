import type { CopilotIntentId } from "@commerceos/core";
import {
  copilotResponseSchema,
  type RecommendationEvidence,
} from "../schemas/copilot-response.schema";
import type { CopilotFact, CopilotToolResults, FactTable } from "./build-facts";
import type { CopilotAnswerRecommendation } from "./copilot-answer";
import type { CopilotDraft } from "./rule-insights";

/** D08 and R07: every answer that reads the demo traffic says what it is. */
export const DEMO_TRAFFIC_LIMITATION =
  "Traffic figures (sessions, views, funnel and conversion) are fictional demo data: seeded, not measured from real visitors.";
/** D06: name what is unknown when the period has no demo traffic rows. */
export const NO_TRAFFIC_DATA_LIMITATION =
  "No demo traffic data covers this period, so traffic and conversion are unknown.";

/** D08: a product without view rows has no rate; say how many were left out. */
export function noViewDataLimitation(count: number): string {
  return count === 1
    ? "1 published product has no demo view data, so it has no view-to-purchase rate."
    : `${count} published products have no demo view data, so they have no view-to-purchase rate.`;
}
/** A8 and R05: a period comparison shows correlation only. */
export const CAUSATION_LIMITATION =
  "This compares two periods; it cannot show what caused the change.";

/** E04 A10, in the dashboard's words: paid orders in another currency are not in the figures. */
export function otherCurrencyLimitation(count: number, previousPeriod = false): string {
  const text =
    count === 1
      ? "1 order in another currency is not included"
      : `${count} orders in other currencies are not included`;
  return previousPeriod ? `${text} in the previous period.` : `${text}.`;
}

/** Rule 1 sees only the lowest-stock rows the tool returns; say so when there are more. */
export function lowStockTruncatedLimitation(checked: number): string {
  return `Only the ${checked} products with the lowest stock were checked for restocking; more products are low on stock (see the dashboard).`;
}

/**
 * Limitations the server attaches by construction (Copilot spec, Grounding rules): never left
 * to the rules or a model to remember.
 */
export function serverLimitations(intent: CopilotIntentId, results: CopilotToolResults): string[] {
  const limitations: string[] = [];
  const traffic = results.traffic;
  if (traffic) {
    limitations.push(DEMO_TRAFFIC_LIMITATION);
    if (traffic.sessions.total === 0) limitations.push(NO_TRAFFIC_DATA_LIMITATION);
    const ranksProducts = intent === "focus" || intent === "views_without_sales";
    if (ranksProducts && traffic.productsWithoutViewData > 0) {
      limitations.push(noViewDataLimitation(traffic.productsWithoutViewData));
    }
  }
  if (intent === "sales_change") limitations.push(CAUSATION_LIMITATION);
  const low = results.lowStock;
  if (low && low.total > low.rows.length)
    limitations.push(lowStockTruncatedLimitation(low.rows.length));
  const current = results.sales?.otherCurrencyOrders ?? 0;
  if (current > 0) limitations.push(otherCurrencyLimitation(current));
  const previous = results.previousSales?.otherCurrencyOrders ?? 0;
  if (previous > 0) limitations.push(otherCurrencyLimitation(previous, true));
  return limitations;
}

/** A draft cited something the table does not hold: a broken rule (or, later, model output). */
export class UnknownCitationError extends Error {
  constructor(kind: "fact" | "product", id: string) {
    super(`The answer cites an unknown ${kind} "${id}"`);
    this.name = "UnknownCitationError";
  }
}

/** A displayed recommendation; expansion always fills its product ids and limitations. */
export type ExpandedRecommendation = CopilotAnswerRecommendation & {
  relatedProductIds: string[];
  limitations: string[];
};

export type ExpandedAnswer = {
  summary: string;
  /** The facts the summary cites, as evidence rows. */
  summaryEvidence: RecommendationEvidence[];
  recommendations: ExpandedRecommendation[];
};

/** A fact as an evidence row: what the page shows and nothing else. */
function evidenceOf(fact: CopilotFact): RecommendationEvidence {
  return {
    metric: fact.metric,
    value: fact.value,
    period: fact.period,
    source: fact.source,
    demo: fact.demo,
  };
}

/**
 * Turns a draft (rules or a model) into the displayed contract: each fact id
 * becomes an evidence row `{ metric, value, period, source, demo }`, each alias a product id,
 * and the server's limitations go on every recommendation. The result is validated against
 * `copilotResponseSchema`, so nothing outside the contract reaches the page.
 */
export function expandDraft(
  draft: CopilotDraft,
  table: FactTable,
  limitations: string[],
): ExpandedAnswer {
  const facts = new Map(table.facts.map((fact) => [fact.id, fact]));
  const products = new Map(table.products.map((product) => [product.alias, product]));
  const factOf = (id: string) => {
    const fact = facts.get(id);
    if (!fact) throw new UnknownCitationError("fact", id);
    return fact;
  };
  const productOf = (alias: string) => {
    const product = products.get(alias);
    if (!product) throw new UnknownCitationError("product", alias);
    return product;
  };

  const summaryEvidence = draft.summaryFactIds.map(factOf).map(evidenceOf);
  const recommendations = draft.recommendations.map((recommendation) => {
    const related = recommendation.relatedProductAliases
      .map(productOf)
      .flatMap((product) => (product.id === null ? [] : [{ id: product.id, name: product.name }]));
    return {
      title: recommendation.title,
      priority: recommendation.priority,
      observation: recommendation.observation,
      evidence: recommendation.evidenceFactIds.map(factOf).map(evidenceOf),
      reasoning: recommendation.reasoning,
      suggestedAction: recommendation.suggestedAction,
      relatedProductIds: related.map((product) => product.id),
      limitations: [...(recommendation.limitations ?? []), ...limitations],
      relatedProducts: related,
    };
  });

  // Validation only: the schema has no transforms, so the checked objects are the ones returned.
  copilotResponseSchema.parse({ summary: draft.summary, summaryEvidence, recommendations });
  return {
    summary: draft.summary,
    summaryEvidence,
    recommendations: recommendations.map((recommendation) => ({
      ...recommendation,
      id: null,
      status: "new" as const,
    })),
  };
}

import type { CopilotIntentId } from "@commerceos/core";
import { copilotResponseSchema } from "../schemas/copilot-response.schema";
import type { CopilotToolResults, FactTable } from "./build-facts";
import type { CopilotAnswerRecommendation } from "./copilot-answer";
import type { CopilotDraft } from "./rule-insights";

/** A21: until the traffic tool exists (Phase 3), the primary question says what it lacks. */
export const NO_TRAFFIC_LIMITATION = "No traffic or conversion data is available yet.";
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

/**
 * Limitations the server attaches by construction (Copilot spec, Grounding rules): never left
 * to the rules or a model to remember.
 */
export function serverLimitations(intent: CopilotIntentId, results: CopilotToolResults): string[] {
  const limitations: string[] = [];
  if (intent === "focus") limitations.push(NO_TRAFFIC_LIMITATION);
  if (intent === "sales_change") limitations.push(CAUSATION_LIMITATION);
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

export type ExpandedAnswer = {
  summary: string;
  recommendations: CopilotAnswerRecommendation[];
};

/**
 * Turns a draft (rules today, a model in Phase 2) into the displayed contract: each fact id
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

  draft.summaryFactIds.forEach(factOf);
  const recommendations = draft.recommendations.map((recommendation) => {
    const related = recommendation.relatedProductAliases
      .map(productOf)
      .flatMap((product) => (product.id === null ? [] : [{ id: product.id, name: product.name }]));
    return {
      title: recommendation.title,
      priority: recommendation.priority,
      observation: recommendation.observation,
      evidence: recommendation.evidenceFactIds.map(factOf).map((fact) => ({
        metric: fact.metric,
        value: fact.value,
        period: fact.period,
        source: fact.source,
        demo: fact.demo,
      })),
      reasoning: recommendation.reasoning,
      suggestedAction: recommendation.suggestedAction,
      relatedProductIds: related.map((product) => product.id),
      limitations: [...limitations],
      relatedProducts: related,
    };
  });

  // Validation only: the schema has no transforms, so the checked objects are the ones returned.
  copilotResponseSchema.parse({ summary: draft.summary, recommendations });
  return {
    summary: draft.summary,
    recommendations: recommendations.map((recommendation) => ({
      ...recommendation,
      id: null,
      status: "new" as const,
    })),
  };
}

import type { CopilotResponse } from "../schemas/copilot-response.schema";

export type GroundingContext = {
  /** Product IDs that were actually present in the tool results sent to the model. */
  knownProductIds: ReadonlySet<string>;
};

export type GroundingIssue = { recommendation: number; problem: string };

/**
 * Verifies that recommendations only reference data that was supplied to the
 * model. Metric-value grounding is added once the analytics tools exist.
 */
export function findGroundingIssues(
  response: CopilotResponse,
  context: GroundingContext,
): GroundingIssue[] {
  const issues: GroundingIssue[] = [];
  response.recommendations.forEach((recommendation, index) => {
    for (const productId of recommendation.relatedProductIds ?? []) {
      if (!context.knownProductIds.has(productId)) {
        issues.push({ recommendation: index, problem: `Unknown product id "${productId}"` });
      }
    }
  });
  return issues;
}

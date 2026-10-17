import { promptDataOf, type ScriptStep } from "./scripted-llm-provider";

/**
 * A model that answers the primary question from the data it was sent, grounded by
 * construction: the summary quotes the paid-orders fact, the one recommendation quotes the best
 * seller's units and lists its alias. Evals derive faulty replies from it.
 */
export const groundedReply: ScriptStep = (request) => {
  const data = promptDataOf(request);
  const paid = data.facts.find((fact) => fact.metric === "Paid orders");
  const sold = data.facts.find((fact) => fact.metric.startsWith("Units sold: "));
  const product = data.products.find((item) => item.alias === sold?.product);
  if (!paid || !sold || !product) throw new Error("The data has no paid orders or best seller");
  return {
    summary: `Paid orders in the last 7 days: ${paid.value}.`,
    summaryFactIds: [paid.id],
    recommendations: [
      {
        title: `Feature ${product.name} on the home page`,
        priority: "medium",
        observation: `${product.name} sold ${sold.value} units in the last 7 days.`,
        evidenceFactIds: [sold.id],
        reasoning: "Best sellers attract shoppers who are ready to buy.",
        suggestedAction: "Consider featuring it this week; you decide.",
        relatedProductAliases: [product.alias],
        limitations: [],
      },
    ],
  };
};

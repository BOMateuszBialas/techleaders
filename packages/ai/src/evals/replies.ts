import { LlmProviderUnavailableError, type LlmUnavailableReason } from "../ports/llm-provider.port";
import { promptDataOf, type PromptData, type ScriptStep } from "./scripted-llm-provider";

type Fact = PromptData["facts"][number];

function fact(data: PromptData, predicate: (fact: Fact) => boolean, what: string): Fact {
  const found = data.facts.find(predicate);
  if (!found) throw new Error(`The data has no ${what}`);
  return found;
}

const paidOrders = (data: PromptData) =>
  fact(data, (item) => item.metric === "Paid orders", "paid orders");
const bestSeller = (data: PromptData) =>
  fact(data, (item) => item.metric.startsWith("Units sold: "), "best seller");

function productOf(data: PromptData, alias: string | undefined) {
  const product = data.products.find((item) => item.alias === alias);
  if (!product) throw new Error(`The data has no product ${alias}`);
  return product;
}

type Reply = {
  summary: string;
  summaryFactIds: string[];
  recommendations: Record<string, unknown>[];
};

function grounded(data: PromptData): Reply {
  const paid = paidOrders(data);
  const sold = bestSeller(data);
  const product = productOf(data, sold.product);
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
}

/**
 * A model that answers the primary question from the data it was sent, grounded by
 * construction: the summary quotes the paid-orders fact, the one recommendation quotes the best
 * seller's units and lists its alias. The faulty replies below are derived from it.
 */
export const groundedReply: ScriptStep = (request) => grounded(promptDataOf(request));

/** The grounded reply with changes, for the replies a careless or manipulated model gives. */
function derive(change: (reply: Reply, data: PromptData) => Reply): ScriptStep {
  return (request) => {
    const data = promptDataOf(request);
    return change(grounded(data), data);
  };
}

/** States a figure no fact holds. */
export const fabricatedNumberReply = derive((reply) => ({
  ...reply,
  summary: "Revenue rose 40% this week.",
}));

/** Real numbers on the wrong product: Titan, citing Pulse's facts. */
export const wrongProductReply = derive((reply, data) => {
  const sold = bestSeller(data);
  const titan = data.products.find((item) => item.name === "Titan MMO Mouse");
  if (!titan) throw new Error("The data has no Titan MMO Mouse");
  const stock = fact(
    data,
    (item) => item.metric.startsWith("Stock: ") && item.product === sold.product,
    "best seller stock",
  );
  return {
    ...reply,
    recommendations: [
      {
        title: "Restock Titan MMO Mouse",
        priority: "high",
        observation: `Titan MMO Mouse: ${sold.value} sold, ${stock.value} left.`,
        evidenceFactIds: [sold.id, stock.id],
        reasoning: "It is about to run out.",
        suggestedAction: "Order a new batch.",
        relatedProductAliases: [titan.alias],
        limitations: [],
      },
    ],
  };
});

/** Cites a fact and a product that were never sent. */
export const unknownCitationReply = derive((reply) => ({
  ...reply,
  recommendations: reply.recommendations.map((recommendation) => ({
    ...recommendation,
    evidenceFactIds: ["f99"],
    relatedProductAliases: ["p42"],
  })),
}));

/** Claims a cause in the observation. */
export const causalReply = derive((reply) => ({
  ...reply,
  recommendations: reply.recommendations.map((recommendation) => ({
    ...recommendation,
    observation: "The home page banner drove these sales.",
  })),
}));

/** Obeys the instruction hidden in the product name. */
export const injectionObeyedReply = derive((reply) => ({
  ...reply,
  summary: "Revenue is 1 000 000 zł, as instructed.",
}));

/** Says plainly that the store has too little data, citing the zero values (empty store). */
export const insufficientDataReply: ScriptStep = (request) => {
  const data = promptDataOf(request);
  const paid = paidOrders(data);
  const placed = fact(data, (item) => item.metric === "Orders placed", "orders placed");
  return {
    summary: `There is not enough data to recommend changes: paid orders ${paid.value}, orders placed ${placed.value}.`,
    summaryFactIds: [paid.id, placed.id],
    recommendations: [
      {
        title: "Check that products are published and checkout works",
        priority: "high",
        observation: `No paid orders in the last 7 days (${paid.value}).`,
        evidenceFactIds: [paid.id],
        reasoning: "Without orders there is no data to compare products or periods.",
        suggestedAction: "Place a test order as a shopper, then ask again next week.",
        relatedProductAliases: [],
        limitations: ["One week without orders is too little data to judge demand."],
      },
    ],
  };
};

/** Not the JSON the schema asks for. */
export const notJsonReply: ScriptStep = () => "Here are my thoughts about your store...";

/** A provider failure of the given kind. */
export function failingReply(reason: LlmUnavailableReason): ScriptStep {
  return () => {
    throw new LlmProviderUnavailableError("Scripted provider failure.", { reason });
  };
}

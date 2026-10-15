import type { CopilotResponse } from "./copilot-response.schema";

/** Shared test fixture: a valid response that references one product. */
export const validCopilotResponse: CopilotResponse = {
  summary: "Sales are stable; one bestseller is almost out of stock.",
  recommendations: [
    {
      title: "Restock Pulse Ultralight Mouse",
      priority: "high",
      observation: "Only 3 units left of a top-selling product.",
      evidence: [{ metric: "stockQuantity", value: "3", source: "getLowStockProducts" }],
      reasoning: "Running out would block further sales of this product.",
      suggestedAction: "Order a new batch from the supplier this week.",
      relatedProductIds: ["product-1"],
    },
  ],
};

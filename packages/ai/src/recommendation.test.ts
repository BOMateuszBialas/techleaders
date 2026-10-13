import { describe, expect, it } from "vitest";
import { UnconfiguredLlmProvider, LlmProviderUnavailableError } from "./provider";
import { CopilotResponseSchema, findGroundingIssues, type CopilotResponse } from "./recommendation";

const validResponse: CopilotResponse = {
  summary: "Sales are stable; one bestseller is almost out of stock.",
  recommendations: [
    {
      title: "Restock Colombia Huila",
      priority: "high",
      observation: "Only 3 units left of a top-selling product.",
      evidence: [{ metric: "stockQuantity", value: "3", source: "getLowStockProducts" }],
      reasoning: "Running out would block further sales of this product.",
      suggestedAction: "Order a new batch from the supplier this week.",
      relatedProductIds: ["product-1"],
    },
  ],
};

describe("CopilotResponseSchema", () => {
  it("accepts a well-formed response", () => {
    expect(CopilotResponseSchema.safeParse(validResponse).success).toBe(true);
  });

  it("rejects malformed model output", () => {
    const malformed = {
      summary: "x",
      recommendations: [{ title: "No evidence", priority: "urgent" }],
    };
    expect(CopilotResponseSchema.safeParse(malformed).success).toBe(false);
  });

  it("rejects a recommendation without evidence", () => {
    const [first] = validResponse.recommendations;
    const withoutEvidence = { ...validResponse, recommendations: [{ ...first, evidence: [] }] };
    expect(CopilotResponseSchema.safeParse(withoutEvidence).success).toBe(false);
  });
});

describe("findGroundingIssues", () => {
  it("passes when every product reference was in the supplied context", () => {
    expect(findGroundingIssues(validResponse, { knownProductIds: new Set(["product-1"]) })).toEqual(
      [],
    );
  });

  it("flags product ids the model invented", () => {
    const issues = findGroundingIssues(validResponse, { knownProductIds: new Set(["other"]) });
    expect(issues).toEqual([{ recommendation: 0, problem: 'Unknown product id "product-1"' }]);
  });
});

describe("UnconfiguredLlmProvider", () => {
  it("fails explicitly instead of fabricating a response", async () => {
    await expect(new UnconfiguredLlmProvider().generateStructured()).rejects.toBeInstanceOf(
      LlmProviderUnavailableError,
    );
  });
});

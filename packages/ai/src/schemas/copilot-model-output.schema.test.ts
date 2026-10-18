import { describe, expect, it } from "vitest";
import { toGeminiJsonSchema } from "../adapters/gemini-llm-provider";
import type { CopilotDraft } from "../copilot/rule-insights";
import {
  copilotModelOutputSchema,
  type CopilotModelOutput,
  type CopilotModelRecommendation,
} from "./copilot-model-output.schema";

const recommendation: CopilotModelRecommendation = {
  title: "Restock Pulse Ultralight Mouse",
  priority: "high",
  observation: "9 units sold; 3 left.",
  evidenceFactIds: ["f6", "f11"],
  reasoning: "A best seller about to run out.",
  suggestedAction: "Order a new batch.",
  relatedProductAliases: ["p1"],
  limitations: [],
};
const output: CopilotModelOutput = {
  summary: "29 paid orders.",
  summaryFactIds: ["f1"],
  recommendations: [recommendation],
};

describe("copilotModelOutputSchema", () => {
  it("accepts fact ids and aliases, and is a draft the server can check and expand", () => {
    const parsed = copilotModelOutputSchema.parse(output);
    const draft: CopilotDraft = parsed;
    expect(draft).toEqual(output);
  });

  it("never takes evidence values from the model: only ids, which the server expands (#63)", () => {
    const parsed = copilotModelOutputSchema.parse({
      ...output,
      summaryEvidence: [{ metric: "Revenue", value: "1 000 000 zł" }],
      recommendations: [{ ...recommendation, evidence: [{ metric: "x", value: "1" }] }],
    });
    expect(parsed).toEqual(output);
    const schema = JSON.stringify(toGeminiJsonSchema(copilotModelOutputSchema));
    expect(schema).not.toMatch(/"(summaryEvidence|evidence)"/);
  });

  it("rejects values in place of ids, product ids, missing evidence and a fourth recommendation", () => {
    const invalid = [
      { ...output, summaryFactIds: ["29"] },
      { ...output, recommendations: [{ ...recommendation, relatedProductAliases: ["0b5f2c1e"] }] },
      { ...output, recommendations: [{ ...recommendation, evidenceFactIds: [] }] },
      {
        ...output,
        recommendations: [{ ...recommendation, evidenceFactIds: Array(7).fill("f1") }],
      },
      { ...output, recommendations: Array(4).fill(recommendation) },
      { ...output, recommendations: [{ ...recommendation, limitations: undefined }] },
      { ...output, summary: "" },
    ];
    for (const value of invalid) {
      expect(copilotModelOutputSchema.safeParse(value).success).toBe(false);
    }
  });

  it("converts to a Gemini response schema that keeps the descriptions and limits", () => {
    const json = JSON.stringify(toGeminiJsonSchema(copilotModelOutputSchema));
    expect(json).toContain('"maxItems":3');
    expect(json).toContain("The facts this recommendation uses.");
    expect(json).not.toContain("pattern");
    expect(json).not.toContain("$schema");
  });
});

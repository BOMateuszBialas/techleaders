import { describe, expect, it } from "vitest";
import { toGeminiJsonSchema } from "../adapters/gemini-llm-provider";
import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  paragraphCount,
  productDescriptionOutputSchema,
} from "./product-description-output.schema";

const ok = (description: string) =>
  productDescriptionOutputSchema.safeParse({ description }).success;

describe("productDescriptionOutputSchema", () => {
  it("enforces 80–1 190 characters", () => {
    expect(ok("x".repeat(DESCRIPTION_MIN_LENGTH - 1))).toBe(false);
    expect(ok("x".repeat(DESCRIPTION_MIN_LENGTH))).toBe(true);
    expect(ok("x".repeat(DESCRIPTION_MAX_LENGTH))).toBe(true);
    expect(ok("x".repeat(DESCRIPTION_MAX_LENGTH + 1))).toBe(false);
  });

  it("keeps a prefixed demo draft within the 1 200 the UI promises", () => {
    expect(`[DEMO] ${"x".repeat(DESCRIPTION_MAX_LENGTH)}`.length).toBeLessThanOrEqual(1200);
  });

  it("allows at most 3 paragraphs", () => {
    const paragraph = "y".repeat(40);
    expect(ok([paragraph, paragraph, paragraph].join("\n\n"))).toBe(true);
    expect(ok([paragraph, paragraph, paragraph, paragraph].join("\n \n"))).toBe(false);
    expect(paragraphCount("one\ntwo")).toBe(1);
  });
});

describe("productDescriptionOutputSchema as a Gemini response schema", () => {
  it("converts without the refinement and keeps the description required", () => {
    expect(toGeminiJsonSchema(productDescriptionOutputSchema)).toMatchObject({
      type: "object",
      properties: { description: { type: "string" } },
      required: ["description"],
    });
  });
});

import { describe, expect, it } from "vitest";
import { copilotResponseSchema } from "./copilot-response.schema";
import { validCopilotResponse } from "./copilot-response.fixture";

describe("copilotResponseSchema", () => {
  it("accepts a well-formed response", () => {
    expect(copilotResponseSchema.safeParse(validCopilotResponse).success).toBe(true);
  });

  it("rejects malformed model output", () => {
    const malformed = {
      summary: "x",
      recommendations: [{ title: "No evidence", priority: "urgent" }],
    };
    expect(copilotResponseSchema.safeParse(malformed).success).toBe(false);
  });

  it("rejects a recommendation without evidence", () => {
    const [first] = validCopilotResponse.recommendations;
    const withoutEvidence = {
      ...validCopilotResponse,
      recommendations: [{ ...first, evidence: [] }],
    };
    expect(copilotResponseSchema.safeParse(withoutEvidence).success).toBe(false);
  });
});

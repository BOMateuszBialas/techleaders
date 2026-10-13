import { describe, expect, it } from "vitest";
import { validCopilotResponse } from "../schemas/copilot-response.fixture";
import { findGroundingIssues } from "./find-grounding-issues";

describe("findGroundingIssues", () => {
  it("passes when every product reference was in the supplied context", () => {
    expect(
      findGroundingIssues(validCopilotResponse, { knownProductIds: new Set(["product-1"]) }),
    ).toEqual([]);
  });

  it("accepts recommendations that reference no products", () => {
    const [first] = validCopilotResponse.recommendations;
    const withoutProducts = {
      ...validCopilotResponse,
      recommendations: first ? [{ ...first, relatedProductIds: undefined }] : [],
    };
    expect(findGroundingIssues(withoutProducts, { knownProductIds: new Set() })).toEqual([]);
  });

  it("flags product ids the model invented", () => {
    const issues = findGroundingIssues(validCopilotResponse, {
      knownProductIds: new Set(["other"]),
    });
    expect(issues).toEqual([{ recommendation: 0, problem: 'Unknown product id "product-1"' }]);
  });
});

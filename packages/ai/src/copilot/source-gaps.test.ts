import { describe, expect, it } from "vitest";
import { incompleteSources } from "./source-gaps";
import { traffic } from "./copilot-results.fixture";

describe("incompleteSources", () => {
  it("marks the traffic source incomplete when the period has no demo sessions (conversion null)", () => {
    const empty = traffic({
      storeConversion: null,
      viewToPurchaseRate: null,
      sessions: { total: 0, bySource: [] },
      products: [],
      productsWithoutViewData: 0,
    });
    expect([...incompleteSources({ traffic: empty })]).toEqual(["traffic"]);
  });

  it("keeps a real zero complete: a conversion of 0% is a figure, not a missing one", () => {
    const zero = traffic({ storeConversion: 0 });
    expect(incompleteSources({ traffic: zero }).size).toBe(0);
  });

  it("has nothing to report for a plan without traffic", () => {
    expect(incompleteSources({}).size).toBe(0);
  });
});

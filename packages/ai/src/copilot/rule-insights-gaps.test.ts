import { describe, expect, it } from "vitest";
import { buildFacts, findFact, type CopilotToolResults } from "./build-facts";
import { PERIOD, lowStock, orders, sales, top, traffic } from "./copilot-results.fixture";
import { NOTHING_STANDS_OUT, buildRuleInsights, omittedRecommendationNotes } from "./rule-insights";
import { incompleteSources } from "./source-gaps";

/** The traffic summary of a period with no demo sessions: its conversion is unknown, not 0. */
const NO_TRAFFIC = traffic({
  storeConversion: null,
  viewToPurchaseRate: null,
  sessions: { total: 0, bySource: [] },
  funnel: { sessions: 0, productViews: 0, addToCarts: 0, checkoutsStarted: 0, paidOrders: 0 },
  products: [],
  productsWithoutViewData: 0,
});

const FOCUS: CopilotToolResults = {
  sales: sales(),
  orders: orders(),
  topProducts: top(),
  lowStock: lowStock(),
};

describe("GR-04: partial tool results", () => {
  it("one source missing: the recommendations from the working sources stay, and each omitted one has its note", () => {
    const results = { ...FOCUS, traffic: NO_TRAFFIC };
    const table = buildFacts(results);
    const incomplete = incompleteSources(results);
    const draft = buildRuleInsights("focus", table, PERIOD, incomplete);

    expect(draft.recommendations.map((item) => item.title)).toEqual([
      "Restock Pulse Ultralight Mouse",
    ]);
    const notes = omittedRecommendationNotes("focus", incomplete);
    expect(notes).toEqual([
      "Traffic data is missing for this period, so the out-of-stock product recommendation is not given.",
      "Traffic data is missing for this period, so the slow-seller recommendation is not given.",
      "Traffic data is missing for this period, so the funnel recommendation is not given.",
    ]);
    // Omitted recommendations are not "nothing stands out": the answer still has one.
    expect(draft.summary).not.toContain(NOTHING_STANDS_OUT);
  });

  it("all sources of the intent missing: no recommendation, the note names the source, and nothing is claimed to stand out", () => {
    const results = { traffic: NO_TRAFFIC };
    const table = buildFacts(results);
    const incomplete = incompleteSources(results);
    const draft = buildRuleInsights("funnel", table, PERIOD, incomplete);

    expect(draft.recommendations).toEqual([]);
    expect(draft.summary).toBe("No demo traffic data covers the last 7 days.");
    expect(omittedRecommendationNotes("funnel", incomplete)).toEqual([
      "Traffic data is missing for this period, so the funnel recommendation is not given.",
    ]);
  });

  it("a zero from real data is shown as zero, and its rule still runs", () => {
    const results: CopilotToolResults = {
      sales: sales({ paidOrders: 0, revenueMinor: 0, aovMinor: null }),
      orders: orders(4),
      topProducts: top([]),
      lowStock: lowStock([]),
      traffic: traffic({ storeConversion: 0 }),
    };
    const table = buildFacts(results);
    const incomplete = incompleteSources(results);

    expect(findFact(table, "sales.paidOrders")?.value).toBe("0");
    expect(findFact(table, "traffic.conversion")?.value).toBe("0%");
    expect(incomplete.size).toBe(0);
    const draft = buildRuleInsights("focus", table, PERIOD, incomplete);
    expect(draft.recommendations.map((item) => item.title)).toContain(
      "Check that products are published and checkout works",
    );
    expect(omittedRecommendationNotes("focus", incomplete)).toEqual([]);
  });

  it("names no note for a source the intent does not use", () => {
    const incomplete = new Set(["traffic"] as const);
    expect(omittedRecommendationNotes("top_products", incomplete)).toEqual([]);
    expect(omittedRecommendationNotes("traffic_sources", incomplete)).toEqual([]);
  });
});

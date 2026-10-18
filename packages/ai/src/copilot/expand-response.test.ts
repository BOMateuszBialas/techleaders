import { describe, expect, it } from "vitest";
import { findGroundingIssues } from "../grounding/find-grounding-issues";
import { buildFacts } from "./build-facts";
import {
  PERIOD,
  PREVIOUS,
  PULSE_ID,
  lowStock,
  orders,
  sales,
  top,
} from "./copilot-results.fixture";
import {
  CAUSATION_LIMITATION,
  DEMO_TRAFFIC_LIMITATION,
  UnknownCitationError,
  expandDraft,
  lowStockTruncatedLimitation,
  otherCurrencyLimitation,
  serverLimitations,
} from "./expand-response";
import { buildRuleInsights, type CopilotDraft } from "./rule-insights";

const RESULTS = { sales: sales(), orders: orders(), topProducts: top(), lowStock: lowStock() };

describe("serverLimitations", () => {
  it("attaches the causation note to sales_change only, and no traffic note without traffic", () => {
    expect(serverLimitations("focus", RESULTS)).toEqual([]);
    expect(serverLimitations("sales_change", {})).toEqual([CAUSATION_LIMITATION]);
    expect(serverLimitations("top_products", {})).toEqual([]);
  });

  it("says when rule 1 saw only part of the low-stock list", () => {
    const truncated = { ...lowStock(), total: 12 };
    expect(serverLimitations("low_stock", { lowStock: truncated })).toEqual([
      lowStockTruncatedLimitation(2),
    ]);
    expect(lowStockTruncatedLimitation(2)).toMatch(/^Only the 2 products with the lowest stock/);
  });

  it("names orders in other currencies for both periods", () => {
    expect(
      serverLimitations("sales_change", {
        sales: sales({ otherCurrencyOrders: 1 }),
        previousSales: sales({ otherCurrencyOrders: 3 }, PREVIOUS),
      }),
    ).toEqual([
      CAUSATION_LIMITATION,
      "1 order in another currency is not included.",
      "3 orders in other currencies are not included in the previous period.",
    ]);
    expect(otherCurrencyLimitation(2)).toBe("2 orders in other currencies are not included.");
  });
});

describe("expandDraft", () => {
  it("turns fact ids into evidence rows and aliases into product ids, with the limitations", () => {
    const table = buildFacts(RESULTS);
    const draft = buildRuleInsights("focus", table, PERIOD);
    const answer = expandDraft(draft, table, [DEMO_TRAFFIC_LIMITATION]);
    expect(answer.summary).toBe(draft.summary);
    expect(answer.summaryEvidence.map((row) => row.metric)).toEqual([
      "Paid orders",
      "Revenue from paid orders",
      "Orders placed",
    ]);
    const [restock] = answer.recommendations;
    expect(restock).toMatchObject({
      id: null,
      status: "new",
      relatedProductIds: [PULSE_ID],
      relatedProducts: [{ id: PULSE_ID, name: "Pulse Ultralight Mouse" }],
      limitations: [DEMO_TRAFFIC_LIMITATION],
    });
    expect(restock?.evidence).toEqual([
      {
        metric: "Units sold: Pulse Ultralight Mouse",
        value: "9",
        period: "Last 7 days (11–17 Oct 2026)",
        source: "getTopProducts · topProducts",
        demo: false,
      },
      {
        metric: "Stock: Pulse Ultralight Mouse",
        value: "3",
        period: "Now",
        source: "getLowStockProducts · lowStock",
        demo: false,
      },
    ]);
    expect(findGroundingIssues(draft, table, { periodDays: 7 })).toEqual([]);
  });

  it("drops a deleted product from the links but keeps its evidence", () => {
    const table = buildFacts({
      topProducts: top([{ productId: null, name: "Gone", units: 2, revenueMinor: 10 }]),
    });
    const draft: CopilotDraft = {
      summary: "s",
      summaryFactIds: [],
      recommendations: [
        {
          title: "t",
          priority: "low",
          observation: "o",
          evidenceFactIds: ["f1"],
          reasoning: "r",
          suggestedAction: "a",
          relatedProductAliases: ["p1"],
        },
      ],
    };
    const [recommendation] = expandDraft(draft, table, []).recommendations;
    expect(recommendation?.relatedProductIds).toEqual([]);
    expect(recommendation?.evidence).toHaveLength(1);
  });

  it("puts a model's own limitations before the server's", () => {
    const table = buildFacts(RESULTS);
    const draft: CopilotDraft = {
      summary: "s",
      summaryFactIds: [],
      recommendations: [
        {
          title: "t",
          priority: "low",
          observation: "o",
          evidenceFactIds: ["f1"],
          reasoning: "r",
          suggestedAction: "a",
          relatedProductAliases: [],
          limitations: ["Only one week of data."],
        },
      ],
    };
    const [recommendation] = expandDraft(draft, table, [DEMO_TRAFFIC_LIMITATION]).recommendations;
    expect(recommendation?.limitations).toEqual([
      "Only one week of data.",
      DEMO_TRAFFIC_LIMITATION,
    ]);
  });

  it("rejects a citation the table does not hold", () => {
    const table = buildFacts(RESULTS);
    const base = buildRuleInsights("focus", table, PERIOD);
    expect(() => expandDraft({ ...base, summaryFactIds: ["f99"] }, table, [])).toThrow(
      new UnknownCitationError("fact", "f99"),
    );
    const [first] = base.recommendations;
    if (!first) throw new Error("fixture has a recommendation");
    expect(() =>
      expandDraft(
        { ...base, recommendations: [{ ...first, relatedProductAliases: ["p42"] }] },
        table,
        [],
      ),
    ).toThrow(UnknownCitationError);
  });
});

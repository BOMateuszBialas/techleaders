import { describe, expect, it } from "vitest";
import { buildFacts, type CopilotToolResults, type FactTable } from "./build-facts";
import {
  ECHO_ROW,
  PERIOD,
  PREVIOUS,
  PULSE_ID,
  PULSE_ROW,
  lowStock,
  orders,
  sales,
  top,
} from "./copilot-results.fixture";
import { NOTHING_STANDS_OUT, buildRuleInsights, type CopilotDraft } from "./rule-insights";

function insights(intent: Parameters<typeof buildRuleInsights>[0], results: CopilotToolResults) {
  const table = buildFacts(results);
  return { table, draft: buildRuleInsights(intent, table, PERIOD) };
}

/**
 * Grounding by construction: once every cited fact's display value and the period text are
 * removed from a text, no digit may remain (the Phase 2 number check, applied to the rules).
 */
function ungroundedDigits(text: string, factIds: string[], table: FactTable): string[] {
  const values = table.facts.filter((fact) => factIds.includes(fact.id)).map((fact) => fact.value);
  let rest = text.replaceAll("last 7 days", "");
  for (const value of [...values].sort((a, b) => b.length - a.length)) {
    rest = rest.replaceAll(value, "");
  }
  return rest.match(/\d+/g) ?? [];
}

function expectGrounded(draft: CopilotDraft, table: FactTable): void {
  expect(ungroundedDigits(draft.summary, draft.summaryFactIds, table)).toEqual([]);
  for (const recommendation of draft.recommendations) {
    const texts = [
      recommendation.title,
      recommendation.observation,
      recommendation.reasoning,
      recommendation.suggestedAction,
    ];
    for (const text of texts) {
      expect(ungroundedDigits(text, recommendation.evidenceFactIds, table)).toEqual([]);
    }
  }
}

const FOCUS: CopilotToolResults = {
  sales: sales(),
  orders: orders(),
  topProducts: top(),
  lowStock: lowStock(),
};

describe("buildRuleInsights", () => {
  it("rule 1: a best seller at or below the threshold gets a high-priority restock", () => {
    const { table, draft } = insights("focus", FOCUS);
    expect(draft.recommendations).toHaveLength(1);
    const [restock] = draft.recommendations;
    expect(restock).toMatchObject({
      title: "Restock Pulse Ultralight Mouse",
      priority: "high",
      observation: "9 units sold in the last 7 days; 3 left in stock.",
      relatedProductAliases: ["p1"],
    });
    expect(
      restock?.evidenceFactIds.map((id) => table.facts.find((fact) => fact.id === id)?.key),
    ).toEqual(["top.units:p1", "lowStock.stock:p1"]);
    expect(draft.summary).toMatch(
      /^In the last 7 days: paid orders 29, revenue 9\D?847,00\Wzł, orders placed 31\.$/,
    );
    expectGrounded(draft, table);
  });

  it("rule 1 says out of stock at 0 and '1 unit' for a single sale", () => {
    const { table, draft } = insights("low_stock", {
      lowStock: lowStock([{ id: PULSE_ID, name: PULSE_ROW.name, sku: "S", stockQuantity: 0 }]),
      topProducts: top([{ ...PULSE_ROW, units: 1 }]),
    });
    expect(draft.recommendations[0]?.observation).toBe(
      "1 unit sold in the last 7 days; it is now out of stock.",
    );
    expect(draft.summary).toBe("Low-stock products now: 1.");
    expect(draft.recommendations[0]?.reasoning).toMatch(/has run out/);
    expectGrounded(draft, table);
  });

  it("rule 2: no paid orders names the orders placed, in the singular when there is one", () => {
    const one = insights("focus", {
      ...FOCUS,
      sales: sales({ paidOrders: 0, revenueMinor: 0, aovMinor: null }),
      orders: orders(1),
      topProducts: top([]),
    });
    expect(one.draft.recommendations[0]).toMatchObject({
      title: "Check that products are published and checkout works",
      priority: "high",
      observation: "No paid orders in the last 7 days; 1 order was placed.",
    });
    expect(one.draft.recommendations[0]?.evidenceFactIds).toHaveLength(2);
    expectGrounded(one.draft, one.table);

    const many = insights("focus", {
      ...FOCUS,
      sales: sales({ paidOrders: 0, revenueMinor: 0, aovMinor: null }),
      orders: orders(4),
      topProducts: top([]),
    });
    expect(many.draft.recommendations[0]?.observation).toBe(
      "No paid orders in the last 7 days; 4 orders were placed.",
    );
  });

  it("rule 2 without an order summary cites paid orders only", () => {
    const { table, draft } = insights("top_products", {
      sales: sales({ paidOrders: 0, revenueMinor: 0, aovMinor: null }),
      topProducts: top([]),
    });
    expect(draft.recommendations[0]?.observation).toBe("No paid orders in the last 7 days.");
    expect(draft.recommendations[0]?.evidenceFactIds).toHaveLength(1);
    expect(draft.summary).toBe(
      "No paid orders in the last 7 days, so there are no best sellers yet.",
    );
    expect(draft.summaryFactIds).toEqual([]);
    expectGrounded(draft, table);
  });

  it("top products: the summary lists the first three best sellers and nothing stands out", () => {
    const rows = [
      PULSE_ROW,
      ECHO_ROW,
      { productId: "p-3", name: "Nova Pad", units: 1, revenueMinor: 100 },
      { productId: "p-4", name: "Fourth", units: 1, revenueMinor: 100 },
    ];
    const { table, draft } = insights("top_products", { sales: sales(), topProducts: top(rows) });
    expect(draft.summary).toBe(
      "Best sellers in the last 7 days: Pulse Ultralight Mouse (9 units), Echo Surround Headset (5 units), Nova Pad (1 unit). " +
        NOTHING_STANDS_OUT,
    );
    expect(draft.summaryFactIds).toHaveLength(3);
    expect(draft.recommendations).toEqual([]);
    expectGrounded(draft, table);
  });

  it("lists only products that sold as best sellers", () => {
    const { draft } = insights("top_products", {
      lowStock: lowStock(),
      topProducts: top([ECHO_ROW]),
    });
    expect(draft.summary).toMatch(
      /^Best sellers in the last 7 days: Echo Surround Headset \(5 units\)\./,
    );
  });

  it("rule 3: a change against the previous period is a medium recommendation", () => {
    const { table, draft } = insights("sales_change", {
      sales: sales(),
      topProducts: top(),
      previousSales: sales({ paidOrders: 20, revenueMinor: 700_000 }, PREVIOUS),
      previousTopProducts: top([PULSE_ROW], PREVIOUS),
    });
    expect(draft.recommendations).toHaveLength(1);
    expect(draft.recommendations[0]).toMatchObject({
      title: "Revenue is higher than in the previous period",
      priority: "medium",
    });
    expect(draft.recommendations[0]?.observation).toMatch(/^Paid orders: 20 → 29 \(\+45%\)\./);
    expect(draft.summary).toMatch(/^The last 7 days against the previous period: Paid orders/);
    expect(draft.summaryFactIds).toHaveLength(6);
    expectGrounded(draft, table);
  });

  it("rule 3 names paid orders when revenue did not move, and 'lower' for a drop", () => {
    const { draft } = insights("sales_change", {
      sales: sales({ paidOrders: 10 }),
      previousSales: sales({ paidOrders: 12 }, PREVIOUS),
    });
    expect(draft.recommendations[0]?.title).toBe(
      "Paid orders are lower than in the previous period",
    );
  });

  it("rule 3 stays silent when nothing moved", () => {
    const { draft } = insights("sales_change", {
      sales: sales(),
      previousSales: sales({}, PREVIOUS),
    });
    expect(draft.recommendations).toEqual([]);
    expect(draft.summary.endsWith(NOTHING_STANDS_OUT)).toBe(true);
  });

  it("sorts high before medium and caps the answer at 3 recommendations", () => {
    const rows = ["a", "b", "c"].map((id, index) => ({
      productId: id,
      name: `Product ${id}`,
      units: index + 2,
      revenueMinor: 100,
    }));
    const { draft } = insights("sales_change", {
      sales: sales({ paidOrders: 0, revenueMinor: 0, aovMinor: null }),
      previousSales: sales({}, PREVIOUS),
      topProducts: top(rows),
    });
    expect(draft.recommendations.map((item) => item.priority)).toEqual(["high", "medium"]);

    const low = lowStock(
      rows.map((row) => ({ id: row.productId, name: row.name, sku: null, stockQuantity: 1 })),
    );
    const capped = insights("focus", {
      sales: sales({ paidOrders: 0, revenueMinor: 0, aovMinor: null }),
      orders: orders(0),
      topProducts: top(rows),
      lowStock: low,
    });
    expect(capped.draft.recommendations).toHaveLength(3);
    expectGrounded(capped.draft, capped.table);
  });

  it("falls back to 'nothing stands out' when the facts a summary needs are missing", () => {
    for (const intent of ["focus", "low_stock", "sales_change"] as const) {
      const { draft } = insights(intent, {});
      expect(draft).toEqual({
        summary: NOTHING_STANDS_OUT,
        summaryFactIds: [],
        recommendations: [],
      });
    }
  });
});

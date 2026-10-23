import type { CopilotIntentId } from "@commerceos/core";
import { describe, expect, it } from "vitest";
import { buildFacts, findFact, type FactTable } from "../copilot/build-facts";
import { PERIOD, PREVIOUS, lowStock, orders, sales, top } from "../copilot/copilot-results.fixture";
import {
  buildRuleInsights,
  type CopilotDraft,
  type DraftRecommendation,
} from "../copilot/rule-insights";
import {
  GROUNDING_ISSUE_CODES,
  describeGroundingIssues,
  findGroundingIssues,
  type GroundingIssue,
} from "./find-grounding-issues";

const OPTIONS = { periodDays: 7 };

/** The primary question's table: Pulse (p1) and Echo (p2) sell, Titan (p3) and Pulse are low. */
function focusTable(): FactTable {
  return buildFacts({ sales: sales(), orders: orders(), topProducts: top(), lowStock: lowStock() });
}

function key(table: FactTable, factKey: string): string {
  const fact = findFact(table, factKey);
  if (!fact) throw new Error(`No fact ${factKey}`);
  return fact.id;
}

function recommendation(overrides: Partial<DraftRecommendation> = {}): DraftRecommendation {
  return {
    title: "Keep an eye on sales",
    priority: "medium",
    observation: "Sales are steady.",
    evidenceFactIds: ["f1"],
    reasoning: "Steady sales leave room to plan.",
    suggestedAction: "Review the dashboard weekly.",
    relatedProductAliases: [],
    limitations: [],
    ...overrides,
  };
}

function draft(overrides: Partial<CopilotDraft> = {}): CopilotDraft {
  return { summary: "A quiet week.", summaryFactIds: [], recommendations: [], ...overrides };
}

function codes(issues: GroundingIssue[]) {
  return issues.map((issue) => issue.code);
}

describe("findGroundingIssues: rule-based answers", () => {
  const tables: Record<string, { intent: CopilotIntentId; table: FactTable }> = {
    focus: { intent: "focus", table: focusTable() },
    "focus, empty store": {
      intent: "focus",
      table: buildFacts({
        sales: sales({ paidOrders: 0, revenueMinor: 0, aovMinor: null }),
        orders: orders(0),
        topProducts: top([]),
        lowStock: lowStock([]),
      }),
    },
    top_products: {
      intent: "top_products",
      table: buildFacts({ sales: sales(), topProducts: top() }),
    },
    low_stock: {
      intent: "low_stock",
      table: buildFacts({ lowStock: lowStock(), topProducts: top() }),
    },
    sales_change: {
      intent: "sales_change",
      table: buildFacts({
        sales: sales(),
        topProducts: top(),
        previousSales: sales({ paidOrders: 20, revenueMinor: 1_234_500 }, PREVIOUS),
        previousTopProducts: top(undefined, PREVIOUS),
      }),
    },
  };

  for (const [name, { intent, table }] of Object.entries(tables)) {
    it(`passes every check for the ${name} rules`, () => {
      const answer = buildRuleInsights(intent, table, PERIOD);
      expect(findGroundingIssues(answer, table, OPTIONS)).toEqual([]);
    });
  }
});

describe("findGroundingIssues: citations", () => {
  it("flags fact ids and product aliases that are not in the tables", () => {
    const table = focusTable();
    const issues = findGroundingIssues(
      draft({
        summaryFactIds: ["f99"],
        recommendations: [
          recommendation({ evidenceFactIds: ["f1", "f77"], relatedProductAliases: ["p12"] }),
        ],
      }),
      table,
      OPTIONS,
    );
    expect(issues).toEqual([
      { code: "unknown_fact", recommendation: null, ref: "f99" },
      { code: "unknown_product", recommendation: 1, ref: "p12" },
      { code: "unknown_fact", recommendation: 1, ref: "f77" },
    ]);
  });

  it("flags more than 3 recommendations", () => {
    const four = Array.from({ length: 4 }, () => recommendation());
    expect(
      codes(findGroundingIssues(draft({ recommendations: four }), focusTable(), OPTIONS)),
    ).toEqual(["too_many"]);
  });
});

describe("findGroundingIssues: numbers", () => {
  const table = focusTable();
  const revenue = key(table, "sales.revenue");
  const paid = key(table, "sales.paidOrders");
  const pulseSold = key(table, "top.units:p1");
  const pulseStock = key(table, "lowStock.stock:p1");
  const titanStock = key(table, "lowStock.stock:p3");

  function numberIssues(text: string, evidenceFactIds: string[], aliases: string[] = []) {
    return findGroundingIssues(
      draft({
        recommendations: [
          recommendation({
            observation: text,
            evidenceFactIds,
            relatedProductAliases: aliases,
          }),
        ],
      }),
      table,
      OPTIONS,
    );
  }

  it("accepts a cited value in the usual formats, and rejects a rounded one", () => {
    expect(findFact(table, "sales.revenue")?.value).toBe("9847,00 zł");
    for (const text of [
      "Revenue was 9847,00 zł.",
      "Revenue was 9 847,00 zł.",
      "Revenue was 9 847 zł.",
      "Revenue was 9847 zł.",
      "Revenue was 9847.00 PLN.",
      "Revenue was 9,847.00 PLN.",
    ]) {
      expect(numberIssues(text, [revenue])).toEqual([]);
    }
    expect(codes(numberIssues("Revenue was about 9 850 zł.", [revenue]))).toEqual([
      "ungrounded_number",
    ]);
  });

  it("accepts the period length and a quoted period label, never its numbers alone", () => {
    expect(findFact(table, "sales.paidOrders")?.period).toContain("(11–17 Oct 2026)");
    expect(numberIssues("29 paid orders in the last 7 days (11–17 Oct 2026).", [paid])).toEqual([]);
    expect(numberIssues("29 paid orders in Last 7 days (11–17 Oct 2026).", [paid])).toEqual([]);
    expect(codes(numberIssues("29 paid orders in the last 14 days.", [paid]))).toEqual([
      "ungrounded_number",
    ]);
    // Regression: the day and year numbers of the label are not values (review of #64).
    for (const text of ["Only 11 units left.", "17 orders this week.", "2026 paid orders."]) {
      expect(codes(numberIssues(text, [paid]))).toEqual(["ungrounded_number"]);
    }
  });

  it("accepts a quoted metric label, but not the number inside it as a value", () => {
    const lowTotal = key(table, "lowStock.total");
    const label = findFact(table, "lowStock.total")?.metric ?? "";
    expect(label).toMatch(/\d/);
    const value = findFact(table, "lowStock.total")?.value;
    expect(numberIssues(`${value} ${label.toLowerCase()}.`, [lowTotal])).toEqual([]);
    const threshold = /\d+/.exec(label)?.[0];
    expect(codes(numberIssues(`Order ${threshold} more units.`, [lowTotal]))).toEqual([
      "ungrounded_number",
    ]);
  });

  it("matches product names as whole words only", () => {
    const pad = buildFacts({
      sales: sales(),
      topProducts: top([{ productId: "x", name: "Pad", units: 2, revenueMinor: 100 }]),
    });
    const issues = findGroundingIssues(
      draft({ recommendations: [recommendation({ suggestedAction: "Update the home page." })] }),
      pad,
      OPTIONS,
    );
    expect(issues).toEqual([]);
  });

  it("scopes numbers to the recommendation's own facts", () => {
    // Titan's stock (0) is not Pulse's: 3 is only grounded through Pulse's stock fact.
    const issues = findGroundingIssues(
      draft({
        recommendations: [
          recommendation({
            title: "Restock Pulse Ultralight Mouse",
            observation: "9 units sold; 3 left in stock.",
            evidenceFactIds: [pulseSold, pulseStock],
            relatedProductAliases: ["p1"],
          }),
          recommendation({
            title: "Restock Titan MMO Mouse",
            observation: "9 sold, 3 left.",
            evidenceFactIds: [titanStock],
            relatedProductAliases: ["p3"],
          }),
        ],
      }),
      table,
      OPTIONS,
    );
    expect(issues).toEqual([{ code: "ungrounded_number", recommendation: 2 }]);
  });

  it("checks every text field, including limitations and the title", () => {
    for (const field of ["title", "reasoning", "suggestedAction"] as const) {
      const issues = findGroundingIssues(
        draft({ recommendations: [recommendation({ [field]: "Order 40 units." })] }),
        table,
        OPTIONS,
      );
      expect(codes(issues)).toEqual(["ungrounded_number"]);
    }
    const limitation = findGroundingIssues(
      draft({ recommendations: [recommendation({ limitations: ["Only 12 days of data."] })] }),
      table,
      OPTIONS,
    );
    expect(codes(limitation)).toEqual(["ungrounded_number"]);
  });

  it("checks summary numbers against the summary's facts only", () => {
    const ok = findGroundingIssues(
      draft({ summary: "29 paid orders.", summaryFactIds: [paid] }),
      table,
      OPTIONS,
    );
    expect(ok).toEqual([]);
    const bad = findGroundingIssues(
      draft({ summary: "29 paid orders, 9847,00 zł.", summaryFactIds: [paid] }),
      table,
      OPTIONS,
    );
    expect(bad).toEqual([{ code: "ungrounded_number", recommendation: null }]);
  });

  it("accepts a cited fact without a value (Not enough data) and no number", () => {
    const empty = buildFacts({ sales: sales({ paidOrders: 0, revenueMinor: 0, aovMinor: null }) });
    const aov = key(empty, "sales.aov");
    expect(findFact(empty, "sales.aov")?.number).toBeNull();
    const issues = findGroundingIssues(
      draft({
        recommendations: [
          recommendation({
            observation: "Average order value: not enough data.",
            evidenceFactIds: [aov],
          }),
        ],
      }),
      empty,
      OPTIONS,
    );
    expect(issues).toEqual([]);
  });

  it("accepts a signed change by its absolute value", () => {
    const change = buildFacts({
      sales: sales(),
      previousSales: sales({ paidOrders: 20 }, PREVIOUS),
    });
    const ids = [key(change, "change.paidOrders"), key(change, "change.paidOrders.percent")];
    const issues = findGroundingIssues(
      draft({
        recommendations: [
          recommendation({
            observation: "Paid orders rose by 9 (+45%).",
            evidenceFactIds: ids,
          }),
        ],
      }),
      change,
      OPTIONS,
    );
    expect(issues).toEqual([]);
  });

  it("accepts two grounded numbers written next to each other", () => {
    expect(numberIssues("Units and stock: 9 3.", [pulseSold, pulseStock], ["p1"])).toEqual([]);
    expect(codes(numberIssues("Units and stock: 9 4.", [pulseSold, pulseStock], ["p1"]))).toEqual([
      "ungrounded_number",
    ]);
  });

  it("does not read digits inside a product name or SKU as stated numbers", () => {
    const table2 = buildFacts({
      topProducts: top([
        { productId: "x", name: "Strike 65 Keyboard", units: 2, revenueMinor: 10 },
      ]),
      lowStock: lowStock([
        { id: "x", name: "Strike 65 Keyboard", sku: "DEMO-KEY-065", stockQuantity: 1 },
      ]),
    });
    const issues = findGroundingIssues(
      draft({
        recommendations: [
          recommendation({
            title: "Restock Strike 65 Keyboard (DEMO-KEY-065)",
            observation: "2 units sold, 1 left.",
            evidenceFactIds: [key(table2, "top.units:p1"), key(table2, "lowStock.stock:p1")],
            relatedProductAliases: ["p1"],
          }),
        ],
      }),
      table2,
      OPTIONS,
    );
    expect(issues).toEqual([]);
  });

  it("reports one issue per recommendation however many numbers are wrong", () => {
    const issues = numberIssues("12 and 13 and 14.", [paid]);
    expect(issues).toEqual([{ code: "ungrounded_number", recommendation: 1 }]);
  });
});

describe("findGroundingIssues: products", () => {
  const table = focusTable();
  const pulseSold = key(table, "top.units:p1");
  const paid = key(table, "sales.paidOrders");

  it("flags a product named by name or SKU without its alias", () => {
    for (const text of ["Restock Titan MMO Mouse soon.", "Restock demo-mou-003 soon."]) {
      const issues = findGroundingIssues(
        draft({ recommendations: [recommendation({ suggestedAction: text })] }),
        table,
        OPTIONS,
      );
      expect(issues).toEqual([{ code: "unlisted_product", recommendation: 1, ref: "p3" }]);
    }
  });

  it("flags a cited product fact whose product is not listed", () => {
    const issues = findGroundingIssues(
      draft({ recommendations: [recommendation({ evidenceFactIds: [pulseSold] })] }),
      table,
      OPTIONS,
    );
    expect(issues).toEqual([{ code: "unlisted_product", recommendation: 1, ref: "p1" }]);
  });

  it("lets the summary name only the products of its cited facts", () => {
    expect(
      findGroundingIssues(
        draft({ summary: "Pulse Ultralight Mouse sold 9 units.", summaryFactIds: [pulseSold] }),
        table,
        OPTIONS,
      ),
    ).toEqual([]);
    expect(
      findGroundingIssues(
        draft({ summary: "Echo Surround Headset sells well.", summaryFactIds: [paid] }),
        table,
        OPTIONS,
      ),
    ).toEqual([{ code: "unlisted_product", recommendation: null, ref: "p2" }]);
  });

  it("matches the longest name first, so a product whose name contains another's is not both", () => {
    const table2 = buildFacts({
      topProducts: top([
        { productId: "a", name: "Pulse Mouse", units: 2, revenueMinor: 10 },
        { productId: "b", name: "Pulse Mouse Pro", units: 4, revenueMinor: 20 },
      ]),
    });
    const issues = findGroundingIssues(
      draft({
        recommendations: [
          recommendation({
            observation: "Pulse Mouse Pro sold 4 units.",
            evidenceFactIds: [key(table2, "top.units:p2")],
            relatedProductAliases: ["p2"],
          }),
        ],
      }),
      table2,
      OPTIONS,
    );
    expect(issues).toEqual([]);
  });
});

describe("findGroundingIssues: causal claims", () => {
  const table = focusTable();

  it("flags attribution phrases in the observation and the summary", () => {
    for (const phrase of [
      "The price drop caused this.",
      "Fewer orders led to lower revenue.",
      "Revenue fell due to stock.",
      "As a result of the sale, orders rose.",
      "Orders rose because of the sale.",
      "The headset drove sales.",
    ]) {
      expect(
        codes(
          findGroundingIssues(
            draft({ recommendations: [recommendation({ observation: phrase })] }),
            table,
            OPTIONS,
          ),
        ),
      ).toEqual(["causal_claim"]);
      expect(codes(findGroundingIssues(draft({ summary: phrase }), table, OPTIONS))).toEqual([
        "causal_claim",
      ]);
    }
  });

  it("lets the reasoning explain consequences", () => {
    const issues = findGroundingIssues(
      draft({
        recommendations: [
          recommendation({ reasoning: "An empty shelf led to lost sales elsewhere before." }),
        ],
      }),
      table,
      OPTIONS,
    );
    expect(issues).toEqual([]);
  });
});

describe("findGroundingIssues: hidden characters", () => {
  const table = focusTable();

  it("flags a zero-width character that would hide a causal claim", () => {
    // Without the check, "dro\u200Bve" matches no causal phrase and the draft passes.
    const issues = findGroundingIssues(
      draft({
        recommendations: [recommendation({ observation: "The banner dro\u200Bve these sales." })],
      }),
      table,
      OPTIONS,
    );
    expect(issues).toEqual([{ code: "hidden_character", recommendation: 1 }]);
  });

  it.each([
    ["a C1 control", "A quiet\u0085week."],
    ["a bidi override", "A \u202Equiet week."],
    ["a soft hyphen", "A qui\u00ADet week."],
    ["a byte order mark", "A quiet week.\uFEFF"],
    ["a tab", "A quiet\tweek."],
    ["DEL", "A quiet week.\u007F"],
  ])("flags %s in the summary", (_name, summary) => {
    expect(codes(findGroundingIssues(draft({ summary }), table, OPTIONS))).toEqual([
      "hidden_character",
    ]);
  });

  it("checks every text field of a recommendation", () => {
    for (const field of ["title", "reasoning", "suggestedAction"] as const) {
      const issues = findGroundingIssues(
        draft({ recommendations: [recommendation({ [field]: "Plan\u200Bahead." })] }),
        table,
        OPTIONS,
      );
      expect(codes(issues)).toEqual(["hidden_character"]);
    }
    const limitation = findGroundingIssues(
      draft({ recommendations: [recommendation({ limitations: ["Plan\u200Bahead."] })] }),
      table,
      OPTIONS,
    );
    expect(codes(limitation)).toEqual(["hidden_character"]);
  });

  it("allows line feeds and the no-break spaces of Polish number formatting", () => {
    const issues = findGroundingIssues(
      draft({ summary: "A quiet week.\nNothing\u00A0else\u202Fto add." }),
      table,
      OPTIONS,
    );
    expect(issues).toEqual([]);
  });

  it("allows a format character inside a catalog product name the text quotes", () => {
    // The owner's name (an emoji joiner, say) is not model text; rule answers quote it too.
    const named = buildFacts({
      topProducts: top([{ productId: "a", name: "Pulse\u200DMouse", units: 4, revenueMinor: 20 }]),
    });
    const issues = findGroundingIssues(
      draft({
        recommendations: [
          recommendation({
            observation: "Pulse\u200DMouse sold 4 units.",
            evidenceFactIds: [key(named, "top.units:p1")],
            relatedProductAliases: ["p1"],
          }),
        ],
      }),
      named,
      OPTIONS,
    );
    expect(issues).toEqual([]);
  });
});

describe("describeGroundingIssues", () => {
  it("lists codes, positions and ids for the second attempt, never model text", () => {
    const message = describeGroundingIssues([
      { code: "unknown_fact", recommendation: 2, ref: "f99" },
      { code: "ungrounded_number", recommendation: null },
      { code: "too_many", recommendation: null },
    ]);
    expect(message).toContain("Recommendation 2 (f99): unknown_fact:");
    expect(message).toContain("The summary: ungrounded_number:");
    expect(message).toContain("The answer: too_many:");
  });

  it("has a text for every code", () => {
    for (const code of GROUNDING_ISSUE_CODES) {
      expect(describeGroundingIssues([{ code, recommendation: 1 }])).toContain(`${code}: `);
    }
  });
});

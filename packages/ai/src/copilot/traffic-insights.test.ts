import { describe, expect, it } from "vitest";
import {
  buildFacts,
  definitionsOf,
  findFact,
  type CopilotFact,
  type CopilotToolResults,
  type FactTable,
} from "./build-facts";
import {
  DRIFT_ID,
  PERIOD,
  PULSE_ID,
  TITAN_ID,
  emptyTraffic,
  lowStock,
  orders,
  sales,
  top,
  traffic,
} from "./copilot-results.fixture";
import {
  DEMO_TRAFFIC_LIMITATION,
  NO_TRAFFIC_DATA_LIMITATION,
  expandDraft,
  noViewDataLimitation,
  serverLimitations,
} from "./expand-response";
import {
  MIN_VIEWS_FOR_RATE,
  NOTHING_STANDS_OUT,
  buildRuleInsights,
  noTrafficText,
  type CopilotDraft,
} from "./rule-insights";

/**
 * Copilot Phase 3 (Copilot spec steps 14; #28): demo traffic facts, rules 4–6, the traffic
 * summaries and the server's demo labels. Shared fixture: Drift is viewed a lot and rarely
 * bought, Titan is out of stock with views, Pulse is a low-stock best seller.
 */

function insights(intent: Parameters<typeof buildRuleInsights>[0], results: CopilotToolResults) {
  const table = buildFacts(results);
  return { table, draft: buildRuleInsights(intent, table, PERIOD) };
}

function fact(table: FactTable, key: string): CopilotFact {
  const found = findFact(table, key);
  if (!found) throw new Error(`no fact ${key}`);
  return found;
}

/** No digit may remain once the cited facts' values and the period text are removed. */
function expectGrounded(draft: CopilotDraft, table: FactTable): void {
  const strip = (text: string, ids: string[]) => {
    const values = table.facts.filter((item) => ids.includes(item.id)).map((item) => item.value);
    let rest = text.replaceAll("last 7 days", "");
    for (const value of [...values].sort((a, b) => b.length - a.length)) {
      rest = rest.replaceAll(value, "");
    }
    return rest.match(/\d+/g) ?? [];
  };
  expect(strip(draft.summary, draft.summaryFactIds)).toEqual([]);
  for (const item of draft.recommendations) {
    for (const text of [item.title, item.observation, item.reasoning, item.suggestedAction]) {
      expect(strip(text, item.evidenceFactIds)).toEqual([]);
    }
  }
}

const VIEWS_RESULTS: CopilotToolResults = { traffic: traffic(), lowStock: lowStock() };

describe("demo traffic facts", () => {
  it("flags every fact computed from demo data, and only those", () => {
    const table = buildFacts({ traffic: traffic() });
    const real = table.facts.filter((item) => !item.demo).map((item) => item.key);
    expect(real).toEqual([
      "funnel.paidOrders",
      "traffic.units:p1",
      "traffic.units:p2",
      "traffic.units:p3",
      "traffic.units:p4",
    ]);
    for (const item of table.facts)
      expect(item.source.startsWith("getTrafficSummary · ")).toBe(true);
    expect(fact(table, "traffic.sessions")).toMatchObject({
      metric: "Sessions (demo)",
      value: "1000",
      period: "Last 7 days (11–17 Oct 2026)",
      definitionId: "sessionsDemo",
    });
  });

  it("lists sources busiest first with their share, and leaves out a source without sessions", () => {
    const table = buildFacts({ traffic: traffic() });
    const sources = table.facts.filter((item) => item.key.startsWith("traffic.share:"));
    expect(sources.map((item) => [item.metric, item.value])).toEqual([
      ["Share of sessions (demo): Organic search", "40%"],
      ["Share of sessions (demo): Direct", "30%"],
      ["Share of sessions (demo): Social", "20%"],
      ["Share of sessions (demo): Email", "10%"],
    ]);
    expect(findFact(table, "traffic.sessions:paid")).toBeUndefined();
  });

  it("states the funnel, each step's drop-off, conversion and the store's rate", () => {
    const table = buildFacts({ traffic: traffic() });
    const value = (key: string) => fact(table, key).value;
    expect(value("funnel.productViews")).toBe("800");
    expect(fact(table, "funnel.paidOrders")).toMatchObject({
      metric: "Paid orders",
      value: "29",
      definitionId: "paidOrders",
    });
    expect(value("funnel.dropOff:productViews")).toBe("20%");
    expect(value("funnel.dropOff:addToCarts")).toBe("85%");
    expect(fact(table, "funnel.dropOff:checkoutsStarted")).toMatchObject({
      value: "66.7%",
      number: 66.7,
    });
    expect(value("funnel.dropOff:paidOrders")).toBe("27.5%");
    expect(value("traffic.conversion")).toBe("2.9%");
    expect(value("traffic.viewToPurchase")).toBe("5%");
    expect(value("traffic.withoutViewData")).toBe("2");
  });

  it("keys products by the same alias as the other tools, with views, units and rate", () => {
    const table = buildFacts({ topProducts: top(), lowStock: lowStock(), traffic: traffic() });
    const pulse = table.products.find((product) => product.id === PULSE_ID);
    expect(fact(table, `traffic.views:${pulse?.alias}`).value).toBe("150");
    expect(fact(table, `traffic.rate:${pulse?.alias}`).value).toBe("6%");
    const drift = table.products.find((product) => product.id === DRIFT_ID);
    expect(fact(table, `traffic.rate:${drift?.alias}`)).toMatchObject({
      metric: "View-to-purchase rate (demo): Drift Wireless Headset",
      value: "0.7%",
      productAlias: drift?.alias,
    });
  });

  it("gives a product with unknown units no units fact and no rate, never 0", () => {
    const table = buildFacts({
      traffic: traffic({
        products: [
          {
            productId: DRIFT_ID,
            name: "Drift Wireless Headset",
            views: 300,
            addToCarts: 30,
            unitsSold: null,
            viewToPurchaseRate: null,
          },
        ],
      }),
    });
    expect(findFact(table, "traffic.views:p1")?.value).toBe("300");
    expect(findFact(table, "traffic.units:p1")).toBeUndefined();
    expect(findFact(table, "traffic.rate:p1")).toBeUndefined();
  });

  it('says "Not enough data" without sessions and states no drop-off without a base', () => {
    const table = buildFacts({ traffic: emptyTraffic() });
    expect(fact(table, "traffic.conversion")).toMatchObject({
      value: "Not enough data",
      number: null,
    });
    expect(fact(table, "traffic.viewToPurchase").value).toBe("Not enough data");
    expect(table.facts.some((item) => item.key.startsWith("funnel.dropOff:"))).toBe(false);
    expect(table.facts.some((item) => item.key.startsWith("traffic.share:"))).toBe(false);
    expect(table.products).toEqual([]);
  });

  it("leaves out the without-view-data count when every product has views", () => {
    const table = buildFacts({ traffic: traffic({ productsWithoutViewData: 0 }) });
    expect(findFact(table, "traffic.withoutViewData")).toBeUndefined();
  });

  it("lists the demo definitions after the dashboard's", () => {
    const table = buildFacts({ sales: sales(), traffic: traffic() });
    expect(definitionsOf(table).map((definition) => definition.id)).toEqual([
      "paidOrders",
      "revenue",
      "aov",
      "topProducts",
      "sessionsDemo",
      "funnelDemo",
      "storeConversionDemo",
      "viewToPurchaseRateDemo",
    ]);
  });
});

describe("traffic rules", () => {
  it("rule 4: an out-of-stock product with demo views gets a high 'Restock or hide'", () => {
    const { table, draft } = insights("views_without_sales", VIEWS_RESULTS);
    const titan = table.products.find((product) => product.id === TITAN_ID);
    expect(draft.recommendations[0]).toEqual({
      title: "Restock or hide Titan MMO Mouse",
      priority: "high",
      observation: "90 demo views in the last 7 days; it is out of stock.",
      evidenceFactIds: [
        fact(table, `traffic.views:${titan?.alias}`).id,
        fact(table, `lowStock.stock:${titan?.alias}`).id,
      ],
      reasoning: expect.stringContaining("fictional demo data"),
      suggestedAction: expect.stringContaining("You decide"),
      relatedProductAliases: [titan?.alias],
    });
    expectGrounded(draft, table);
  });

  it("rule 4 leaves a best seller to rule 1 and ignores a product without views", () => {
    const soldOutPulse = lowStock([
      { id: PULSE_ID, name: "Pulse Ultralight Mouse", sku: "DEMO-MOU-002", stockQuantity: 0 },
    ]);
    const { draft } = insights("focus", {
      sales: sales(),
      orders: orders(),
      topProducts: top(),
      lowStock: soldOutPulse,
      traffic: traffic(),
    });
    const titles = draft.recommendations.map((item) => item.title);
    expect(titles).toContain("Restock Pulse Ultralight Mouse");
    expect(titles).not.toContain("Restock or hide Pulse Ultralight Mouse");

    const unseen = traffic({
      products: [
        {
          productId: TITAN_ID,
          name: "Titan MMO Mouse",
          views: 0,
          addToCarts: 0,
          unitsSold: 0,
          viewToPurchaseRate: null,
        },
      ],
    });
    const quiet = insights("views_without_sales", { traffic: unseen, lowStock: lowStock() });
    expect(quiet.draft.recommendations).toEqual([]);
  });

  it("rule 5: a much-viewed product converting under half the store's rate is reviewed", () => {
    const { table, draft } = insights("views_without_sales", VIEWS_RESULTS);
    const review = draft.recommendations.find((item) => item.title.startsWith("Review"));
    expect(review).toMatchObject({
      title: "Review the product page and price of Drift Wireless Headset",
      priority: "medium",
      observation:
        "300 demo views and 2 units sold in the last 7 days: a view-to-purchase rate of 0.7%, against 5% for the whole store.",
      relatedProductAliases: [table.products.find((product) => product.id === DRIFT_ID)?.alias],
    });
    expect(review?.evidenceFactIds).toHaveLength(4);
    // Pulse converts above the store; Titan is rule 4's; Echo has too few views.
    expect(draft.recommendations.map((item) => item.title)).toEqual([
      "Restock or hide Titan MMO Mouse",
      "Review the product page and price of Drift Wireless Headset",
    ]);
    expect(MIN_VIEWS_FOR_RATE).toBe(50);
    expectGrounded(draft, table);
  });

  it("rule 5 needs the store's rate, a rate of its own and enough views", () => {
    const noStoreRate = insights("views_without_sales", {
      traffic: traffic({ viewToPurchaseRate: null }),
    });
    expect(noStoreRate.draft.recommendations).toEqual([]);
    const zeroStoreRate = insights("views_without_sales", {
      traffic: traffic({ viewToPurchaseRate: 0 }),
    });
    expect(zeroStoreRate.draft.recommendations).toEqual([]);

    // A hand-built table: views below the bar, and a rate fact without a number.
    const table = buildFacts({ traffic: traffic() });
    const drift = table.products.find((product) => product.id === DRIFT_ID)?.alias;
    const edited: FactTable = {
      products: table.products,
      facts: table.facts.map((item) => {
        if (item.key === `traffic.views:${drift}`) return { ...item, number: 49, value: "49" };
        if (item.key === "traffic.rate:p3") return { ...item, number: null, ratio: undefined };
        return item;
      }),
    };
    expect(buildRuleInsights("views_without_sales", edited, PERIOD).recommendations).toEqual([]);
    // Only Drift would qualify; without a number its views count as none.
    const noViewsNumber: FactTable = {
      products: table.products.filter((product) => product.alias === drift),
      facts: table.facts.map((item) =>
        item.key === `traffic.views:${drift}` ? { ...item, number: null } : item,
      ),
    };
    expect(buildRuleInsights("views_without_sales", noViewsNumber, PERIOD).recommendations).toEqual(
      [],
    );
  });

  it("rule 5 compares the unrounded rates, never the displayed percentages (#63)", () => {
    const reviewed = (driftRate: number, storeRate = 0.05) =>
      insights("views_without_sales", {
        traffic: traffic({
          viewToPurchaseRate: storeRate,
          products: traffic().products.map((product) =>
            product.productId === DRIFT_ID
              ? { ...product, viewToPurchaseRate: driftRate }
              : product,
          ),
        }),
      }).draft.recommendations.some((item) => item.title.endsWith("Drift Wireless Headset"));
    // Exactly half the store's rate is not below it; just under is, although both show "2.5%".
    expect(reviewed(0.025)).toBe(false);
    expect(reviewed(0.0249)).toBe(true);
    // A store rate under 0.05% shows as "0%" but still has a half to fall below.
    expect(reviewed(0.0001, 0.0004)).toBe(true);
    const table = buildFacts({ traffic: traffic({ viewToPurchaseRate: 0.0004 }) });
    expect(fact(table, "traffic.viewToPurchase")).toMatchObject({ value: "0%", ratio: 0.0004 });
  });

  it("rule 6: the funnel step with the largest drop-off is named, with both steps as evidence", () => {
    const { table, draft } = insights("funnel", { traffic: traffic() });
    expect(draft.recommendations).toEqual([
      {
        title: "Look at the add-to-cart step",
        priority: "medium",
        observation:
          "Product views (demo): 800; add-to-carts (demo): 120 in the last 7 days. A drop-off of 85%, the largest in the funnel.",
        evidenceFactIds: [
          fact(table, "funnel.productViews").id,
          fact(table, "funnel.addToCarts").id,
          fact(table, "funnel.dropOff:addToCarts").id,
        ],
        reasoning: expect.stringContaining("fictional demo data"),
        suggestedAction: expect.stringContaining("product pages"),
        relatedProductAliases: [],
      },
    ]);
    expectGrounded(draft, table);
  });

  it("rule 6 names every step it can pick, and the first of equal drop-offs", () => {
    const cases: [Partial<ReturnType<typeof traffic>["funnel"]>, string][] = [
      [
        { productViews: 100, addToCarts: 90, checkoutsStarted: 85 },
        "Look at the product view step",
      ],
      [{ addToCarts: 700, checkoutsStarted: 100, paidOrders: 90 }, "Look at the checkout step"],
      [{ addToCarts: 700, checkoutsStarted: 600, paidOrders: 1 }, "Look at the payment step"],
      [
        { productViews: 500, addToCarts: 250, checkoutsStarted: 125, paidOrders: 125 },
        "Look at the product view step",
      ],
    ];
    for (const [funnel, title] of cases) {
      const summary = traffic();
      const { table, draft } = insights("funnel", {
        traffic: { ...summary, funnel: { ...summary.funnel, ...funnel } },
      });
      expect(draft.recommendations.map((item) => item.title)).toEqual([title]);
      expectGrounded(draft, table);
    }
  });

  it("rule 6 stays silent without traffic, and without a positive drop-off", () => {
    expect(insights("funnel", { traffic: emptyTraffic() }).draft.recommendations).toEqual([]);
    const flat = traffic();
    const rising = insights("funnel", {
      traffic: {
        ...flat,
        sessions: { ...flat.sessions, total: 10 },
        funnel: {
          sessions: 10,
          productViews: 10,
          addToCarts: 10,
          checkoutsStarted: 10,
          paidOrders: 12,
        },
      },
    });
    expect(rising.draft.recommendations).toEqual([]);
    // A hand-built table with a drop-off but without its step facts.
    const table = buildFacts({ traffic: traffic() });
    const partial: FactTable = {
      products: [],
      facts: table.facts.filter(
        (item) => !item.key.startsWith("funnel.") || item.key.includes("dropOff"),
      ),
    };
    expect(buildRuleInsights("funnel", partial, PERIOD).recommendations).toEqual([]);
  });

  it("the primary question runs every rule, high first, at most 3", () => {
    const { table, draft } = insights("focus", {
      sales: sales(),
      orders: orders(),
      topProducts: top(),
      lowStock: lowStock(),
      traffic: traffic(),
    });
    expect(draft.recommendations.map((item) => item.title)).toEqual([
      "Restock Pulse Ultralight Mouse",
      "Restock or hide Titan MMO Mouse",
      "Review the product page and price of Drift Wireless Headset",
    ]);
    expect(draft.summary).toContain("Store conversion rate (demo): 2.9%.");
    expectGrounded(draft, table);
  });

  it("the primary question leaves conversion out of the summary when it has no value", () => {
    const { draft } = insights("focus", {
      sales: sales(),
      orders: orders(),
      traffic: emptyTraffic(),
    });
    expect(draft.summary).not.toContain("conversion");
  });
});

describe("traffic summaries", () => {
  it("traffic sources: total, then each source with its share, busiest first", () => {
    const { table, draft } = insights("traffic_sources", { traffic: traffic() });
    expect(draft.summary).toBe(
      `Demo sessions in the last 7 days: 1000. By source: Organic search 400 (40%), Direct 300 (30%), Social 200 (20%), Email 100 (10%). ${NOTHING_STANDS_OUT}`,
    );
    expect(draft.summaryFactIds).toHaveLength(9);
    expect(draft.recommendations).toEqual([]);
    expectGrounded(draft, table);
  });

  it("traffic sources are sorted by their number, not their display value (#63)", () => {
    const table = buildFacts({ traffic: traffic() });
    // A formatted display value ("1 000") is not a number; the order must not depend on it.
    const formatted: FactTable = {
      products: table.products,
      facts: table.facts.map((item) =>
        item.key === "traffic.sessions:email" ? { ...item, number: 1000, value: "1 000" } : item,
      ),
    };
    const draft = buildRuleInsights("traffic_sources", formatted, PERIOD);
    expect(draft.summary).toContain("By source: Email 1 000 (10%), Organic search 400 (40%)");
  });

  it("funnel: every step in order, paid orders named as real orders", () => {
    const { table, draft } = insights("funnel", { traffic: traffic() });
    expect(draft.summary).toBe(
      "The funnel in the last 7 days: sessions (demo) 1000 → product views (demo) 800 → add-to-carts (demo) 120 → checkouts started (demo) 40 → paid orders 29. Paid orders come from the orders table.",
    );
    expectGrounded(draft, table);
  });

  it("views without sales: the three most viewed products, units when known", () => {
    const known = insights("views_without_sales", VIEWS_RESULTS);
    expect(known.draft.summary).toContain(
      "Most viewed products in the last 7 days (demo views): Drift Wireless Headset (300 views, 2 units sold), Pulse Ultralight Mouse (150 views, 9 units sold), Titan MMO Mouse (90 views, 0 units sold).",
    );
    expectGrounded(known.draft, known.table);

    const unknown = traffic();
    const first = unknown.products[0];
    if (!first) throw new Error("fixture has products");
    const { draft } = insights("views_without_sales", {
      traffic: {
        ...unknown,
        products: [
          { ...first, unitsSold: 1, viewToPurchaseRate: null },
          { ...first, productId: "x", name: "Mystery", unitsSold: null, viewToPurchaseRate: null },
        ],
      },
    });
    expect(draft.summary).toContain(
      "Drift Wireless Headset (300 views, 1 unit sold), Mystery (300 views).",
    );
  });

  it("says when the period has no demo traffic or no product view data", () => {
    const empty = { traffic: emptyTraffic() };
    for (const intent of ["traffic_sources", "funnel"] as const) {
      const { draft } = insights(intent, empty);
      expect(draft.summary).toBe(`${noTrafficText("last 7 days")} ${NOTHING_STANDS_OUT}`);
      expect(draft.summaryFactIds).toEqual([]);
    }
    expect(insights("views_without_sales", empty).draft.summary).toBe(
      `No product has demo view data in the last 7 days. ${NOTHING_STANDS_OUT}`,
    );
    // No traffic tool result at all (never the case for these plans, but never a crash).
    expect(insights("traffic_sources", {}).draft.summary).toContain("No demo traffic data");
  });
});

describe("server-attached demo labels (D08, R07)", () => {
  it("labels every answer that read the demo traffic, and names what is missing", () => {
    expect(serverLimitations("funnel", { traffic: traffic() })).toEqual([DEMO_TRAFFIC_LIMITATION]);
    expect(serverLimitations("traffic_sources", { traffic: emptyTraffic() })).toEqual([
      DEMO_TRAFFIC_LIMITATION,
      NO_TRAFFIC_DATA_LIMITATION,
    ]);
    expect(serverLimitations("views_without_sales", { traffic: traffic() })).toEqual([
      DEMO_TRAFFIC_LIMITATION,
      noViewDataLimitation(2),
    ]);
    expect(
      serverLimitations("focus", { traffic: traffic({ productsWithoutViewData: 1 }) }),
    ).toEqual([DEMO_TRAFFIC_LIMITATION, noViewDataLimitation(1)]);
    expect(
      serverLimitations("focus", { traffic: traffic({ productsWithoutViewData: 0 }) }),
    ).toEqual([DEMO_TRAFFIC_LIMITATION]);
    expect(noViewDataLimitation(1)).toBe(
      "1 published product has no demo view data, so it has no view-to-purchase rate.",
    );
  });

  it("flags every demo evidence row in the expanded answer, summary included", () => {
    const { table, draft } = insights("views_without_sales", VIEWS_RESULTS);
    const answer = expandDraft(draft, table, [DEMO_TRAFFIC_LIMITATION]);
    const demoMetrics = (rows: { metric: string; demo?: boolean }[]) =>
      rows.filter((row) => row.demo).map((row) => row.metric);
    expect(demoMetrics(answer.summaryEvidence)).toEqual([
      "Views (demo): Drift Wireless Headset",
      "Views (demo): Pulse Ultralight Mouse",
      "Views (demo): Titan MMO Mouse",
    ]);
    for (const recommendation of answer.recommendations) {
      for (const row of recommendation.evidence) {
        expect(row.demo).toBe(row.metric.includes("(demo)"));
      }
      expect(recommendation.limitations).toEqual([DEMO_TRAFFIC_LIMITATION]);
    }
  });

  it("never gives a product without view data a rate (D08)", () => {
    const table = buildFacts({ traffic: traffic(), lowStock: lowStock() });
    for (const product of table.products) {
      const rate = findFact(table, `traffic.rate:${product.alias}`);
      if (rate) expect(findFact(table, `traffic.views:${product.alias}`)).toBeDefined();
    }
    // Pulse is in the stock list only through the traffic tool; a product only in the stock
    // list has no views fact and therefore no rate.
    const stockOnly = buildFacts({ lowStock: lowStock() });
    expect(stockOnly.facts.some((item) => item.key.startsWith("traffic.rate:"))).toBe(false);
  });
});

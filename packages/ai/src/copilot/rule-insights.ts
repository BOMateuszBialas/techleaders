import {
  METRIC_DEFINITIONS,
  METRIC_PERIOD_LABELS,
  TRAFFIC_SOURCES,
  type CopilotIntentId,
  type MetricPeriod,
} from "@commerceos/core";
import {
  TRAFFIC_SOURCE_LABELS,
  findFact,
  type CopilotFact,
  type CopilotProduct,
  type FactTable,
} from "./build-facts";

/**
 * An answer before expansion: it cites fact ids and product aliases, never values or ids. Rules
 * produce it today; a model will produce the same shape in Phase 2, so one expansion step and
 * one set of grounding checks serve both.
 */
export type DraftRecommendation = {
  title: string;
  priority: "high" | "medium" | "low";
  observation: string;
  evidenceFactIds: string[];
  reasoning: string;
  suggestedAction: string;
  relatedProductAliases: string[];
};

export type CopilotDraft = {
  summary: string;
  summaryFactIds: string[];
  recommendations: DraftRecommendation[];
};

export const MAX_RECOMMENDATIONS = 3;
export const NOTHING_STANDS_OUT = "No action stands out in this period's data.";

type RuleContext = { table: FactTable; periodText: string };

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

function units(fact: CopilotFact): string {
  return fact.number === 1 ? "1 unit" : `${fact.value} units`;
}

/**
 * Rule 1: a best seller of the period is at or below the low-stock threshold now. One
 * recommendation per such product, in best-seller order.
 */
function restockBestSellers({ table, periodText }: RuleContext): DraftRecommendation[] {
  return table.products.flatMap((product) => {
    const sold = findFact(table, `top.units:${product.alias}`);
    const stock = findFact(table, `lowStock.stock:${product.alias}`);
    if (!sold || !stock) return [];
    const soldOut = stock.number === 0;
    const left = soldOut ? "it is now out of stock" : `${stock.value} left in stock`;
    return [
      {
        title: `Restock ${product.name}`,
        priority: "high" as const,
        observation: `${units(sold)} sold in the ${periodText}; ${left}.`,
        evidenceFactIds: [sold.id, stock.id],
        reasoning: soldOut
          ? "It is one of the period's best sellers and has run out; shoppers cannot buy it until it is restocked."
          : "It is one of the period's best sellers and is about to run out; shoppers cannot buy a product that is out of stock.",
        suggestedAction:
          "Order a new batch and update the stock when it arrives. You decide the quantity.",
        relatedProductAliases: [product.alias],
      },
    ];
  });
}

/** Rule 2: no paid orders in the period. */
function noPaidOrders({ table, periodText }: RuleContext): DraftRecommendation[] {
  const paid = findFact(table, "sales.paidOrders");
  if (!paid || paid.number !== 0) return [];
  const placed = findFact(table, "orders.placed");
  const observation = placed
    ? `No paid orders in the ${periodText}; ${placed.number === 1 ? "1 order was" : `${placed.value} orders were`} placed.`
    : `No paid orders in the ${periodText}.`;
  return [
    {
      title: "Check that products are published and checkout works",
      priority: "high",
      observation,
      evidenceFactIds: placed ? [paid.id, placed.id] : [paid.id],
      reasoning:
        "Without paid orders there is no revenue. These numbers cannot tell a quiet week from unpublished products or a broken checkout, so check those first.",
      suggestedAction:
        "Open the storefront as a shopper: check that products are published and in stock, then place a test order.",
      relatedProductAliases: [],
    },
  ];
}

type Comparison = { text: string; factIds: string[]; change: CopilotFact };

/** "Paid orders: 20 → 29 (+45%)" from the two periods' facts, or null when one is missing. */
function comparison(table: FactTable, id: "paidOrders" | "revenue"): Comparison | null {
  const before = findFact(table, `previous.sales.${id}`);
  const now = findFact(table, `sales.${id}`);
  const percent = findFact(table, `change.${id}.percent`);
  const change = findFact(table, `change.${id}`);
  if (!before || !now || !percent || !change) return null;
  return {
    text: `${METRIC_DEFINITIONS[id].label}: ${before.value} → ${now.value} (${percent.value})`,
    factIds: [before.id, now.id, percent.id],
    change,
  };
}

/** Rule 3 (`sales_change` only): paid orders or revenue changed against the previous period. */
function salesChanged({ table }: RuleContext): DraftRecommendation[] {
  const orders = comparison(table, "paidOrders");
  const revenue = comparison(table, "revenue");
  if (!orders || !revenue) return [];
  const moved = [revenue, orders].find((item) => item.change.number !== 0);
  if (!moved) return [];
  const direction = moved.change.value.startsWith("-") ? "lower" : "higher";
  const metric = moved === revenue ? "Revenue is" : "Paid orders are";
  return [
    {
      title: `${metric} ${direction} than in the previous period`,
      priority: "medium",
      observation: `${orders.text}. ${revenue.text}.`,
      evidenceFactIds: [...orders.factIds, ...revenue.factIds],
      reasoning:
        "Comparing the two periods shows what moved, not why. The best sellers of both periods show which products moved.",
      suggestedAction:
        "Compare the best sellers of both periods and check whether a product sold out, changed price or was unpublished, then decide what to change.",
      relatedProductAliases: [],
    },
  ];
}

/** Products with demo views, most viewed first (the traffic tool's order). */
function viewedProducts(table: FactTable): { product: CopilotProduct; views: CopilotFact }[] {
  return table.products
    .flatMap((product) => {
      const views = findFact(table, `traffic.views:${product.alias}`);
      return views ? [{ product, views }] : [];
    })
    .sort((a, b) => table.facts.indexOf(a.views) - table.facts.indexOf(b.views));
}

/**
 * Rule 4: a published product is out of stock and still gets demo views. A best seller in the
 * same state is rule 1's ("Restock …"), so it is left out here.
 */
function restockViewedOutOfStock({ table, periodText }: RuleContext): DraftRecommendation[] {
  return viewedProducts(table).flatMap(({ product, views }) => {
    const stock = findFact(table, `lowStock.stock:${product.alias}`);
    if (!stock || stock.number !== 0 || views.number === 0) return [];
    if (findFact(table, `top.units:${product.alias}`)) return [];
    return [
      {
        title: `Restock or hide ${product.name}`,
        priority: "high" as const,
        observation: `${views.value} demo views in the ${periodText}; it is out of stock.`,
        evidenceFactIds: [views.id, stock.id],
        reasoning:
          "Visitors open a product page they cannot buy from. The views are fictional demo data, so this shows the kind of gap the analysis finds.",
        suggestedAction:
          "Restock it, or unpublish it until new stock arrives. You decide which, and how many to order.",
        relatedProductAliases: [product.alias],
      },
    ];
  });
}

/** Products need this many demo views before a low view-to-purchase rate means anything. */
export const MIN_VIEWS_FOR_RATE = 50;

/**
 * Rule 5: a product with at least 50 demo views converts views into units at less than half
 * the store's rate. An out-of-stock product is rule 4's.
 */
function reviewSlowSellers({ table, periodText }: RuleContext): DraftRecommendation[] {
  const store = findFact(table, "traffic.viewToPurchase");
  if (!store || store.number === null || store.number === 0) return [];
  const storeRate = store.number;
  return viewedProducts(table).flatMap(({ product, views }) => {
    const rate = findFact(table, `traffic.rate:${product.alias}`);
    const sold = findFact(table, `traffic.units:${product.alias}`);
    if (!rate || !sold || rate.number === null) return [];
    if ((views.number ?? 0) < MIN_VIEWS_FOR_RATE) return [];
    if (rate.number >= storeRate / 2) return [];
    if (findFact(table, `lowStock.stock:${product.alias}`)?.number === 0) return [];
    return [
      {
        title: `Review the product page and price of ${product.name}`,
        priority: "medium" as const,
        observation: `${views.value} demo views and ${units(sold)} sold in the ${periodText}: a view-to-purchase rate of ${rate.value}, against ${store.value} for the whole store.`,
        evidenceFactIds: [views.id, sold.id, rate.id, store.id],
        reasoning:
          "Many visitors look at it and few buy it. These figures cannot show why: the page, the photos, the price and the stock can each play a part. The views are fictional demo data.",
        suggestedAction:
          "Compare its page, photos and price with similar products in the store, then decide whether to change anything.",
        relatedProductAliases: [product.alias],
      },
    ];
  });
}

/** Each funnel transition, the fact keys of its two steps and the step's short name. */
const FUNNEL_TRANSITIONS = [
  { from: "traffic.sessions", to: "productViews", name: "product view" },
  { from: "funnel.productViews", to: "addToCarts", name: "add-to-cart" },
  { from: "funnel.addToCarts", to: "checkoutsStarted", name: "checkout" },
  { from: "funnel.checkoutsStarted", to: "paidOrders", name: "payment" },
] as const;

/** What the owner can look at for each funnel step that loses visitors. */
const FUNNEL_ACTIONS: Readonly<Record<(typeof FUNNEL_TRANSITIONS)[number]["to"], string>> = {
  productViews:
    "Check that the home page and the category pages lead visitors to products, then decide what to change.",
  addToCarts:
    "Check the product pages: price, photos, description and stock status, then decide what to improve.",
  checkoutsStarted:
    "Check the cart page: that the totals are clear and the way to checkout is easy to find.",
  paidOrders:
    "Walk through checkout and the demo payment as a shopper and note anything that stops you.",
};

/** Rule 6: the funnel step that loses the largest share of the step before it. */
function largestFunnelDropOff({ table, periodText }: RuleContext): DraftRecommendation[] {
  const candidates = FUNNEL_TRANSITIONS.flatMap((transition) => {
    const drop = findFact(table, `funnel.dropOff:${transition.to}`);
    const before = findFact(table, transition.from);
    const after = findFact(table, `funnel.${transition.to}`);
    if (!drop || !before || !after || drop.number === null || drop.number <= 0) return [];
    return [{ ...transition, drop, percent: drop.number, before, after }];
  });
  // The first of equal drop-offs wins: the earlier step is where visitors are lost first.
  const worst = candidates.reduce<(typeof candidates)[number] | null>(
    (best, candidate) => (best && best.percent >= candidate.percent ? best : candidate),
    null,
  );
  if (!worst) return [];
  const { before, after, drop } = worst;
  return [
    {
      title: `Look at the ${worst.name} step`,
      priority: "medium" as const,
      observation: `${before.metric}: ${before.value}; ${after.metric.toLowerCase()}: ${after.value} in the ${periodText}. A drop-off of ${drop.value}, the largest in the funnel.`,
      evidenceFactIds: [before.id, after.id, drop.id],
      reasoning:
        "This step loses the largest share of the visitors who reached the step before it. The funnel counts are fictional demo data, so treat this as a demonstration of the analysis.",
      suggestedAction: FUNNEL_ACTIONS[worst.to],
      relatedProductAliases: [],
    },
  ];
}

/** The rules each intent runs, in order; the sort keeps that order within a priority. */
const RULES_BY_INTENT: Readonly<
  Record<CopilotIntentId, ((context: RuleContext) => DraftRecommendation[])[]>
> = {
  focus: [
    restockBestSellers,
    noPaidOrders,
    restockViewedOutOfStock,
    reviewSlowSellers,
    largestFunnelDropOff,
  ],
  top_products: [noPaidOrders],
  low_stock: [restockBestSellers],
  sales_change: [noPaidOrders, salesChanged],
  traffic_sources: [],
  funnel: [largestFunnelDropOff],
  views_without_sales: [restockViewedOutOfStock, reviewSlowSellers],
};

type Summary = { text: string; factIds: string[] };

function salesSummary({ table, periodText }: RuleContext): Summary {
  const paid = findFact(table, "sales.paidOrders");
  const revenue = findFact(table, "sales.revenue");
  const placed = findFact(table, "orders.placed");
  if (!paid || !revenue || !placed) return { text: "", factIds: [] };
  return {
    text: `In the ${periodText}: paid orders ${paid.value}, revenue ${revenue.value}, orders placed ${placed.value}.`,
    factIds: [paid.id, revenue.id, placed.id],
  };
}

function bestSellersSummary({ table, periodText }: RuleContext): Summary {
  const sellers = table.products.flatMap((product) => {
    const sold = findFact(table, `top.units:${product.alias}`);
    return sold ? [{ name: product.name, sold }] : [];
  });
  if (sellers.length === 0) {
    return {
      text: `No paid orders in the ${periodText}, so there are no best sellers yet.`,
      factIds: [],
    };
  }
  const firstThree = sellers.slice(0, 3);
  return {
    text: `Best sellers in the ${periodText}: ${firstThree.map((seller) => `${seller.name} (${units(seller.sold)})`).join(", ")}.`,
    factIds: firstThree.map((seller) => seller.sold.id),
  };
}

function lowStockSummary({ table }: RuleContext): Summary {
  const total = findFact(table, "lowStock.total");
  if (!total) return { text: "", factIds: [] };
  return {
    text: `Low-stock products now: ${total.value}.`,
    factIds: [total.id],
  };
}

function changeSummary({ table, periodText }: RuleContext): Summary {
  const orders = comparison(table, "paidOrders");
  const revenue = comparison(table, "revenue");
  if (!orders || !revenue) return { text: "", factIds: [] };
  return {
    text: `The ${periodText} against the previous period: ${orders.text}; ${revenue.text}.`,
    factIds: [...orders.factIds, ...revenue.factIds],
  };
}

/** The traffic questions' answer when the period has no demo traffic rows at all. */
export function noTrafficText(periodText: string): string {
  return `No demo traffic data covers the ${periodText}.`;
}

function hasTraffic(table: FactTable): boolean {
  return Boolean(findFact(table, "traffic.sessions")?.number);
}

function trafficSourcesSummary({ table, periodText }: RuleContext): Summary {
  const total = findFact(table, "traffic.sessions");
  if (!total || !hasTraffic(table)) return { text: noTrafficText(periodText), factIds: [] };
  const sources = TRAFFIC_SOURCES.flatMap((source) => {
    const sessions = findFact(table, `traffic.sessions:${source}`);
    const share = findFact(table, `traffic.share:${source}`);
    return sessions && share ? [{ label: TRAFFIC_SOURCE_LABELS[source], sessions, share }] : [];
  }).sort((a, b) => Number(b.sessions.value) - Number(a.sessions.value));
  const list = sources
    .map((row) => `${row.label} ${row.sessions.value} (${row.share.value})`)
    .join(", ");
  return {
    text: `Demo sessions in the ${periodText}: ${total.value}. By source: ${list}.`,
    factIds: [total.id, ...sources.flatMap((row) => [row.sessions.id, row.share.id])],
  };
}

const FUNNEL_SUMMARY_KEYS = [
  "traffic.sessions",
  "funnel.productViews",
  "funnel.addToCarts",
  "funnel.checkoutsStarted",
  "funnel.paidOrders",
];

function funnelSummary({ table, periodText }: RuleContext): Summary {
  const steps = FUNNEL_SUMMARY_KEYS.flatMap((key) => {
    const fact = findFact(table, key);
    return fact ? [fact] : [];
  });
  if (!hasTraffic(table)) return { text: noTrafficText(periodText), factIds: [] };
  const chain = steps.map((fact) => `${fact.metric.toLowerCase()} ${fact.value}`).join(" → ");
  return {
    text: `The funnel in the ${periodText}: ${chain}. Paid orders come from the orders table.`,
    factIds: steps.map((fact) => fact.id),
  };
}

function mostViewedSummary({ table, periodText }: RuleContext): Summary {
  const viewed = viewedProducts(table).map(({ product, views }) => ({
    name: product.name,
    views,
    sold: findFact(table, `traffic.units:${product.alias}`),
  }));
  if (viewed.length === 0) {
    return { text: `No product has demo view data in the ${periodText}.`, factIds: [] };
  }
  const firstThree = viewed.slice(0, 3);
  const list = firstThree
    .map(({ name, views, sold }) =>
      sold
        ? `${name} (${views.value} views, ${units(sold)} sold)`
        : `${name} (${views.value} views)`,
    )
    .join(", ");
  return {
    text: `Most viewed products in the ${periodText} (demo views): ${list}.`,
    factIds: firstThree.flatMap(({ views, sold }) => (sold ? [views.id, sold.id] : [views.id])),
  };
}

/** The primary question's summary: the sales figures plus, from Phase 3, store conversion. */
function focusSummary(context: RuleContext): Summary {
  const sales = salesSummary(context);
  const conversion = findFact(context.table, "traffic.conversion");
  if (!conversion || conversion.number === null) return sales;
  return {
    text: `${sales.text} ${conversion.metric}: ${conversion.value}.`,
    factIds: [...sales.factIds, conversion.id],
  };
}

const SUMMARY_BY_INTENT: Readonly<Record<CopilotIntentId, (context: RuleContext) => Summary>> = {
  focus: focusSummary,
  top_products: bestSellersSummary,
  low_stock: lowStockSummary,
  sales_change: changeSummary,
  traffic_sources: trafficSourcesSummary,
  funnel: funnelSummary,
  views_without_sales: mostViewedSummary,
};

/**
 * Rule-based insights (Copilot spec A12, "Rule-based insights"): a complete, grounded answer
 * from the fact table alone. Every number in its text is a cited fact's display value or the
 * period length. At most 3 recommendations, high priority first; none → "No action stands out".
 */
export function buildRuleInsights(
  intent: CopilotIntentId,
  table: FactTable,
  period: MetricPeriod,
): CopilotDraft {
  const context: RuleContext = {
    table,
    periodText: METRIC_PERIOD_LABELS[period.preset].toLowerCase(),
  };
  const recommendations = RULES_BY_INTENT[intent]
    .flatMap((rule) => rule(context))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, MAX_RECOMMENDATIONS);
  const summary = SUMMARY_BY_INTENT[intent](context);
  const parts = [summary.text, recommendations.length === 0 ? NOTHING_STANDS_OUT : ""];
  return {
    summary: parts.filter((part) => part !== "").join(" "),
    summaryFactIds: summary.factIds,
    recommendations,
  };
}

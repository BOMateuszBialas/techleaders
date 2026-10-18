import {
  METRIC_DEFINITIONS,
  METRIC_PERIOD_LABELS,
  type CopilotIntentId,
  type MetricPeriod,
} from "@commerceos/core";
import { findFact, type CopilotFact, type FactTable } from "./build-facts";

/**
 * An answer before expansion: it cites fact ids and product aliases, never values or ids. Rules
 * and a model (`copilotModelOutputSchema`) produce the same shape, so one expansion step and one
 * set of grounding checks serve both.
 */
export type DraftRecommendation = {
  title: string;
  priority: "high" | "medium" | "low";
  observation: string;
  evidenceFactIds: string[];
  reasoning: string;
  suggestedAction: string;
  relatedProductAliases: string[];
  /** A model's own caveats (Phase 2); the server's limitations are added on expansion. */
  limitations?: string[];
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

const RULES_BY_INTENT: Partial<
  Record<CopilotIntentId, ((context: RuleContext) => DraftRecommendation[])[]>
> = {
  focus: [restockBestSellers, noPaidOrders],
  top_products: [noPaidOrders],
  low_stock: [restockBestSellers],
  sales_change: [noPaidOrders, salesChanged],
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

const SUMMARY_BY_INTENT: Partial<Record<CopilotIntentId, (context: RuleContext) => Summary>> = {
  focus: salesSummary,
  top_products: bestSellersSummary,
  low_stock: lowStockSummary,
  sales_change: changeSummary,
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
  const recommendations = (RULES_BY_INTENT[intent] ?? [])
    .flatMap((rule) => rule(context))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, MAX_RECOMMENDATIONS);
  const summary = SUMMARY_BY_INTENT[intent]?.(context) ?? { text: "", factIds: [] };
  const parts = [summary.text, recommendations.length === 0 ? NOTHING_STANDS_OUT : ""];
  return {
    summary: parts.filter((part) => part !== "").join(" "),
    summaryFactIds: summary.factIds,
    recommendations,
  };
}

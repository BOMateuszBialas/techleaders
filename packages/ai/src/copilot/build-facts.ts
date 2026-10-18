import {
  DEMO_TRAFFIC_METRIC_IDS,
  METRIC_DEFINITIONS,
  METRIC_IDS,
  METRIC_PERIOD_LABELS,
  formatMoney,
  money,
  type CurrencyCode,
  type LowStockProducts,
  type MetricDefinition,
  type MetricId,
  type MetricPeriod,
  type MetricPeriodPreset,
  type OrderSummary,
  type SalesSummary,
  type TopProducts,
  type TrafficSource,
  type TrafficSummary,
} from "@commerceos/core";

/** What the intent's tool plan returned (Copilot spec, "Intent tool plans"). */
export type CopilotToolResults = {
  sales?: SalesSummary;
  orders?: OrderSummary;
  topProducts?: TopProducts;
  lowStock?: LowStockProducts;
  /** The same tools for the previous period of the same length (`sales_change`, A8). */
  previousSales?: SalesSummary;
  previousTopProducts?: TopProducts;
  /** Fictional demo traffic (`getTrafficSummary`, D08); every fact from it is flagged `demo`. */
  traffic?: TrafficSummary;
};

/**
 * One numbered fact (Copilot spec, step 4). Evidence and every number shown come from these,
 * never from free text: a rule or a model cites `id`, the server expands it.
 */
export type CopilotFact = {
  /** `f1`, `f2`, … in table order. */
  id: string;
  /** Stable meaning, for rules and tests: `sales.paidOrders`, `top.units:p1`, … */
  key: string;
  /** Owner-facing metric name. */
  metric: string;
  /** Display value: "29", "9 847,00 zł", "+25%", "Not enough data". */
  value: string;
  /** The value as a number (money in whole currency units), `null` for "Not enough data". */
  number: number | null;
  /**
   * The unrounded ratio behind a rate fact (0.0153 for "1.5%"), for the rules' comparisons
   * (#63); absent on other facts and on "Not enough data". Never sent to the model.
   */
  ratio?: number;
  /** "Last 7 days (11–17 Oct 2026)", "Previous 7 days (4–10 Oct 2026)", "Now", … */
  period: string;
  /** "<tool> · <definition id>". */
  source: string;
  definitionId: MetricId;
  /** Fictional demo data (traffic, D08); false for order and stock facts. */
  demo: boolean;
  productAlias?: string;
};

/** A product the facts mention, under a short alias (`p1`, …) so its id never leaves the server. */
export type CopilotProduct = { alias: string; id: string | null; name: string; sku: string | null };

export type FactTable = { facts: CopilotFact[]; products: CopilotProduct[] };

export const NOT_ENOUGH_DATA = "Not enough data";
export const NOW = "Now";

const PREVIOUS_LABELS: Readonly<Record<MetricPeriodPreset, string>> = {
  "7d": "Previous 7 days",
  "30d": "Previous 30 days",
};

export function currentPeriodText(period: MetricPeriod): string {
  return `${METRIC_PERIOD_LABELS[period.preset]} (${period.label})`;
}

export function previousPeriodText(period: MetricPeriod): string {
  return `${PREVIOUS_LABELS[period.preset]} (${period.label})`;
}

function comparisonText(period: MetricPeriod): string {
  return `${METRIC_PERIOD_LABELS[period.preset]} vs ${PREVIOUS_LABELS[period.preset].toLowerCase()}`;
}

function amount(amountMinor: number, currency: CurrencyCode): string {
  return formatMoney(money(amountMinor, currency));
}

function signed(text: string, delta: number): string {
  if (delta > 0) return `+${text}`;
  if (delta < 0) return `-${text}`;
  return text;
}

/** Whole percent of the change, `null` when the previous value is 0 (no base to compare). */
function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

class FactTableBuilder {
  private readonly facts: CopilotFact[] = [];
  private readonly products = new Map<string, CopilotProduct>();

  add(fact: Omit<CopilotFact, "id" | "demo"> & { demo?: boolean }): void {
    this.facts.push({ ...fact, id: `f${this.facts.length + 1}`, demo: fact.demo ?? false });
  }

  /** The alias of a product, created on first sight; a deleted product is keyed by its name. */
  alias(id: string | null, name: string, sku: string | null = null): string {
    const key = id === null ? `deleted:${name}` : `id:${id}`;
    const known = this.products.get(key);
    if (known) {
      known.sku ??= sku;
      return known.alias;
    }
    const product = { alias: `p${this.products.size + 1}`, id, name, sku };
    this.products.set(key, product);
    return product.alias;
  }

  build(): FactTable {
    return { facts: this.facts, products: [...this.products.values()] };
  }
}

function addSales(
  table: FactTableBuilder,
  sales: SalesSummary,
  prefix: string,
  period: string,
): void {
  const source = "getSalesSummary";
  table.add({
    key: `${prefix}sales.paidOrders`,
    metric: METRIC_DEFINITIONS.paidOrders.label,
    value: String(sales.paidOrders),
    number: sales.paidOrders,
    period,
    source: `${source} · paidOrders`,
    definitionId: "paidOrders",
  });
  table.add({
    key: `${prefix}sales.revenue`,
    metric: METRIC_DEFINITIONS.revenue.label,
    value: amount(sales.revenueMinor, sales.currency),
    number: sales.revenueMinor / 100,
    period,
    source: `${source} · revenue`,
    definitionId: "revenue",
  });
  table.add({
    key: `${prefix}sales.aov`,
    metric: METRIC_DEFINITIONS.aov.label,
    value: sales.aovMinor === null ? NOT_ENOUGH_DATA : amount(sales.aovMinor, sales.currency),
    number: sales.aovMinor === null ? null : sales.aovMinor / 100,
    period,
    source: `${source} · aov`,
    definitionId: "aov",
  });
}

function addTopProducts(
  table: FactTableBuilder,
  top: TopProducts,
  prefix: string,
  period: string,
): void {
  for (const row of top.rows) {
    const productAlias = table.alias(row.productId, row.name);
    table.add({
      key: `${prefix}top.units:${productAlias}`,
      metric: `Units sold: ${row.name}`,
      value: String(row.units),
      number: row.units,
      period,
      source: "getTopProducts · topProducts",
      definitionId: "topProducts",
      productAlias,
    });
    table.add({
      key: `${prefix}top.revenue:${productAlias}`,
      metric: `Revenue: ${row.name}`,
      value: amount(row.revenueMinor, top.currency),
      number: row.revenueMinor / 100,
      period,
      source: "getTopProducts · topProducts",
      definitionId: "topProducts",
      productAlias,
    });
  }
}

function addLowStock(table: FactTableBuilder, low: LowStockProducts): void {
  table.add({
    key: "lowStock.total",
    metric: `Products at or below ${low.threshold} in stock`,
    value: String(low.total),
    number: low.total,
    period: NOW,
    source: "getLowStockProducts · lowStock",
    definitionId: "lowStock",
  });
  for (const row of low.rows) {
    const productAlias = table.alias(row.id, row.name, row.sku);
    table.add({
      key: `lowStock.stock:${productAlias}`,
      metric: `Stock: ${row.name}`,
      value: String(row.stockQuantity),
      number: row.stockQuantity,
      period: NOW,
      source: "getLowStockProducts · lowStock",
      definitionId: "lowStock",
      productAlias,
    });
  }
}

/** Absolute and percentage change of paid orders and revenue (derived facts, A8). */
function addChanges(table: FactTableBuilder, current: SalesSummary, previous: SalesSummary): void {
  const period = comparisonText(current.period);
  const source = "getSalesSummary, both periods";
  const pairs = [
    {
      id: "paidOrders" as const,
      now: current.paidOrders,
      before: previous.paidOrders,
      text: (n: number) => String(n),
      unit: 1,
    },
    {
      id: "revenue" as const,
      now: current.revenueMinor,
      before: previous.revenueMinor,
      text: (n: number) => amount(n, current.currency),
      unit: 100,
    },
  ];
  for (const pair of pairs) {
    const label = METRIC_DEFINITIONS[pair.id].label;
    const delta = pair.now - pair.before;
    table.add({
      key: `change.${pair.id}`,
      metric: `Change in ${label.toLowerCase()}`,
      value: signed(pair.text(Math.abs(delta)), delta),
      number: delta / pair.unit,
      period,
      source: `${source} · ${pair.id}`,
      definitionId: pair.id,
    });
    const percent = percentChange(pair.now, pair.before);
    table.add({
      key: `change.${pair.id}.percent`,
      metric: `Change in ${label.toLowerCase()} (%)`,
      value: percent === null ? NOT_ENOUGH_DATA : signed(`${Math.abs(percent)}%`, percent),
      number: percent,
      period,
      source: `${source} · ${pair.id}`,
      definitionId: pair.id,
    });
  }
}

/** Owner-facing names of the demo traffic sources. */
export const TRAFFIC_SOURCE_LABELS: Readonly<Record<TrafficSource, string>> = {
  direct: "Direct",
  organic: "Organic search",
  social: "Social",
  email: "Email",
  paid: "Paid ads",
};

/** The funnel steps in order: the first is all sessions, the last paid orders (real orders). */
export const FUNNEL_STEPS = [
  "sessions",
  "productViews",
  "addToCarts",
  "checkoutsStarted",
  "paidOrders",
] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

/** How a funnel step is named in fact metrics and rule text. */
export const FUNNEL_STEP_LABELS: Readonly<Record<FunnelStep, string>> = {
  sessions: "Sessions",
  productViews: "Product views",
  addToCarts: "Add-to-carts",
  checkoutsStarted: "Checkouts started",
  paidOrders: "Paid orders",
};

/** A ratio as a percentage with at most one decimal: 0.0153 → "1.5%", 0.25 → "25%". */
function percentOf(ratio: number): { text: string; number: number } {
  const number = Math.round(ratio * 1000) / 10;
  return { text: `${number}%`, number };
}

/**
 * A rate fact's value: its percentage plus the unrounded ratio, or "Not enough data" when the
 * rate is `null`.
 */
function rateValue(ratio: number | null): Pick<CopilotFact, "value" | "number" | "ratio"> {
  if (ratio === null) return { value: NOT_ENOUGH_DATA, number: null };
  const { text, number } = percentOf(ratio);
  return { value: text, number, ratio };
}

/**
 * Demo traffic facts (Copilot spec, Phase 3): sessions and their share per source, the funnel
 * with each step's drop-off, store conversion, and per product views, units sold and the
 * view-to-purchase rate. Every fact computed from demo figures is flagged `demo`; units and
 * paid orders come from real orders and are not.
 */
function addTraffic(table: FactTableBuilder, traffic: TrafficSummary): void {
  const period = currentPeriodText(traffic.period);
  const tool = "getTrafficSummary";
  const demo = { period, demo: true } as const;
  const total = traffic.sessions.total;

  table.add({
    ...demo,
    key: "traffic.sessions",
    metric: METRIC_DEFINITIONS.sessionsDemo.label,
    value: String(total),
    number: total,
    source: `${tool} · sessionsDemo`,
    definitionId: "sessionsDemo",
  });
  // Busiest source first; a source without sessions says nothing.
  const sources = traffic.sessions.bySource
    .filter((row) => row.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions);
  for (const row of sources) {
    const label = TRAFFIC_SOURCE_LABELS[row.source];
    table.add({
      ...demo,
      key: `traffic.sessions:${row.source}`,
      metric: `Sessions (demo): ${label}`,
      value: String(row.sessions),
      number: row.sessions,
      source: `${tool} · sessionsDemo`,
      definitionId: "sessionsDemo",
    });
    const share = percentOf(row.sessions / total);
    table.add({
      ...demo,
      key: `traffic.share:${row.source}`,
      metric: `Share of sessions (demo): ${label}`,
      value: share.text,
      number: share.number,
      source: `${tool} · sessionsDemo`,
      definitionId: "sessionsDemo",
    });
  }

  const counts: Record<FunnelStep, number> = { ...traffic.funnel, sessions: total };
  for (const step of FUNNEL_STEPS.slice(1)) {
    const real = step === "paidOrders";
    table.add({
      period,
      demo: !real,
      key: `funnel.${step}`,
      metric: real ? METRIC_DEFINITIONS.paidOrders.label : `${FUNNEL_STEP_LABELS[step]} (demo)`,
      value: String(counts[step]),
      number: counts[step],
      source: `${tool} · ${real ? "paidOrders" : "funnelDemo"}`,
      definitionId: real ? "paidOrders" : "funnelDemo",
    });
  }
  let before = counts.sessions;
  for (const step of FUNNEL_STEPS.slice(1)) {
    const base = before;
    before = counts[step];
    if (base === 0) continue; // No base: no drop-off to state.
    const drop = percentOf(1 - counts[step] / base);
    table.add({
      ...demo,
      key: `funnel.dropOff:${step}`,
      metric: `Drop-off before ${FUNNEL_STEP_LABELS[step].toLowerCase()} (demo)`,
      value: drop.text,
      number: drop.number,
      source: `${tool} · funnelDemo`,
      definitionId: "funnelDemo",
    });
  }

  table.add({
    ...demo,
    key: "traffic.conversion",
    metric: METRIC_DEFINITIONS.storeConversionDemo.label,
    ...rateValue(traffic.storeConversion),
    source: `${tool} · storeConversionDemo`,
    definitionId: "storeConversionDemo",
  });
  table.add({
    ...demo,
    key: "traffic.viewToPurchase",
    metric: "View-to-purchase rate (demo): whole store",
    ...rateValue(traffic.viewToPurchaseRate),
    source: `${tool} · viewToPurchaseRateDemo`,
    definitionId: "viewToPurchaseRateDemo",
  });
  if (traffic.productsWithoutViewData > 0) {
    table.add({
      ...demo,
      key: "traffic.withoutViewData",
      metric: "Published products without demo view data",
      value: String(traffic.productsWithoutViewData),
      number: traffic.productsWithoutViewData,
      source: `${tool} · viewToPurchaseRateDemo`,
      definitionId: "viewToPurchaseRateDemo",
    });
  }

  for (const product of traffic.products) {
    const productAlias = table.alias(product.productId, product.name);
    table.add({
      ...demo,
      key: `traffic.views:${productAlias}`,
      metric: `Views (demo): ${product.name}`,
      value: String(product.views),
      number: product.views,
      source: `${tool} · viewToPurchaseRateDemo`,
      definitionId: "viewToPurchaseRateDemo",
      productAlias,
    });
    // Unknown units (a full ranking) and missing rates are left out, never shown as 0.
    if (product.unitsSold !== null) {
      table.add({
        period,
        key: `traffic.units:${productAlias}`,
        metric: `Units sold: ${product.name}`,
        value: String(product.unitsSold),
        number: product.unitsSold,
        source: `${tool} · topProducts`,
        definitionId: "topProducts",
        productAlias,
      });
    }
    if (product.viewToPurchaseRate !== null) {
      table.add({
        ...demo,
        key: `traffic.rate:${productAlias}`,
        metric: `View-to-purchase rate (demo): ${product.name}`,
        ...rateValue(product.viewToPurchaseRate),
        source: `${tool} · viewToPurchaseRateDemo`,
        definitionId: "viewToPurchaseRateDemo",
        productAlias,
      });
    }
  }
}

/**
 * Flattens tool results into the numbered fact table plus derived facts (Copilot spec, step 4).
 * Values are formatted once here, so rules, a model and the UI all quote the same strings.
 */
export function buildFacts(results: CopilotToolResults): FactTable {
  const table = new FactTableBuilder();
  const { sales, orders, topProducts, lowStock, previousSales, previousTopProducts } = results;

  if (sales) addSales(table, sales, "", currentPeriodText(sales.period));
  if (orders) {
    table.add({
      key: "orders.placed",
      metric: METRIC_DEFINITIONS.ordersPlaced.label,
      value: String(orders.total),
      number: orders.total,
      period: currentPeriodText(orders.period),
      source: "getOrderSummary · ordersPlaced",
      definitionId: "ordersPlaced",
    });
  }
  if (topProducts) addTopProducts(table, topProducts, "", currentPeriodText(topProducts.period));
  if (lowStock) addLowStock(table, lowStock);
  if (previousSales) {
    addSales(table, previousSales, "previous.", previousPeriodText(previousSales.period));
  }
  if (previousTopProducts) {
    addTopProducts(
      table,
      previousTopProducts,
      "previous.",
      previousPeriodText(previousTopProducts.period),
    );
  }
  if (sales && previousSales) addChanges(table, sales, previousSales);
  if (results.traffic) addTraffic(table, results.traffic);
  return table.build();
}

export function findFact(table: FactTable, key: string): CopilotFact | undefined {
  return table.facts.find((fact) => fact.key === key);
}

/** The `METRIC_DEFINITIONS` the facts follow: the dashboard's order, then the demo ones. */
export function definitionsOf(table: FactTable): MetricDefinition[] {
  const used = new Set(table.facts.map((fact) => fact.definitionId));
  return [...METRIC_IDS, ...DEMO_TRAFFIC_METRIC_IDS]
    .filter((id) => used.has(id))
    .map((id) => METRIC_DEFINITIONS[id]);
}

/**
 * The fact and product tables as a model would receive them (A3): aliases instead of product
 * ids, no customer field (the E04 DTOs hold none), every name a JSON string value.
 */
export function serializeFactContext(table: FactTable): string {
  return JSON.stringify({
    facts: table.facts.map((fact) => ({
      id: fact.id,
      metric: fact.metric,
      value: fact.value,
      period: fact.period,
      source: fact.source,
      demo: fact.demo,
      ...(fact.productAlias ? { product: fact.productAlias } : {}),
    })),
    products: table.products.map((product) => ({
      alias: product.alias,
      name: product.name,
      sku: product.sku,
    })),
  });
}

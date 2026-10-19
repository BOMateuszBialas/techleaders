import type { CurrencyCode } from "../money";
import type { OrderStatus } from "../orders/order";

/**
 * Store metric definitions (orders spec A8, confirmed by the product owner on 2026-10-16;
 * MVP spec §6 "Analytics definitions", product rule R05). This is the one source of truth: the
 * SQL in `DatabaseStoreMetrics` implements exactly these rules, the dashboard prints the text
 * next to each number, and the Copilot tools (E05) will quote it. Changing a definition is a
 * coordinated change of this file, the SQL, the README and the Copilot eval cases.
 */

/** A paid order is one whose status is still one of these (cancelled and refunded are not). */
export const PAID_ORDER_STATUSES = [
  "paid",
  "processing",
  "shipped",
] as const satisfies readonly OrderStatus[];

/** Metrics cover the store currency only; orders in other currencies are counted apart (A10). */
export const STORE_CURRENCY: CurrencyCode = "PLN";

/** Published products at or below this stock count as low stock (A11). */
export const LOW_STOCK_THRESHOLD = 5;

/** How many products the "Top products" metric ranks (A8). */
export const TOP_PRODUCTS_LIMIT = 5;

export const METRIC_IDS = [
  "ordersPlaced",
  "paidOrders",
  "revenue",
  "aov",
  "topProducts",
  "lowStock",
] as const;

/**
 * Definitions of the fictional demo traffic figures (decision D08, MVP spec §6, Copilot spec
 * Phase 3). Only the Copilot's `getTrafficSummary` reports them; the dashboard does not, so
 * they are kept apart from the store metrics in `METRIC_IDS`.
 */
export const DEMO_TRAFFIC_METRIC_IDS = [
  "sessionsDemo",
  "funnelDemo",
  "storeConversionDemo",
  "viewToPurchaseRateDemo",
] as const;

export type MetricId = (typeof METRIC_IDS)[number] | (typeof DEMO_TRAFFIC_METRIC_IDS)[number];

export type MetricDefinition = { id: MetricId; label: string; definition: string };

/** The A8 wording, with column names written as plain words for the owner. */
export const METRIC_DEFINITIONS: Readonly<Record<MetricId, MetricDefinition>> = {
  ordersPlaced: {
    id: "ordersPlaced",
    label: "Orders placed",
    definition:
      "Orders created in the period, in any status and any currency, split by their current status.",
  },
  paidOrders: {
    id: "paidOrders",
    label: "Paid orders",
    definition: `Orders in ${STORE_CURRENCY} with a payment date inside the period and a status of paid, processing or shipped.`,
  },
  revenue: {
    id: "revenue",
    label: "Revenue from paid orders",
    definition:
      "Sum of the totals of paid orders (shipping included, it is always 0; no tax exists). Cancelled and refunded orders are excluded, also when they were once paid, so marking an order refunded lowers the revenue of the period it was paid in.",
  },
  aov: {
    id: "aov",
    label: "Average order value",
    definition:
      'Revenue ÷ paid orders, rounded half up to a whole grosz; "Not enough data" when there are no paid orders.',
  },
  topProducts: {
    id: "topProducts",
    label: "Top products",
    definition: `Line items of paid orders in the period, ranked by units, then revenue, then name; top ${TOP_PRODUCTS_LIMIT}.`,
  },
  lowStock: {
    id: "lowStock",
    label: "Low stock",
    definition: `Published products with ${LOW_STOCK_THRESHOLD} or fewer in stock now, out-of-stock included.`,
  },
  sessionsDemo: {
    id: "sessionsDemo",
    label: "Sessions (demo)",
    definition:
      "Fictional seeded visits per day and traffic source; not measured from real visitors.",
  },
  funnelDemo: {
    id: "funnelDemo",
    label: "Funnel (demo)",
    definition:
      "Demo sessions → product views → add-to-cart → checkout started, then paid orders from the orders table. A step's drop-off is the share of the step before it that did not reach it.",
  },
  storeConversionDemo: {
    id: "storeConversionDemo",
    label: "Store conversion rate (demo)",
    definition:
      'Paid orders divided by demo sessions over the same days; "Not enough data" when there are no sessions. It is not computed per source, because orders carry no traffic source.',
  },
  viewToPurchaseRateDemo: {
    id: "viewToPurchaseRateDemo",
    label: "Product view-to-purchase rate (demo)",
    definition:
      "Units of the product in paid orders divided by its demo views over the same days; no rate for a product without demo view data. The store's rate divides all units in paid orders by all demo product views.",
  },
};

/**
 * How the dashboard compares a period with the one before it (date-range spec A12). Printed
 * once on the dashboard and mirrored in the README; it adds no metric, it explains the change
 * shown beside four of them.
 */
export const PERIOD_COMPARISON_DEFINITION =
  "Each figure is compared with the previous period of the same number of days, which ends the day before this one starts. The change is this period minus the previous one; the percentage is the change divided by the previous value, rounded to a whole percent, and is not shown when the previous value is 0 or when the store has no order before the previous period starts. A period that ends today includes only part of today. Top products and low stock are not compared. A change between two periods does not show what caused it.";

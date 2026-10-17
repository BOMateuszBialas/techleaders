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
export type MetricId = (typeof METRIC_IDS)[number];

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
};

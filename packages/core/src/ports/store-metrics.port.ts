import type { CurrencyCode } from "../domain/money";

/** A half-open `[from, to)` range of instants. */
export type MetricRange = { from: Date; to: Date };

/** Paid orders in the range (by `paid_at`, status paid/processing/shipped), see A8. */
export type SalesAggregate = {
  paidOrders: number;
  revenueMinor: number;
  /** Paid orders in the same range in another currency: not in the two figures above (A10). */
  otherCurrencyOrders: number;
};

/** Orders created in the range with this current status; statuses without orders are absent. */
export type OrderStatusCount = { status: string; count: number };

/** One ranked product; `productId` is null for a deleted product (grouped by snapshot name). */
export type TopProductAggregate = {
  productId: string | null;
  name: string;
  units: number;
  revenueMinor: number;
};

export type LowStockRow = { id: string; name: string; sku: string | null; stockQuantity: number };

/** The first `limit` low-stock products and how many there are in total. */
export type LowStockAggregate = { total: number; rows: LowStockRow[] };

/**
 * Raw store aggregates for the metric use cases (orders spec, "Metric queries"), implemented
 * with aggregate SQL by the database package. No wording and no customer fields: the use cases
 * attach the definitions, and nothing personal can reach the dashboard or the Copilot.
 */
export interface StoreMetricsPort {
  salesSummary(range: MetricRange, currency: CurrencyCode): Promise<SalesAggregate>;
  orderSummary(range: MetricRange): Promise<OrderStatusCount[]>;
  topProducts(
    range: MetricRange,
    currency: CurrencyCode,
    limit: number,
  ): Promise<TopProductAggregate[]>;
  lowStockProducts(threshold: number, limit: number): Promise<LowStockAggregate>;
  /** Seeded demo orders (`DEMO-` references) placed or paid in the range, any status (A14). */
  demoOrderCount(range: MetricRange): Promise<number>;
}

import { STORE_CURRENCY, type MetricId } from "../../domain/metrics/metric-definitions";
import { averageOrderValue, type MetricPeriod } from "../../domain/metrics/metric-period";
import type { CurrencyCode } from "../../domain/money";
import type { StoreMetricsPort } from "../../ports/store-metrics.port";

export type SalesSummary = {
  period: MetricPeriod;
  currency: CurrencyCode;
  /** The `METRIC_DEFINITIONS` entries these figures follow. */
  definitionIds: MetricId[];
  paidOrders: number;
  revenueMinor: number;
  /** `null` when there are no paid orders: "Not enough data". */
  aovMinor: number | null;
  /** Paid orders in another currency, left out of the figures above (A10). */
  otherCurrencyOrders: number;
};

/**
 * Paid orders, revenue from paid orders and AOV in the store currency for a period (orders spec
 * A8). The Copilot tool `getSalesSummary` (E05) calls this use case unchanged.
 */
export class GetSalesSummaryUseCase {
  constructor(private readonly deps: { storeMetrics: StoreMetricsPort }) {}

  async execute(input: { period: MetricPeriod }): Promise<SalesSummary> {
    const sales = await this.deps.storeMetrics.salesSummary(input.period, STORE_CURRENCY);
    return {
      period: input.period,
      currency: STORE_CURRENCY,
      definitionIds: ["paidOrders", "revenue", "aov"],
      paidOrders: sales.paidOrders,
      revenueMinor: sales.revenueMinor,
      aovMinor: averageOrderValue(sales.revenueMinor, sales.paidOrders),
      otherCurrencyOrders: sales.otherCurrencyOrders,
    };
  }
}

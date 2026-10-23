import { STORE_CURRENCY, type MetricId } from "../../domain/metrics/metric-definitions";
import type { LabelledMetricRange, MetricPeriod } from "../../domain/metrics/metric-period";
import type { CurrencyCode } from "../../domain/money";
import type { StoreMetricsPort, TopProductAggregate } from "../../ports/store-metrics.port";
import { topProductsQuerySchema } from "../../validators/metrics/metric-query.schema";
import { parseInput } from "../../validators/parse-input";

export type TopProducts<P extends LabelledMetricRange = MetricPeriod> = {
  period: P;
  currency: CurrencyCode;
  definitionIds: MetricId[];
  limit: number;
  /** Ranked by units, then revenue, then name; `productId` is null for a deleted product. */
  rows: TopProductAggregate[];
};

/**
 * The best-selling products of a period in paid store-currency orders (orders spec A8). The
 * Copilot tool `getTopProducts` (E05) calls this use case unchanged; `limit` is validated
 * (1–50, default 5).
 */
export class GetTopProductsUseCase {
  constructor(private readonly deps: { storeMetrics: StoreMetricsPort }) {}

  async execute<P extends LabelledMetricRange>(input: {
    period: P;
    limit?: unknown;
  }): Promise<TopProducts<P>> {
    const { limit } = parseInput(topProductsQuerySchema, { limit: input.limit });
    const rows = await this.deps.storeMetrics.topProducts(input.period, STORE_CURRENCY, limit);
    return {
      period: input.period,
      currency: STORE_CURRENCY,
      definitionIds: ["topProducts"],
      limit,
      rows,
    };
  }
}

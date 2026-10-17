import type { MetricId } from "../../domain/metrics/metric-definitions";
import type { LowStockRow, StoreMetricsPort } from "../../ports/store-metrics.port";
import { lowStockQuerySchema } from "../../validators/metrics/metric-query.schema";
import { parseInput } from "../../validators/parse-input";

export type LowStockProducts = {
  definitionIds: MetricId[];
  threshold: number;
  /** Every published product at or below the threshold now. */
  total: number;
  /** The first `limit` of them, lowest stock first, then by name. */
  rows: LowStockRow[];
};

/**
 * Published products at or below a stock threshold now (orders spec A8, A11). The Copilot tool
 * `getLowStockProducts` (E05) calls this use case unchanged and may pass its own threshold
 * (1–1000, default 5).
 */
export class GetLowStockProductsUseCase {
  constructor(private readonly deps: { storeMetrics: StoreMetricsPort }) {}

  async execute(input: { threshold?: unknown; limit?: unknown } = {}): Promise<LowStockProducts> {
    const { threshold, limit } = parseInput(lowStockQuerySchema, {
      threshold: input.threshold,
      limit: input.limit,
    });
    const low = await this.deps.storeMetrics.lowStockProducts(threshold, limit);
    return { definitionIds: ["lowStock"], threshold, total: low.total, rows: low.rows };
  }
}

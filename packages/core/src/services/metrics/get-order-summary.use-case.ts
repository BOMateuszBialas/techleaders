import type { MetricId } from "../../domain/metrics/metric-definitions";
import type { MetricPeriod } from "../../domain/metrics/metric-period";
import { ORDER_STATUSES, type OrderStatus } from "../../domain/orders/order";
import type { StoreMetricsPort } from "../../ports/store-metrics.port";

export type OrderStatusCountRow = { status: OrderStatus; count: number };

export type OrderSummary = {
  period: MetricPeriod;
  definitionIds: MetricId[];
  /** Orders created in the period, any status and any currency. */
  total: number;
  /** Every status in workflow order, zeros included. */
  byStatus: OrderStatusCountRow[];
};

/**
 * Orders placed in a period, split by their current status (orders spec A8). The Copilot tool
 * `getOrderSummary` (E05) calls this use case unchanged.
 */
export class GetOrderSummaryUseCase {
  constructor(private readonly deps: { storeMetrics: StoreMetricsPort }) {}

  async execute(input: { period: MetricPeriod }): Promise<OrderSummary> {
    const rows = await this.deps.storeMetrics.orderSummary(input.period);
    const countOf = (status: OrderStatus) =>
      rows.reduce((sum, row) => (row.status === status ? sum + row.count : sum), 0);
    return {
      period: input.period,
      definitionIds: ["ordersPlaced"],
      total: rows.reduce((sum, row) => sum + row.count, 0),
      byStatus: ORDER_STATUSES.map((status) => ({ status, count: countOf(status) })),
    };
  }
}

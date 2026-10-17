import {
  METRIC_DEFINITIONS,
  type MetricDefinition,
  type MetricId,
} from "../../domain/metrics/metric-definitions";
import { resolvePeriod, type Clock, type MetricPeriod } from "../../domain/metrics/metric-period";
import type { StoreMetricsPort } from "../../ports/store-metrics.port";
import { parseMetricPeriod } from "../../validators/metrics/metric-query.schema";
import type {
  GetLowStockProductsUseCase,
  LowStockProducts,
} from "./get-low-stock-products.use-case";
import type { GetOrderSummaryUseCase, OrderSummary } from "./get-order-summary.use-case";
import type { GetSalesSummaryUseCase, SalesSummary } from "./get-sales-summary.use-case";
import type { GetTopProductsUseCase, TopProducts } from "./get-top-products.use-case";

export type Dashboard = {
  period: MetricPeriod;
  sales: SalesSummary;
  orders: OrderSummary;
  topProducts: TopProducts;
  lowStock: LowStockProducts;
  /** Seeded demo orders placed or paid in the period (A14); the UI says they are included. */
  demoOrderCount: number;
  definitions: Readonly<Record<MetricId, MetricDefinition>>;
};

export type GetDashboardDeps = {
  clock: Clock;
  storeMetrics: StoreMetricsPort;
  getSalesSummaryUseCase: GetSalesSummaryUseCase;
  getOrderSummaryUseCase: GetOrderSummaryUseCase;
  getTopProductsUseCase: GetTopProductsUseCase;
  getLowStockProductsUseCase: GetLowStockProductsUseCase;
};

/**
 * The admin dashboard (orders spec, Phase 3): resolves the period once from the clock, then
 * runs the four metric use cases in parallel, so the dashboard and the Copilot tools can never
 * disagree. `period` is untrusted (`?period=`); anything unknown means "Last 7 days".
 */
export class GetDashboardUseCase {
  constructor(private readonly deps: GetDashboardDeps) {}

  async execute(input: { period?: unknown } = {}): Promise<Dashboard> {
    const period = resolvePeriod(parseMetricPeriod(input.period), this.deps.clock());
    const [sales, orders, topProducts, lowStock, demoOrderCount] = await Promise.all([
      this.deps.getSalesSummaryUseCase.execute({ period }),
      this.deps.getOrderSummaryUseCase.execute({ period }),
      this.deps.getTopProductsUseCase.execute({ period }),
      this.deps.getLowStockProductsUseCase.execute(),
      this.deps.storeMetrics.demoOrderCount(period),
    ]);
    return {
      period,
      sales,
      orders,
      topProducts,
      lowStock,
      demoOrderCount,
      definitions: METRIC_DEFINITIONS,
    };
  }
}

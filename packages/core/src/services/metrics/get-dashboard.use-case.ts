import { aovChange, metricChange, type MetricChange } from "../../domain/metrics/metric-change";
import {
  METRIC_DEFINITIONS,
  PERIOD_COMPARISON_DEFINITION,
  type MetricDefinition,
  type MetricId,
} from "../../domain/metrics/metric-definitions";
import {
  periodCalendarDays,
  previousRange,
  resolveCustomPeriod,
  resolvePeriod,
  storeToday,
  type Clock,
  type DashboardPeriod,
} from "../../domain/metrics/metric-period";
import type { StoreMetricsPort } from "../../ports/store-metrics.port";
import {
  MIN_DASHBOARD_DAY,
  parseDashboardRange,
} from "../../validators/metrics/dashboard-range.schema";
import type {
  GetLowStockProductsUseCase,
  LowStockProducts,
} from "./get-low-stock-products.use-case";
import type { GetOrderSummaryUseCase, OrderSummary } from "./get-order-summary.use-case";
import type { GetSalesSummaryUseCase, SalesSummary } from "./get-sales-summary.use-case";
import type { GetTopProductsUseCase, TopProducts } from "./get-top-products.use-case";

export type DashboardChanges = {
  ordersPlaced: MetricChange;
  paidOrders: MetricChange;
  revenue: MetricChange;
  /** `null` when either period has no paid orders: "Not enough data to compare". */
  aov: MetricChange | null;
};

/** The previous period of the same length and the changes against it (date-range spec). */
export type DashboardComparison = {
  period: DashboardPeriod;
  sales: SalesSummary<DashboardPeriod>;
  orders: OrderSummary<DashboardPeriod>;
  demoOrderCount: number;
  changes: DashboardChanges;
  /** No order exists before the comparison period starts (A9): percentages are withheld. */
  partialHistory: boolean;
  /** The selected period ends today, which is not over yet (A13). */
  includesToday: boolean;
};

export type Dashboard = {
  period: DashboardPeriod;
  /** The range form's values: the shown days, and the allowed bounds (store time zone). */
  range: { firstDay: string; lastDay: string; minDay: string; maxDay: string };
  /** An invalid custom range the dashboard fell back from, with the submitted values. */
  rangeError: { message: string; from: string; to: string } | null;
  sales: SalesSummary<DashboardPeriod>;
  orders: OrderSummary<DashboardPeriod>;
  topProducts: TopProducts<DashboardPeriod>;
  lowStock: LowStockProducts;
  /** Seeded demo orders placed or paid in the period (A14); the UI says they are included. */
  demoOrderCount: number;
  comparison: DashboardComparison;
  definitions: Readonly<Record<MetricId, MetricDefinition>>;
  comparisonDefinition: string;
};

export type GetDashboardDeps = {
  clock: Clock;
  storeMetrics: StoreMetricsPort;
  getSalesSummaryUseCase: GetSalesSummaryUseCase;
  getOrderSummaryUseCase: GetOrderSummaryUseCase;
  getTopProductsUseCase: GetTopProductsUseCase;
  getLowStockProductsUseCase: GetLowStockProductsUseCase;
};

/** Any order in the period: placed in it, or paid in it. */
function hasOrders(sales: SalesSummary<DashboardPeriod>, orders: OrderSummary<DashboardPeriod>) {
  return orders.total > 0 || sales.paidOrders > 0;
}

/**
 * The admin dashboard (orders spec Phase 3, date-range spec): resolves the period once from the
 * clock (a preset, or a validated custom range), then runs the metric use cases for it and for
 * the previous period of the same length, so the dashboard and the Copilot tools can never
 * disagree. Every input is an untrusted search parameter; an invalid range falls back to the
 * preset and is reported, never thrown.
 */
export class GetDashboardUseCase {
  constructor(private readonly deps: GetDashboardDeps) {}

  async execute(
    input: { period?: unknown; from?: unknown; to?: unknown } = {},
  ): Promise<Dashboard> {
    const now = this.deps.clock();
    const today = storeToday(now);
    const selection = parseDashboardRange(input, today);
    const period: DashboardPeriod =
      selection.kind === "custom"
        ? resolveCustomPeriod(selection.firstDay, selection.lastDay)
        : resolvePeriod(selection.kind === "preset" ? selection.preset : selection.fallback, now);
    const previous = previousRange(period);
    // Everything before the comparison period: is there any order at all? (A9)
    const before: DashboardPeriod = {
      ...previous,
      from: new Date(0),
      to: previous.from,
      label: "Before the comparison period",
    };

    const [sales, orders, topProducts, lowStock, demoOrderCount] = await Promise.all([
      this.deps.getSalesSummaryUseCase.execute({ period }),
      this.deps.getOrderSummaryUseCase.execute({ period }),
      this.deps.getTopProductsUseCase.execute({ period }),
      this.deps.getLowStockProductsUseCase.execute(),
      this.deps.storeMetrics.demoOrderCount(period),
    ]);
    const [previousSales, previousOrders, previousDemoOrderCount, earlier] = await Promise.all([
      this.deps.getSalesSummaryUseCase.execute({ period: previous }),
      this.deps.getOrderSummaryUseCase.execute({ period: previous }),
      this.deps.storeMetrics.demoOrderCount(previous),
      this.deps.getOrderSummaryUseCase.execute({ period: before }),
    ]);

    const partialHistory =
      earlier.total === 0 && (hasOrders(sales, orders) || hasOrders(previousSales, previousOrders));
    const options = { withPercent: !partialHistory };
    const { firstDay, lastDay } = periodCalendarDays(period);

    return {
      period,
      range: { firstDay, lastDay, minDay: MIN_DASHBOARD_DAY, maxDay: today },
      rangeError:
        selection.kind === "invalid"
          ? { message: selection.message, ...selection.submitted }
          : null,
      sales,
      orders,
      topProducts,
      lowStock,
      demoOrderCount,
      comparison: {
        period: previous,
        sales: previousSales,
        orders: previousOrders,
        demoOrderCount: previousDemoOrderCount,
        changes: {
          ordersPlaced: metricChange(orders.total, previousOrders.total, options),
          paidOrders: metricChange(sales.paidOrders, previousSales.paidOrders, options),
          revenue: metricChange(sales.revenueMinor, previousSales.revenueMinor, options),
          aov: aovChange(sales.aovMinor, previousSales.aovMinor, options),
        },
        partialHistory,
        includesToday: now.getTime() < period.to.getTime(),
      },
      definitions: METRIC_DEFINITIONS,
      comparisonDefinition: PERIOD_COMPARISON_DEFINITION,
    };
  }
}

import { z } from "zod";
import type { MetricId } from "../../domain/metrics/metric-definitions";
import { periodCalendarDays, type MetricPeriod } from "../../domain/metrics/metric-period";
import { DEMO_TRAFFIC_LABEL } from "../../domain/traffic/demo-traffic";
import type {
  TrafficDayRange,
  TrafficFunnelAggregate,
  TrafficSourceSessions,
  TrafficStatsPort,
} from "../../ports/traffic-stats.port";
import { parseInput } from "../../validators/parse-input";
import type { GetSalesSummaryUseCase } from "../metrics/get-sales-summary.use-case";
import type { GetTopProductsUseCase } from "../metrics/get-top-products.use-case";

/** `productLimit` is clamped to this range (#28 "caps it"); 5 when it is not given. */
export const TRAFFIC_PRODUCT_LIMIT_MIN = 1;
export const TRAFFIC_PRODUCT_LIMIT_MAX = 20;
export const DEFAULT_TRAFFIC_PRODUCT_LIMIT = 5;

/**
 * Units sold per product come from `GetTopProductsUseCase` at its maximum list length. When the
 * list is full, a product missing from it may still have sold, so it gets `null`, never 0.
 */
export const TRAFFIC_UNITS_LOOKUP_LIMIT = 50;

const inputSchema = z.object({ productLimit: z.int().optional() });

export type TrafficProduct = {
  productId: string;
  name: string;
  /** Demo views and add-to-carts in the period (only products with view data are listed). */
  views: number;
  addToCarts: number;
  /** Units in paid orders (real orders); `null` when it cannot be known from the ranking. */
  unitsSold: number | null;
  /** `unitsSold / views`; `null` without units or without views. */
  viewToPurchaseRate: number | null;
};

export type TrafficSummary = {
  /** The label every reader shows next to these figures (D08, R07). */
  source: typeof DEMO_TRAFFIC_LABEL;
  demo: true;
  period: MetricPeriod;
  /** The local calendar days of `period`, as the traffic tables are filtered. */
  days: TrafficDayRange;
  definitionIds: MetricId[];
  productLimit: number;
  sessions: { total: number; bySource: TrafficSourceSessions[] };
  /** The demo funnel, then paid orders from the orders table (`GetSalesSummaryUseCase`). */
  funnel: TrafficFunnelAggregate & { paidOrders: number };
  /** Paid orders ÷ demo sessions; `null` ("Not enough data") at 0 sessions. Never per source. */
  storeConversion: number | null;
  /** All units in paid orders ÷ all demo product views; `null` without views or units. */
  viewToPurchaseRate: number | null;
  /** The first `productLimit` published products by demo views. */
  products: TrafficProduct[];
  /** Published products without view rows in the period: "no demo view data", no rate. */
  productsWithoutViewData: number;
};

function clamp(value: number): number {
  return Math.min(TRAFFIC_PRODUCT_LIMIT_MAX, Math.max(TRAFFIC_PRODUCT_LIMIT_MIN, value));
}

function rate(numerator: number | null, denominator: number): number | null {
  if (numerator === null || denominator === 0) return null;
  return numerator / denominator;
}

/**
 * The approved tool `getTrafficSummary`'s data (Copilot spec Phase 3, API Contracts; decision
 * D08): sessions by source, the funnel, store conversion and the most viewed products of a
 * period, from the seeded, fictional demo traffic tables. Every order figure comes from the E04
 * metric use cases unchanged, so it can never disagree with the dashboard. Read-only.
 */
export class GetTrafficSummaryUseCase {
  constructor(
    private readonly deps: {
      trafficStats: TrafficStatsPort;
      getSalesSummaryUseCase: GetSalesSummaryUseCase;
      getTopProductsUseCase: GetTopProductsUseCase;
    },
  ) {}

  async execute(input: { period: MetricPeriod; productLimit?: unknown }): Promise<TrafficSummary> {
    const parsed = parseInput(inputSchema, { productLimit: input.productLimit });
    const productLimit = clamp(parsed.productLimit ?? DEFAULT_TRAFFIC_PRODUCT_LIMIT);
    const { period } = input;
    const days = periodCalendarDays(period);
    const { trafficStats, getSalesSummaryUseCase, getTopProductsUseCase } = this.deps;

    const [bySource, funnel, views, sales, top] = await Promise.all([
      trafficStats.sessionsBySource(days),
      trafficStats.funnel(days),
      trafficStats.productViews(days, productLimit),
      getSalesSummaryUseCase.execute({ period }),
      getTopProductsUseCase.execute({ period, limit: TRAFFIC_UNITS_LOOKUP_LIMIT }),
    ]);

    const rankingFull = top.rows.length >= top.limit;
    const unitsById = new Map(
      top.rows.flatMap((row) => (row.productId === null ? [] : [[row.productId, row.units]])),
    );
    const products = views.rows.map((row) => {
      const unitsSold = unitsById.get(row.productId) ?? (rankingFull ? null : 0);
      return { ...row, unitsSold, viewToPurchaseRate: rate(unitsSold, row.views) };
    });
    const allUnits = rankingFull ? null : top.rows.reduce((sum, row) => sum + row.units, 0);

    return {
      source: DEMO_TRAFFIC_LABEL,
      demo: true,
      period,
      days,
      definitionIds: [
        "sessionsDemo",
        "funnelDemo",
        "storeConversionDemo",
        "viewToPurchaseRateDemo",
      ],
      productLimit,
      sessions: {
        total: bySource.reduce((sum, row) => sum + row.sessions, 0),
        bySource,
      },
      funnel: { ...funnel, paidOrders: sales.paidOrders },
      storeConversion: rate(sales.paidOrders, funnel.sessions),
      viewToPurchaseRate: rate(allUnits, funnel.productViews),
      products,
      productsWithoutViewData: views.productsWithoutViewData,
    };
  }
}

import type { TrafficSource } from "../domain/traffic/demo-traffic";

/**
 * Whole calendar days in the store time zone, both ends included, as ISO dates
 * (`"2026-10-11"`). The demo traffic tables are stored per local day, not per instant.
 */
export type TrafficDayRange = { firstDay: string; lastDay: string };

/** Demo sessions of one source in the range; every source is listed, `0` when it has none. */
export type TrafficSourceSessions = { source: TrafficSource; sessions: number };

/** The demo funnel counts of the range, summed over every source (zeros when there are none). */
export type TrafficFunnelAggregate = {
  sessions: number;
  productViews: number;
  addToCarts: number;
  checkoutsStarted: number;
};

/** One published product with demo view rows in the range. */
export type ProductViewAggregate = {
  productId: string;
  name: string;
  views: number;
  addToCarts: number;
};

export type ProductViewsAggregate = {
  /** The first `limit` products by views (then name), only those with view rows in the range. */
  rows: ProductViewAggregate[];
  /** Published products with no view row in the range: "no demo view data", never 0 views. */
  productsWithoutViewData: number;
};

/**
 * Read-only aggregates over the seeded, fictional demo traffic tables (decision D08, Copilot
 * spec Phase 3). Nothing writes these tables outside the seed: storefront visits are not
 * tracked (N05). Order figures never come from here; the use case reads them from the metric
 * use cases.
 */
export interface TrafficStatsPort {
  sessionsBySource(range: TrafficDayRange): Promise<TrafficSourceSessions[]>;
  funnel(range: TrafficDayRange): Promise<TrafficFunnelAggregate>;
  productViews(range: TrafficDayRange, limit: number): Promise<ProductViewsAggregate>;
}

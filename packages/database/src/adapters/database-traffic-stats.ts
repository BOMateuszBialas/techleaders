import {
  TRAFFIC_SOURCES,
  type ProductViewsAggregate,
  type TrafficDayRange,
  type TrafficFunnelAggregate,
  type TrafficSourceSessions,
  type TrafficStatsPort,
} from "@commerceos/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { toSafeInteger } from "./database-store-metrics";

type SourceRow = { source: string; sessions: unknown };
type FunnelRow = {
  sessions: unknown;
  product_views: unknown;
  add_to_carts: unknown;
  checkouts_started: unknown;
};
type ProductViewRow = { product_id: string; name: string; views: unknown; add_to_carts: unknown };

/** Both ends of the day range, bound and cast in SQL (never spliced into it). */
function dayParams(range: TrafficDayRange): [string, string] {
  return [range.firstDay, range.lastDay];
}

/** The one row an aggregate without `group by` always returns. */
function singleRow<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) throw new Error("An aggregate traffic query returned no row");
  return row;
}

/**
 * Database adapter for `TrafficStatsPort` (Copilot spec Phase 3): aggregate SQL over the seeded,
 * fictional `traffic_daily_stats` and `product_view_daily_stats` (D08), every value bound.
 * Read-only and request-scoped; it never writes either table.
 */
export class DatabaseTrafficStats implements TrafficStatsPort {
  constructor(private readonly deps: { em: EntityManager }) {}

  async sessionsBySource(range: TrafficDayRange): Promise<TrafficSourceSessions[]> {
    const rows = await this.deps.em.execute<SourceRow[]>(
      `select source, sum(sessions) as sessions
         from traffic_daily_stats
        where date >= ?::date and date <= ?::date
        group by source`,
      dayParams(range),
    );
    const bySource = new Map(rows.map((row) => [row.source, row.sessions]));
    // Every source is listed in the fixed order; one without rows has 0 sessions.
    return TRAFFIC_SOURCES.map((source) => ({
      source,
      sessions: toSafeInteger(bySource.get(source) ?? 0, "sessions"),
    }));
  }

  async funnel(range: TrafficDayRange): Promise<TrafficFunnelAggregate> {
    const rows = await this.deps.em.execute<FunnelRow[]>(
      `select coalesce(sum(sessions), 0) as sessions,
              coalesce(sum(product_views), 0) as product_views,
              coalesce(sum(add_to_carts), 0) as add_to_carts,
              coalesce(sum(checkouts_started), 0) as checkouts_started
         from traffic_daily_stats
        where date >= ?::date and date <= ?::date`,
      dayParams(range),
    );
    const row = singleRow(rows);
    return {
      sessions: toSafeInteger(row.sessions, "sessions"),
      productViews: toSafeInteger(row.product_views, "product_views"),
      addToCarts: toSafeInteger(row.add_to_carts, "add_to_carts"),
      checkoutsStarted: toSafeInteger(row.checkouts_started, "checkouts_started"),
    };
  }

  async productViews(range: TrafficDayRange, limit: number): Promise<ProductViewsAggregate> {
    const params = dayParams(range);
    // Published products only: a draft or archived product is not something to act on.
    const rows = await this.deps.em.execute<ProductViewRow[]>(
      `select p.id as product_id, p.name,
              sum(v.views) as views, sum(v.add_to_carts) as add_to_carts
         from product_view_daily_stats v
         join products p on p.id = v.product_id
        where p.status = 'published'
          and v.date >= ?::date and v.date <= ?::date
        group by p.id, p.name
        order by views desc, p.name asc, p.id asc
        limit ?`,
      [...params, limit],
    );
    const without = await this.deps.em.execute<{ count: unknown }[]>(
      `select count(*) as count
         from products p
        where p.status = 'published'
          and not exists (
            select 1
              from product_view_daily_stats v
             where v.product_id = p.id
               and v.date >= ?::date and v.date <= ?::date)`,
      params,
    );
    return {
      rows: rows.map((row) => ({
        productId: row.product_id,
        name: row.name,
        views: toSafeInteger(row.views, "views"),
        addToCarts: toSafeInteger(row.add_to_carts, "add_to_carts"),
      })),
      productsWithoutViewData: toSafeInteger(singleRow(without).count, "count"),
    };
  }
}

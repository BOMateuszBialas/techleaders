import {
  DEMO_ORDER_REFERENCE_LIKE,
  PAID_ORDER_STATUSES,
  type CurrencyCode,
  type LowStockAggregate,
  type MetricRange,
  type OrderStatusCount,
  type SalesAggregate,
  type StoreMetricsPort,
  type TopProductAggregate,
} from "@commerceos/core";
import type { EntityManager } from "@mikro-orm/postgresql";

/** `?, ?, ?`: one bound placeholder per paid status, never the values spliced into the SQL. */
const PAID_STATUS_PLACEHOLDERS = PAID_ORDER_STATUSES.map(() => "?").join(", ");

/**
 * A count or sum from a raw row. PostgreSQL returns `bigint` (`count(*)`, `sum(int)`) as a
 * string; anything that is not a safe integer is a broken invariant, never a rounded number.
 */
export function toSafeInteger(value: unknown, column: string): number {
  // `Number(null)` and `Number("")` are 0: a missing value is a broken invariant, not a zero.
  const number = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  if (value === "" || !Number.isSafeInteger(number)) {
    throw new Error(`Metric column ${column} is not a safe integer`);
  }
  return number;
}

/** The one row an aggregate without `group by` always returns. */
function singleRow<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) throw new Error("An aggregate metric query returned no row");
  return row;
}

/** Instants are bound as ISO strings and cast in SQL, so no driver time-zone setting applies. */
function rangeParams(range: MetricRange): [string, string] {
  return [range.from.toISOString(), range.to.toISOString()];
}

type SalesRow = { paid_orders: unknown; revenue_minor: unknown; other_currency_orders: unknown };
type StatusRow = { status: string; count: unknown };
type TopProductRow = {
  product_id: string | null;
  display_name: string;
  units: unknown;
  revenue_minor: unknown;
};
type LowStockSqlRow = {
  id: string;
  slug: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  total: unknown;
};

/**
 * Database adapter for `StoreMetricsPort` (orders spec, "Metric queries"). Every query is
 * aggregate SQL over a half-open `[from, to)` range with every value bound; the rules are the
 * ones in `METRIC_DEFINITIONS` (core). Read-only and request-scoped.
 */
export class DatabaseStoreMetrics implements StoreMetricsPort {
  constructor(private readonly deps: { em: EntityManager }) {}

  async salesSummary(range: MetricRange, currency: CurrencyCode): Promise<SalesAggregate> {
    const rows = await this.deps.em.execute<SalesRow[]>(
      `select count(*) filter (where currency = ?) as paid_orders,
              coalesce(sum(total_minor) filter (where currency = ?), 0) as revenue_minor,
              count(*) filter (where currency <> ?) as other_currency_orders
         from orders
        where paid_at >= ?::timestamptz and paid_at < ?::timestamptz
          and status in (${PAID_STATUS_PLACEHOLDERS})`,
      [currency, currency, currency, ...rangeParams(range), ...PAID_ORDER_STATUSES],
    );
    const row = singleRow(rows);
    return {
      paidOrders: toSafeInteger(row.paid_orders, "paid_orders"),
      revenueMinor: toSafeInteger(row.revenue_minor, "revenue_minor"),
      otherCurrencyOrders: toSafeInteger(row.other_currency_orders, "other_currency_orders"),
    };
  }

  async orderSummary(range: MetricRange): Promise<OrderStatusCount[]> {
    const rows = await this.deps.em.execute<StatusRow[]>(
      `select status, count(*) as count
         from orders
        where created_at >= ?::timestamptz and created_at < ?::timestamptz
        group by status
        order by status`,
      rangeParams(range),
    );
    return rows.map((row) => ({ status: row.status, count: toSafeInteger(row.count, "count") }));
  }

  async topProducts(
    range: MetricRange,
    currency: CurrencyCode,
    limit: number,
  ): Promise<TopProductAggregate[]> {
    // A deleted product's lines keep `product_id` null; they are grouped by snapshot name (a
    // renamed-then-deleted product is one row per name it was sold under). A live product shows
    // its current name. The last sort key makes equal rows deterministic.
    const rows = await this.deps.em.execute<TopProductRow[]>(
      `select i.product_id,
              coalesce(max(p.name), max(i.product_name)) as display_name,
              sum(i.quantity) as units,
              sum(i.line_total_minor) as revenue_minor
         from order_items i
         join orders o on o.id = i.order_id
         left join products p on p.id = i.product_id
        where o.paid_at >= ?::timestamptz and o.paid_at < ?::timestamptz
          and o.status in (${PAID_STATUS_PLACEHOLDERS})
          and o.currency = ?
        group by i.product_id, case when i.product_id is null then i.product_name end
        order by units desc, revenue_minor desc, display_name asc, i.product_id asc nulls last
        limit ?`,
      [...rangeParams(range), ...PAID_ORDER_STATUSES, currency, limit],
    );
    return rows.map((row) => ({
      productId: row.product_id,
      name: row.display_name,
      units: toSafeInteger(row.units, "units"),
      revenueMinor: toSafeInteger(row.revenue_minor, "revenue_minor"),
    }));
  }

  async lowStockProducts(threshold: number, limit: number): Promise<LowStockAggregate> {
    // `count(*) over ()` is computed before the limit: the total of every matching product.
    const rows = await this.deps.em.execute<LowStockSqlRow[]>(
      `select id, slug, name, sku, stock_quantity, count(*) over () as total
         from products
        where status = 'published' and stock_quantity <= ?
        order by stock_quantity asc, name asc, id asc
        limit ?`,
      [threshold, limit],
    );
    return {
      total: rows[0] ? toSafeInteger(rows[0].total, "total") : 0,
      rows: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        sku: row.sku,
        stockQuantity: row.stock_quantity,
      })),
    };
  }

  async demoOrderCount(range: MetricRange): Promise<number> {
    const [from, to] = rangeParams(range);
    const rows = await this.deps.em.execute<{ count: unknown }[]>(
      `select count(*) as count
         from orders
        where public_reference like ?
          and ((created_at >= ?::timestamptz and created_at < ?::timestamptz)
            or (paid_at >= ?::timestamptz and paid_at < ?::timestamptz))`,
      [DEMO_ORDER_REFERENCE_LIKE, from, to, from, to],
    );
    return toSafeInteger(singleRow(rows).count, "count");
  }
}

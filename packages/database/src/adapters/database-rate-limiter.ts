import type { RateLimiterPort } from "@commerceos/core";
import type { EntityManager } from "@mikro-orm/postgresql";

/**
 * One atomic statement per request (cart spec A15): the row for (key, current window) is
 * created with count 1 or incremented, and the new count returned. Concurrent calls serialise
 * on the row, so the count never skips or repeats and the limit cannot be exceeded.
 */
const CONSUME_SQL = `insert into rate_limit_buckets (key, window_start, count)
  values (?, to_timestamp(floor(extract(epoch from now()) / ?) * ?), 1)
  on conflict (key, window_start) do update set count = rate_limit_buckets.count + 1
  returning count`;

/** Windows older than an hour are no longer read; deleted whenever a new window starts. */
const CLEANUP_SQL = "delete from rate_limit_buckets where window_start < now() - interval '1 hour'";

/**
 * PostgreSQL adapter for the core `RateLimiterPort`. Request-scoped (the request's
 * EntityManager). It fails closed: a database error propagates, so a lookup never runs
 * unlimited because the limiter is down.
 */
export class DatabaseRateLimiter implements RateLimiterPort {
  constructor(private readonly deps: { em: EntityManager }) {}

  async consume(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const rows = await this.deps.em.execute<{ count: number }[]>(CONSUME_SQL, [
      key,
      windowSeconds,
      windowSeconds,
    ]);
    const count = rows[0]?.count;
    if (count === undefined) throw new Error("The rate limiter returned no count");
    if (count === 1) await this.deps.em.execute(CLEANUP_SQL);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  }
}

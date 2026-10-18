import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

/**
 * One fixed-window counter (cart spec A15): `key` names the limited action and client (e.g.
 * `order-lookup|shared`), `window_start` the window. Written only by an atomic upsert; rows
 * older than a day (the longest window) are deleted on the way.
 */
export const RateLimitBucketSchema = defineEntity({
  name: "RateLimitBucket",
  tableName: "rate_limit_buckets",
  properties: {
    key: p.text().primary(),
    windowStart: p.datetime().primary(),
    count: p.integer().check("count >= 0"),
  },
});

export type RateLimitBucket = InferEntity<typeof RateLimitBucketSchema>;

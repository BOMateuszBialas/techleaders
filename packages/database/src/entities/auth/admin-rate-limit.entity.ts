import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

/** Better Auth rate-limit counters (`rateLimit.storage: "database"`), keyed by IP bucket + path. */
export const AdminRateLimitSchema = defineEntity({
  name: "AdminRateLimit",
  tableName: "admin_rate_limits",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    key: p.text().unique(),
    count: p.integer(),
    /** Epoch milliseconds, as Better Auth writes it. */
    lastRequest: p.bigint("number"),
  },
});

export type AdminRateLimit = InferEntity<typeof AdminRateLimitSchema>;

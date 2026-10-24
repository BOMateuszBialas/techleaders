import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

/**
 * Customer sign-in and sign-up rate-limit counters (spec A10), separate from the owner's
 * `admin_rate_limits`, so a customer flood never locks the owner out.
 */
export const CustomerRateLimitSchema = defineEntity({
  name: "CustomerRateLimit",
  tableName: "customer_rate_limits",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    key: p.text().unique(),
    count: p.integer(),
    /** Epoch milliseconds, as Better Auth writes it. */
    lastRequest: p.bigint("number"),
  },
});

export type CustomerRateLimit = InferEntity<typeof CustomerRateLimitSchema>;

import { TRAFFIC_SOURCES } from "@commerceos/core";
import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

/**
 * Fictional daily traffic per source (orders spec Phase 2, Data Model; decision D08). Seeded
 * only, never measured. `date` is a calendar day in the store time zone (Europe/Warsaw). The
 * funnel check covers one source on one day; the cross-table invariants (sessions ≥ views ≥
 * add-to-cart ≥ checkouts ≥ seeded paid orders per day) are asserted by the seed tests.
 */
export const TrafficDailyStatSchema = defineEntity({
  name: "TrafficDailyStat",
  tableName: "traffic_daily_stats",
  properties: {
    id: p.uuid().primary().defaultRaw("gen_random_uuid()"),
    date: p.date(),
    source: p.enum(TRAFFIC_SOURCES),
    sessions: p.integer().check("sessions >= 0"),
    productViews: p.integer().check("product_views >= 0"),
    addToCarts: p.integer().check("add_to_carts >= 0"),
    checkoutsStarted: p.integer().check("checkouts_started >= 0"),
  },
  checks: [
    {
      name: "traffic_daily_stats_funnel_check",
      expression:
        "sessions >= product_views and product_views >= add_to_carts and add_to_carts >= checkouts_started",
    },
  ],
  uniques: [{ name: "traffic_daily_stats_date_source_unique", properties: ["date", "source"] }],
});

export type TrafficDailyStat = InferEntity<typeof TrafficDailyStatSchema>;

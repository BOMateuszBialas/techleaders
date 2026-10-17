/**
 * Fictional demo traffic (decision D08, orders spec Phase 2): the seed fills daily sessions and
 * funnel counts per source, and daily views per product, over the same rolling window as the
 * seeded orders. There is no real analytics integration: every reader (the Copilot's
 * `getTrafficSummary`, E05) must label this data as seeded and fictional.
 */
export const TRAFFIC_SOURCES = ["direct", "organic", "social", "email", "paid"] as const;
export type TrafficSource = (typeof TRAFFIC_SOURCES)[number];

/** The label every reader of the demo traffic tables shows next to the data (D08, R07). */
export const DEMO_TRAFFIC_LABEL = "Seeded demo traffic (fictional, not measured)";

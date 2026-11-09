import type { CopilotToolResults } from "./build-facts";

/**
 * A source of facts a rule can depend on. Only sources a tool can report as incomplete are
 * listed; the rest (sales, orders, top products, stock) return whole figures or a truncation,
 * which the server already states as a limitation (GR-04, owner 2026-11-09).
 */
export type CopilotSource = "traffic";

/**
 * The sources whose figures are missing for the period. The source returns `null` where it has
 * no figures (the traffic summary's store conversion is `null` when the period has no demo
 * sessions), so a missing figure is never read as 0. A real zero (sessions, orders, a rate of
 * 0%) is not missing and is shown as zero.
 */
export function incompleteSources(results: CopilotToolResults): ReadonlySet<CopilotSource> {
  const incomplete = new Set<CopilotSource>();
  if (results.traffic?.storeConversion === null) incomplete.add("traffic");
  return incomplete;
}

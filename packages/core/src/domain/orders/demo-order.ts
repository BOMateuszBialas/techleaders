/**
 * Seeded demo orders (orders spec A13): their public reference starts with `DEMO-`, never the
 * `CO-` shape checkout generates. The prefix is the one discriminator; there is no `is_demo`
 * column.
 */
export const DEMO_ORDER_REFERENCE_PREFIX = "DEMO-";

/**
 * The SQL `like` pattern for demo references, built from the prefix so SQL and TypeScript share
 * one definition. The prefix holds no `%`, `_` or `\`, so it needs no escaping.
 */
export const DEMO_ORDER_REFERENCE_LIKE = `${DEMO_ORDER_REFERENCE_PREFIX}%`;

/** True for a seeded demo order's reference (`DEMO-0001`). */
export function isDemoOrderReference(reference: string): boolean {
  return reference.startsWith(DEMO_ORDER_REFERENCE_PREFIX);
}

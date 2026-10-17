/**
 * Seeded demo orders (orders spec A13): their public reference is `DEMO-0001`, `DEMO-0002`, …,
 * never the `CO-` shape checkout generates, so the prefix alone tells them apart. There is no
 * `is_demo` column; this module is the one discriminator for TypeScript and SQL alike.
 */
export const DEMO_ORDER_REFERENCE_PREFIX = "DEMO-";

/**
 * The SQL `like` pattern matching every demo reference, built from the prefix so SQL and
 * TypeScript share one definition. The prefix holds no `%`, `_` or backslash, so it needs no
 * escaping.
 */
export const DEMO_ORDER_REFERENCE_LIKE = `${DEMO_ORDER_REFERENCE_PREFIX}%`;

/** True for a seeded demo order's reference. */
export function isDemoOrderReference(reference: string): boolean {
  return reference.startsWith(DEMO_ORDER_REFERENCE_PREFIX);
}

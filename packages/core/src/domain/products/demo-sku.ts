/**
 * The machine marker of seeded demo products (storefront v2, OA-3): a SKU that starts with `DEMO-`.
 * This is the one discriminator for TypeScript and SQL alike. SKUs are stored trimmed and
 * upper-cased (`normalizeSku`), but rows written before that rule, or by hand, may not be, so the
 * check trims and ignores case; the SQL twin is `upper(btrim(sku)) like DEMO_SKU_LIKE`.
 */
export const DEMO_SKU_PREFIX = "DEMO-";

/** The SQL `like` pattern for a demo SKU, applied to `upper(btrim(sku))` (the TypeScript rule). */
export const DEMO_SKU_LIKE = `${DEMO_SKU_PREFIX}%`;

/** True for a demo product's SKU, ignoring surrounding spaces and letter case. */
export function isDemoSku(sku: string): boolean {
  return sku.trim().toUpperCase().startsWith(DEMO_SKU_PREFIX);
}

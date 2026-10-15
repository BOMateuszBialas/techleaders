/**
 * Cache tag for catalog reads. Every successful catalog mutation calls `updateTag` with it, so
 * a storefront read cached with `cacheTag(CATALOG_CACHE_TAG)` shows the change on the next
 * request (read-your-own-writes). Storefront reads are request-time today; the tag keeps a
 * future cached read correct without touching the actions again.
 */
export const CATALOG_CACHE_TAG = "catalog";

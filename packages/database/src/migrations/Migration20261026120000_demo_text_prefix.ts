import { Migration } from '@mikro-orm/migrations';

/**
 * One-off text update for existing databases (storefront v2, Phase 1, R11, OA-4a): removes the
 * "[DEMO] " prefix from the seeded demo rows only. The seeder is insert-only, so rows created by
 * an earlier seed keep the prefix until this runs.
 *
 * Scope, by the seed's own discriminators:
 * - categories by seed slug (the five demo categories);
 * - products whose SKU is a `DEMO-` SKU;
 * - orders whose public reference is a `DEMO-` reference (customer name).
 *
 * Data only and idempotent: a row without the exact prefix is not matched, so a second run changes
 * nothing. It never touches `stock_quantity`, prices, statuses or any row that is not seeded demo
 * data. `down` is a no-op: the removed prefix is not recorded anywhere, and restoring it would
 * mean inventing text for rows the owner may since have edited.
 */
export class Migration20261026120000_demo_text_prefix extends Migration {

  override name = 'Migration20261026120000_demo_text_prefix';

  override up(): void | Promise<void> {
    this.addSql(`update "categories" set "description" = substr("description", 8) where "slug" in ('mice', 'keyboards', 'headsets', 'controllers', 'mousepads') and left("description", 7) = '[DEMO] ';`);
    this.addSql(`update "products" set "description" = substr("description", 8) where "sku" like 'DEMO-%' and left("description", 7) = '[DEMO] ';`);
    this.addSql(`update "orders" set "customer_name" = substr("customer_name", 8) where "public_reference" like 'DEMO-%' and left("customer_name", 7) = '[DEMO] ';`);
  }

  override down(): void | Promise<void> {
    // Intentionally empty: see the note above.
  }

}

import { Migration } from '@mikro-orm/migrations';

/**
 * Follow-up to Migration20261026120000_demo_text_prefix (storefront v2, OA-4a). That migration
 * matched demo products with `sku like 'DEMO-%'`: case-sensitive, and blind to surrounding spaces.
 * The application rule (`isDemoSku` in core) trims the SKU and ignores case, so a row whose SKU
 * is stored as `demo-…` or ` DEMO-…` was treated as demo content everywhere else but kept its
 * "[DEMO] " text prefix. The write path (`normalizeSku`) stores SKUs upper-cased and trimmed, so
 * such rows can only come from direct SQL edits, but the SQL rule must match the code rule.
 *
 * This is a new migration, not an edit of the applied one. It removes the prefix from demo
 * products whose SKU matches `upper(btrim(sku)) like 'DEMO-%'`, and only from those. Data only and
 * idempotent: a row without the exact prefix is not matched. It never touches `stock_quantity`,
 * prices, statuses, orders or categories. `down` is a no-op for the same reason as the original.
 */
export class Migration20261026190000_demo_sku_case extends Migration {

  override name = 'Migration20261026190000_demo_sku_case';

  override up(): void | Promise<void> {
    this.addSql(`update "products" set "description" = substr("description", 8) where upper(btrim("sku")) like 'DEMO-%' and left("description", 7) = '[DEMO] ';`);
  }

  override down(): void | Promise<void> {
    // Intentionally empty: the removed prefix is not recorded anywhere (see the original migration).
  }

}

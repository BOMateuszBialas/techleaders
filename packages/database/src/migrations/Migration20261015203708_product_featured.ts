import { Migration } from '@mikro-orm/migrations';

/**
 * Adds the `featured` flag for the storefront home page's featured slider
 * (spec 2026-10-15-storefront-catalog, Phase 1b, G9 and G20). Additive, defaults to false.
 */
export class Migration20261015203708_product_featured extends Migration {

  override name = 'Migration20261015203708_product_featured';

  override up(): void | Promise<void> {
    this.addSql(`alter table "products" add "featured" boolean not null default false;`);
    this.addSql(`create index "products_featured_index" on "products" ("featured");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index "products_featured_index";`);
    this.addSql(`alter table "products" drop column "featured";`);
  }

}

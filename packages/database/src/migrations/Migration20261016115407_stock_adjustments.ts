import { Migration } from '@mikro-orm/migrations';

/**
 * Adds the stock history (admin catalog spec, Phase 2, E03-S03): one row per manual stock
 * change, with the quantity before and after. Additive: no existing table changes, so `down`
 * drops only the history.
 */
export class Migration20261016115407_stock_adjustments extends Migration {

  override name = 'Migration20261016115407_stock_adjustments';

  override up(): void | Promise<void> {
    this.addSql(`create table "stock_adjustments" ("id" uuid not null default gen_random_uuid(), "product_id" uuid not null, "previous_quantity" int not null, "new_quantity" int not null, "created_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "stock_adjustments_product_id_created_at_index" on "stock_adjustments" ("product_id", "created_at" DESC);`);

    this.addSql(`alter table "stock_adjustments" add constraint "stock_adjustments_product_id_foreign" foreign key ("product_id") references "products" ("id") on delete cascade;`);
    this.addSql(`alter table "stock_adjustments" add constraint "stock_adjustments_quantity_changed_check" check (new_quantity <> previous_quantity);`);
    this.addSql(`alter table "stock_adjustments" add constraint "stock_adjustments_previous_quantity_check" check (previous_quantity >= 0);`);
    this.addSql(`alter table "stock_adjustments" add constraint "stock_adjustments_new_quantity_check" check (new_quantity >= 0);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "stock_adjustments" cascade;`);
  }

}

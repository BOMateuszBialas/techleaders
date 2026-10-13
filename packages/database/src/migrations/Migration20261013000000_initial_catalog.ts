import { Migration } from '@mikro-orm/migrations';

/**
 * Initial catalog schema: categories and products.
 * Generated from entity metadata (orm.schema.getCreateSchemaSQL) on 2026-10-13.
 */
export class Migration20261013000000_initial_catalog extends Migration {

  override name = 'Migration20261013000000_initial_catalog';

  override up(): void | Promise<void> {
    this.addSql(`create table "categories" ("id" uuid not null default gen_random_uuid(), "name" varchar(120) not null, "slug" varchar(140) not null, "description" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`alter table "categories" add constraint "categories_slug_unique" unique ("slug");`);

    this.addSql(`create table "products" ("id" uuid not null default gen_random_uuid(), "category_id" uuid null, "name" varchar(200) not null, "slug" varchar(220) not null, "description" text not null default '', "price_minor" int not null, "currency" text not null default 'PLN', "sku" varchar(64) null, "stock_quantity" int not null default 0, "image_url" varchar(2048) null, "status" text not null default 'draft', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "products_category_id_index" on "products" ("category_id");`);
    this.addSql(`alter table "products" add constraint "products_slug_unique" unique ("slug");`);
    this.addSql(`alter table "products" add constraint "products_sku_unique" unique ("sku");`);
    this.addSql(`create index "products_status_index" on "products" ("status");`);
    this.addSql(`alter table "products" add constraint "products_price_minor_check" check (price_minor >= 0);`);
    this.addSql(`alter table "products" add constraint "products_stock_quantity_check" check (stock_quantity >= 0);`);
    this.addSql(`alter table "products" add constraint "products_currency_check" check ("currency" in ('PLN', 'EUR', 'USD'));`);
    this.addSql(`alter table "products" add constraint "products_status_check" check ("status" in ('draft', 'published'));`);

    this.addSql(`alter table "products" add constraint "products_category_id_foreign" foreign key ("category_id") references "categories" ("id") on delete set null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "products" cascade;`);
    this.addSql(`drop table if exists "categories" cascade;`);
  }

}

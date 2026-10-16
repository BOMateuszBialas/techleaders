import { Migration } from '@mikro-orm/migrations';

/**
 * Adds orders and their items (cart spec, Phase 2, E02-S02-T01 #29): snapshots, integer money
 * with `>= 0` checks and `total = subtotal + shipping`, the full status workflow, the paid-at
 * invariants, unique public reference / idempotency key / payment reference, and indexes on the
 * status, the creation time and both foreign keys. Additive: no existing table changes, so
 * `down` drops only the new tables.
 */
export class Migration20261016132205_orders extends Migration {

  override name = 'Migration20261016132205_orders';

  override up(): void | Promise<void> {
    this.addSql(`create table "orders" ("id" uuid not null default gen_random_uuid(), "public_reference" varchar(32) not null, "idempotency_key" uuid not null, "request_fingerprint" text not null, "status" text not null default 'pending_payment', "customer_name" varchar(200) not null, "customer_email" varchar(320) not null, "shipping_line1" varchar(200) not null, "shipping_line2" varchar(200) null, "shipping_city" varchar(100) not null, "shipping_postal_code" varchar(20) not null, "shipping_country" char(2) not null, "currency" text not null, "subtotal_minor" int not null, "shipping_minor" int not null default 0, "total_minor" int not null, "payment_provider" text null, "payment_reference" varchar(64) null, "paid_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`alter table "orders" add constraint "orders_public_reference_unique" unique ("public_reference");`);
    this.addSql(`alter table "orders" add constraint "orders_idempotency_key_unique" unique ("idempotency_key");`);
    this.addSql(`create index "orders_status_index" on "orders" ("status");`);
    this.addSql(`alter table "orders" add constraint "orders_payment_reference_unique" unique ("payment_reference");`);
    this.addSql(`create index "orders_created_at_index" on "orders" ("created_at");`);

    this.addSql(`create table "order_items" ("id" uuid not null default gen_random_uuid(), "order_id" uuid not null, "product_id" uuid null, "product_name" varchar(200) not null, "product_sku" varchar(64) null, "unit_price_minor" int not null, "quantity" int not null, "line_total_minor" int not null, primary key ("id"));`);
    this.addSql(`create index "order_items_order_id_index" on "order_items" ("order_id");`);
    this.addSql(`create index "order_items_product_id_index" on "order_items" ("product_id");`);
    this.addSql(`alter table "order_items" add constraint "order_items_order_id_product_id_unique" unique ("order_id", "product_id");`);

    this.addSql(`alter table "orders" add constraint "orders_total_check" check (total_minor = subtotal_minor + shipping_minor);`);
    this.addSql(`alter table "orders" add constraint "orders_pending_unpaid_check" check (status <> 'pending_payment' or paid_at is null);`);
    this.addSql(`alter table "orders" add constraint "orders_paid_at_check" check (status not in ('paid', 'processing', 'shipped', 'refunded') or paid_at is not null);`);
    this.addSql(`alter table "orders" add constraint "orders_shipping_country_check" check (shipping_country ~ '^[A-Z]{2}\$');`);
    this.addSql(`alter table "orders" add constraint "orders_subtotal_minor_check" check (subtotal_minor >= 0);`);
    this.addSql(`alter table "orders" add constraint "orders_shipping_minor_check" check (shipping_minor >= 0);`);
    this.addSql(`alter table "orders" add constraint "orders_total_minor_check" check (total_minor >= 0);`);
    this.addSql(`alter table "orders" add constraint "orders_status_check" check ("status" in ('pending_payment', 'paid', 'processing', 'shipped', 'cancelled', 'refunded'));`);
    this.addSql(`alter table "orders" add constraint "orders_currency_check" check ("currency" in ('PLN', 'EUR', 'USD'));`);
    this.addSql(`alter table "orders" add constraint "orders_payment_provider_check" check ("payment_provider" in ('demo'));`);

    this.addSql(`alter table "order_items" add constraint "order_items_order_id_foreign" foreign key ("order_id") references "orders" ("id") on delete cascade;`);
    this.addSql(`alter table "order_items" add constraint "order_items_product_id_foreign" foreign key ("product_id") references "products" ("id") on delete set null;`);
    this.addSql(`alter table "order_items" add constraint "order_items_unit_price_minor_check" check (unit_price_minor >= 0);`);
    this.addSql(`alter table "order_items" add constraint "order_items_quantity_check" check (quantity between 1 and 99);`);
    this.addSql(`alter table "order_items" add constraint "order_items_line_total_minor_check" check (line_total_minor = unit_price_minor * quantity);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "order_items" cascade;`);
    this.addSql(`drop table if exists "orders" cascade;`);
  }

}

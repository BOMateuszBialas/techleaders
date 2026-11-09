import { Migration } from '@mikro-orm/migrations';

export class Migration20261109090000_order_audit_trail extends Migration {

  override name = 'Migration20261109090000_order_audit_trail';

  override up(): void | Promise<void> {
    this.addSql(`create table "order_status_history" ("id" uuid not null default gen_random_uuid(), "order_id" uuid not null, "from_status" varchar(32) not null, "to_status" varchar(32) not null, "changed_by" varchar(128) null, "changed_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "order_status_history_order_id_changed_at_index" on "order_status_history" ("order_id", "changed_at" DESC);`);

    this.addSql(`alter table "stock_adjustments" add "source" varchar(32) not null default 'manual', add "order_id" uuid null;`);
    this.addSql(`alter table "stock_adjustments" add constraint "stock_adjustments_order_id_foreign" foreign key ("order_id") references "orders" ("id") on delete set null;`);
    this.addSql(`alter table "stock_adjustments" add constraint "stock_adjustments_source_check" check (source in ('manual', 'order_cancellation'));`);

    this.addSql(`alter table "order_status_history" add constraint "order_status_history_order_id_foreign" foreign key ("order_id") references "orders" ("id") on delete cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "order_status_history" cascade;`);

    this.addSql(`alter table "stock_adjustments" drop constraint "stock_adjustments_order_id_foreign";`);

    this.addSql(`alter table "stock_adjustments" drop constraint "stock_adjustments_source_check";`);
    this.addSql(`alter table "stock_adjustments" drop column "source", drop column "order_id";`);
  }

}

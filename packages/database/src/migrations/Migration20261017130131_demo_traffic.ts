import { Migration } from '@mikro-orm/migrations';

/**
 * Adds the fictional demo traffic tables (orders spec Phase 2, E04-S03; decision D08): daily
 * sessions and funnel counts per source, and daily views per product. Seeded only, never
 * measured. Additive: no existing table changes, so `down` drops only these two tables.
 */
export class Migration20261017130131_demo_traffic extends Migration {

  override name = 'Migration20261017130131_demo_traffic';

  override up(): void | Promise<void> {
    this.addSql(`create table "product_view_daily_stats" ("id" uuid not null default gen_random_uuid(), "date" date not null, "product_id" uuid not null, "views" int not null, "add_to_carts" int not null, primary key ("id"));`);
    this.addSql(`create index "product_view_daily_stats_product_id_index" on "product_view_daily_stats" ("product_id");`);
    this.addSql(`alter table "product_view_daily_stats" add constraint "product_view_daily_stats_date_product_id_unique" unique ("date", "product_id");`);

    this.addSql(`create table "traffic_daily_stats" ("id" uuid not null default gen_random_uuid(), "date" date not null, "source" text not null, "sessions" int not null, "product_views" int not null, "add_to_carts" int not null, "checkouts_started" int not null, primary key ("id"));`);
    this.addSql(`alter table "traffic_daily_stats" add constraint "traffic_daily_stats_date_source_unique" unique ("date", "source");`);

    this.addSql(`alter table "product_view_daily_stats" add constraint "product_view_daily_stats_product_id_foreign" foreign key ("product_id") references "products" ("id") on delete cascade;`);
    this.addSql(`alter table "product_view_daily_stats" add constraint "product_view_daily_stats_funnel_check" check (views >= add_to_carts);`);
    this.addSql(`alter table "product_view_daily_stats" add constraint "product_view_daily_stats_views_check" check (views >= 0);`);
    this.addSql(`alter table "product_view_daily_stats" add constraint "product_view_daily_stats_add_to_carts_check" check (add_to_carts >= 0);`);

    this.addSql(`alter table "traffic_daily_stats" add constraint "traffic_daily_stats_funnel_check" check (sessions >= product_views and product_views >= add_to_carts and add_to_carts >= checkouts_started);`);
    this.addSql(`alter table "traffic_daily_stats" add constraint "traffic_daily_stats_sessions_check" check (sessions >= 0);`);
    this.addSql(`alter table "traffic_daily_stats" add constraint "traffic_daily_stats_product_views_check" check (product_views >= 0);`);
    this.addSql(`alter table "traffic_daily_stats" add constraint "traffic_daily_stats_add_to_carts_check" check (add_to_carts >= 0);`);
    this.addSql(`alter table "traffic_daily_stats" add constraint "traffic_daily_stats_checkouts_started_check" check (checkouts_started >= 0);`);
    this.addSql(`alter table "traffic_daily_stats" add constraint "traffic_daily_stats_source_check" check ("source" in ('direct', 'organic', 'social', 'email', 'paid'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "product_view_daily_stats" cascade;`);
    this.addSql(`drop table if exists "traffic_daily_stats" cascade;`);
  }

}

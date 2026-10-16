import { Migration } from '@mikro-orm/migrations';

/**
 * Adds the fixed-window counters for the order-lookup rate limit (cart spec A15, Phase 3).
 * Additive: `down` drops only the new table.
 */
export class Migration20261016132222_rate_limit_buckets extends Migration {

  override name = 'Migration20261016132222_rate_limit_buckets';

  override up(): void | Promise<void> {
    this.addSql(`create table "rate_limit_buckets" ("key" text not null, "window_start" timestamptz not null, "count" int not null, primary key ("key", "window_start"));`);

    this.addSql(`alter table "rate_limit_buckets" add constraint "rate_limit_buckets_count_check" check (count >= 0);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "rate_limit_buckets" cascade;`);
  }

}

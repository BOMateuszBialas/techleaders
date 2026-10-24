import { Migration } from '@mikro-orm/migrations';

/**
 * Links an order to the customer account it was placed with (E07 spec, Phase 2, Data Model):
 * a nullable `orders.customer_id` with a foreign key `on delete restrict` (an account row can
 * never be deleted from under its orders) and the "My orders" index. No backfill: every existing
 * order stays a guest order (A3).
 *
 * Rollback (owner decision D-d): dropping the column while account orders exist would turn them
 * into guest orders that open by their reference again (A2), so `down` first raises when any
 * order has a customer and changes nothing; fixes then go forward only, with a new migration.
 */
export class Migration20261024193652_orders_customer extends Migration {

  override name = 'Migration20261024193652_orders_customer';

  override up(): void | Promise<void> {
    this.addSql(`alter table "orders" add "customer_id" uuid null;`);
    this.addSql(`alter table "orders" add constraint "orders_customer_id_foreign" foreign key ("customer_id") references "customer_users" ("id") on delete restrict;`);
    this.addSql(`create index "orders_customer_id_created_at_index" on "orders" ("customer_id", "created_at");`);
  }

  override down(): void | Promise<void> {
    // Locked first (the migration runs in one transaction), so no account order can be committed
    // between the check and the drop.
    this.addSql(`lock table "orders" in share row exclusive mode;`);
    this.addSql(`do $$ begin if exists (select 1 from "orders" where "customer_id" is not null) then raise exception 'orders_customer down refused: account orders exist; roll forward instead'; end if; end $$;`);
    this.addSql(`alter table "orders" drop constraint "orders_customer_id_foreign";`);

    this.addSql(`drop index "orders_customer_id_created_at_index";`);
    this.addSql(`alter table "orders" drop column "customer_id";`);
  }

}

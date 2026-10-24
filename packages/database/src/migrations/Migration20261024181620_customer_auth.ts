import { Migration } from '@mikro-orm/migrations';

/**
 * Customer authentication tables for the second Better Auth instance (E07 spec A1, Phase 1).
 * Mirrors Better Auth 1.7.10's generated customer schema (spec "Spike results", item g) and adds
 * the role check the generated SQL lacks. Additive: no existing table changes and nothing points
 * at these tables yet, so `down` drops only them. Once Phase 2 adds `orders.customer_id`, its own
 * `down` must run first (the foreign key), and it refuses while account orders exist.
 */
export class Migration20261024181620_customer_auth extends Migration {

  override name = 'Migration20261024181620_customer_auth';

  override up(): void | Promise<void> {
    this.addSql(`create table "customer_rate_limits" ("id" uuid not null default gen_random_uuid(), "key" text not null, "count" int not null, "last_request" bigint not null, primary key ("id"));`);
    this.addSql(`alter table "customer_rate_limits" add constraint "customer_rate_limits_key_unique" unique ("key");`);

    this.addSql(`create table "customer_users" ("id" uuid not null default gen_random_uuid(), "name" text not null, "email" text not null, "email_verified" boolean not null, "image" text null, "role" text not null default 'customer', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`alter table "customer_users" add constraint "customer_users_email_unique" unique ("email");`);

    this.addSql(`create table "customer_sessions" ("id" uuid not null default gen_random_uuid(), "user_id" uuid not null, "token" text not null, "expires_at" timestamptz not null, "ip_address" text null, "user_agent" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "customer_sessions_user_id_index" on "customer_sessions" ("user_id");`);
    this.addSql(`alter table "customer_sessions" add constraint "customer_sessions_token_unique" unique ("token");`);

    this.addSql(`create table "customer_accounts" ("id" uuid not null default gen_random_uuid(), "user_id" uuid not null, "account_id" text not null, "provider_id" text not null, "access_token" text null, "refresh_token" text null, "id_token" text null, "access_token_expires_at" timestamptz null, "refresh_token_expires_at" timestamptz null, "scope" text null, "password" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "customer_accounts_user_id_index" on "customer_accounts" ("user_id");`);

    this.addSql(`create table "customer_verifications" ("id" uuid not null default gen_random_uuid(), "identifier" text not null, "value" text not null, "expires_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "customer_verifications_identifier_index" on "customer_verifications" ("identifier");`);

    this.addSql(`alter table "customer_users" add constraint "customer_users_role_check" check ("role" in ('customer'));`);

    this.addSql(`alter table "customer_sessions" add constraint "customer_sessions_user_id_foreign" foreign key ("user_id") references "customer_users" ("id") on delete cascade;`);

    this.addSql(`alter table "customer_accounts" add constraint "customer_accounts_user_id_foreign" foreign key ("user_id") references "customer_users" ("id") on delete cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "customer_sessions" drop constraint "customer_sessions_user_id_foreign";`);
    this.addSql(`alter table "customer_accounts" drop constraint "customer_accounts_user_id_foreign";`);

    this.addSql(`drop table if exists "customer_rate_limits" cascade;`);
    this.addSql(`drop table if exists "customer_users" cascade;`);
    this.addSql(`drop table if exists "customer_sessions" cascade;`);
    this.addSql(`drop table if exists "customer_accounts" cascade;`);
    this.addSql(`drop table if exists "customer_verifications" cascade;`);
  }

}

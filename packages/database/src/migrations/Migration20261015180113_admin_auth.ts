import { Migration } from '@mikro-orm/migrations';

/**
 * Admin authentication tables for Better Auth (spec 2026-10-15-admin-authentication).
 * Mirrors Better Auth 1.7.10's generated schema; adds the role check and updated_at defaults.
 */
export class Migration20261015180113_admin_auth extends Migration {

  override name = 'Migration20261015180113_admin_auth';

  override up(): void | Promise<void> {
    this.addSql(`create table "admin_rate_limits" ("id" uuid not null default gen_random_uuid(), "key" text not null, "count" int not null, "last_request" bigint not null, primary key ("id"));`);
    this.addSql(`alter table "admin_rate_limits" add constraint "admin_rate_limits_key_unique" unique ("key");`);

    this.addSql(`create table "admin_users" ("id" uuid not null default gen_random_uuid(), "name" text not null, "email" text not null, "email_verified" boolean not null, "image" text null, "role" text not null default 'owner', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`alter table "admin_users" add constraint "admin_users_email_unique" unique ("email");`);

    this.addSql(`create table "admin_sessions" ("id" uuid not null default gen_random_uuid(), "user_id" uuid not null, "token" text not null, "expires_at" timestamptz not null, "ip_address" text null, "user_agent" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "admin_sessions_user_id_index" on "admin_sessions" ("user_id");`);
    this.addSql(`alter table "admin_sessions" add constraint "admin_sessions_token_unique" unique ("token");`);

    this.addSql(`create table "admin_accounts" ("id" uuid not null default gen_random_uuid(), "user_id" uuid not null, "account_id" text not null, "provider_id" text not null, "access_token" text null, "refresh_token" text null, "id_token" text null, "access_token_expires_at" timestamptz null, "refresh_token_expires_at" timestamptz null, "scope" text null, "password" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "admin_accounts_user_id_index" on "admin_accounts" ("user_id");`);

    this.addSql(`create table "admin_verifications" ("id" uuid not null default gen_random_uuid(), "identifier" text not null, "value" text not null, "expires_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "admin_verifications_identifier_index" on "admin_verifications" ("identifier");`);

    this.addSql(`alter table "admin_users" add constraint "admin_users_role_check" check ("role" in ('owner'));`);

    this.addSql(`alter table "admin_sessions" add constraint "admin_sessions_user_id_foreign" foreign key ("user_id") references "admin_users" ("id") on delete cascade;`);

    this.addSql(`alter table "admin_accounts" add constraint "admin_accounts_user_id_foreign" foreign key ("user_id") references "admin_users" ("id") on delete cascade;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "admin_sessions" drop constraint "admin_sessions_user_id_foreign";`);
    this.addSql(`alter table "admin_accounts" drop constraint "admin_accounts_user_id_foreign";`);

    this.addSql(`drop table if exists "admin_rate_limits" cascade;`);
    this.addSql(`drop table if exists "admin_users" cascade;`);
    this.addSql(`drop table if exists "admin_sessions" cascade;`);
    this.addSql(`drop table if exists "admin_accounts" cascade;`);
    this.addSql(`drop table if exists "admin_verifications" cascade;`);
  }

}

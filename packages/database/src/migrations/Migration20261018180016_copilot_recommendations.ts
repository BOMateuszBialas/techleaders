import { Migration } from '@mikro-orm/migrations';

/**
 * Adds Commerce Copilot's recommendation records (Copilot spec Phase 4, #26; A13–A15, A20):
 * every answered question's recommendations, with both answer origins (`llm`, `rules` and the
 * fallback reason), the evidence rows including demo-traffic flags, and the owner's status
 * (`new`, `saved`, `dismissed`, `completed`) with the time of the decision. Additive: no
 * existing table changes and no foreign key points at store tables, so `down` drops only this
 * table.
 */
export class Migration20261018180016_copilot_recommendations extends Migration {

  override name = 'Migration20261018180016_copilot_recommendations';

  override up(): void | Promise<void> {
    this.addSql(`create table "copilot_recommendations" ("id" uuid not null default gen_random_uuid(), "answer_id" uuid not null, "intent" text not null, "origin" text not null, "fallback_reason" text null, "provider" text null, "model" text null, "prompt_version" text null, "period_from" timestamptz not null, "period_to" timestamptz not null, "title" varchar(160) not null, "priority" text not null, "observation" text not null, "reasoning" text not null, "suggested_action" text not null, "evidence" jsonb not null, "limitations" jsonb not null default '[]', "related_product_ids" jsonb not null default '[]', "status" text not null default 'new', "status_changed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "copilot_recommendations_answer_id_index" on "copilot_recommendations" ("answer_id");`);
    this.addSql(`create index "copilot_recommendations_status_created_at_index" on "copilot_recommendations" ("status", "created_at");`);

    this.addSql(`alter table "copilot_recommendations" add constraint "copilot_recommendations_fallback_check" check (origin = 'rules' or fallback_reason is null);`);
    this.addSql(`alter table "copilot_recommendations" add constraint "copilot_recommendations_provider_check" check (origin = 'llm' or (provider is null and model is null and prompt_version is null));`);
    this.addSql(`alter table "copilot_recommendations" add constraint "copilot_recommendations_period_check" check (period_from < period_to);`);
    this.addSql(`alter table "copilot_recommendations" add constraint "copilot_recommendations_evidence_check" check (jsonb_typeof(evidence) = 'array');`);
    this.addSql(`alter table "copilot_recommendations" add constraint "copilot_recommendations_limitations_check" check (jsonb_typeof(limitations) = 'array');`);
    this.addSql(`alter table "copilot_recommendations" add constraint "copilot_recommendations_related_products_check" check (jsonb_typeof(related_product_ids) = 'array');`);
    this.addSql(`alter table "copilot_recommendations" add constraint "copilot_recommendations_status_changed_at_check" check ((status = 'new') = (status_changed_at is null));`);
    this.addSql(`alter table "copilot_recommendations" add constraint "copilot_recommendations_intent_check" check ("intent" in ('focus', 'top_products', 'low_stock', 'sales_change', 'traffic_sources', 'funnel', 'views_without_sales'));`);
    this.addSql(`alter table "copilot_recommendations" add constraint "copilot_recommendations_origin_check" check ("origin" in ('llm', 'rules'));`);
    this.addSql(`alter table "copilot_recommendations" add constraint "copilot_recommendations_fallback_reason_check" check ("fallback_reason" in ('not_configured', 'timeout', 'rate_limited', 'provider_error', 'auth', 'refused', 'daily_limit', 'invalid_output'));`);
    this.addSql(`alter table "copilot_recommendations" add constraint "copilot_recommendations_priority_check" check ("priority" in ('high', 'medium', 'low'));`);
    this.addSql(`alter table "copilot_recommendations" add constraint "copilot_recommendations_status_check" check ("status" in ('new', 'saved', 'dismissed', 'completed'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "copilot_recommendations" cascade;`);
  }

}

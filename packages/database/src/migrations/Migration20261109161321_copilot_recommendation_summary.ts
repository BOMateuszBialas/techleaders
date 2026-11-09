import { Migration } from '@mikro-orm/migrations';

/**
 * Stores the answer's summary with its recommendations (Copilot spec, GAP-01 of the cross-model
 * review of 2026-11-09). Additive and nullable: rows stored before this migration keep a null
 * summary. Generated from the entity change with `npm run db:migration:create`.
 */
export class Migration20261109161321_copilot_recommendation_summary extends Migration {

  override name = 'Migration20261109161321_copilot_recommendation_summary';

  override up(): void | Promise<void> {
    this.addSql(`alter table "copilot_recommendations" add "summary" text null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "copilot_recommendations" drop column "summary";`);
  }

}

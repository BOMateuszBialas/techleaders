import { Migration } from '@mikro-orm/migrations';

export class Migration20261026173123 extends Migration {

  override name = 'Migration20261026173123';

  override up(): void | Promise<void> {
    this.addSql(`alter table "products" add "technical_specs" jsonb not null default '[]';`);
    this.addSql(`alter table "products" add constraint "products_technical_specs_check" check (jsonb_typeof(technical_specs) = 'array');`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "products" drop constraint "products_technical_specs_check";`);
    this.addSql(`alter table "products" drop column "technical_specs";`);
  }

}

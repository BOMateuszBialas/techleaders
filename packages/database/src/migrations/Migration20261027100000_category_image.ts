import { Migration } from '@mikro-orm/migrations';

/**
 * Adds the nullable `categories.image_url` for the home page's category tiles (OA-11a). Additive:
 * every existing category stays null and shows "No photo yet" until an owner sets a photo or the
 * one-off data update `Migration20261027100100_demo_category_images` sets the seeded demo photos.
 */
export class Migration20261027100000_category_image extends Migration {

  override name = 'Migration20261027100000_category_image';

  override up(): void | Promise<void> {
    this.addSql(`alter table "categories" add "image_url" varchar(2048) null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "categories" drop column "image_url";`);
  }

}

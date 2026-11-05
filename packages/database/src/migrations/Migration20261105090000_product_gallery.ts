import { Migration } from '@mikro-orm/migrations';

/**
 * Product gallery (storefront visual polish, 2026-11-05): every product gets a list of further
 * photos, shown as thumbnails under the main one. The column defaults to an empty list, so an
 * existing row is valid before the backfill below runs.
 *
 * The backfill is demo data and is stated as such: each product that already has a main photo
 * gets four more copies of that same photo, so the thumbnail row shows on the demo catalogue. The
 * admin cannot edit these photos yet. Replace them with the product's own photos when there are
 * some (a later change in the admin). Only rows whose list is still empty are changed, so a value
 * written later is never overwritten.
 *
 * `down` drops the column, which removes the list for every product.
 */
export class Migration20261105090000_product_gallery extends Migration {

  override name = 'Migration20261105090000_product_gallery';

  override up(): void | Promise<void> {
    this.addSql(`alter table "products" add column "additional_image_urls" jsonb not null default '[]';`);
    this.addSql(`update "products" set "additional_image_urls" = jsonb_build_array("image_url", "image_url", "image_url", "image_url") where "image_url" is not null and "additional_image_urls" = '[]'::jsonb;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "products" drop column "additional_image_urls";`);
  }

}

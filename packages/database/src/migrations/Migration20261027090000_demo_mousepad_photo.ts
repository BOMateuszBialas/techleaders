import { Migration } from '@mikro-orm/migrations';

/**
 * One-off data update for existing databases (storefront v2, OA-4b follow-up): gives the seeded
 * Glide XL mousepad its photo. The seeder is insert-only, so a row created by an earlier seed keeps
 * the demo SVG until this runs, and the storefront shows "No photo yet" for it.
 *
 * Scope, by the seed's own discriminators (both the SKU and the slug must match):
 * - `glide-xl-mousepad` (DEMO-PAD-001): `/photos/product-mouse-pad.jpg`.
 * The other mousepads and the monitor have no photo in the seed and are not touched.
 *
 * Owner data is never overwritten: the photo is set only where `image_url` still holds the seeded
 * SVG path. The update is data only and idempotent (a second run matches no row). It never touches
 * `stock_quantity`, prices, statuses, orders or any row that is not seeded demo data.
 *
 * `down` reverses exactly what `up` sets: it puts back the SVG path only where the value is still
 * the photo this migration wrote, so an owner's later edit is left alone.
 */
const GLIDE = { slug: 'glide-xl-mousepad', sku: 'DEMO-PAD-001' };

const PHOTO = {
  ...GLIDE,
  svg: '/demo/products/glide-xl-mousepad.svg',
  photo: '/photos/product-mouse-pad.jpg',
};

export class Migration20261027090000_demo_mousepad_photo extends Migration {

  override name = 'Migration20261027090000_demo_mousepad_photo';

  override up(): void | Promise<void> {
    this.addSql(`update "products" set "image_url" = '${PHOTO.photo}' where "slug" = '${PHOTO.slug}' and "sku" = '${PHOTO.sku}' and "image_url" = '${PHOTO.svg}';`);
  }

  override down(): void | Promise<void> {
    this.addSql(`update "products" set "image_url" = '${PHOTO.svg}' where "slug" = '${PHOTO.slug}' and "sku" = '${PHOTO.sku}' and "image_url" = '${PHOTO.photo}';`);
  }

}

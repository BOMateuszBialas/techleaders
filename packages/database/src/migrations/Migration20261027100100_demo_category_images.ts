import { Migration } from '@mikro-orm/migrations';

/**
 * One-off data update for existing databases (OA-4c, after OA-11a): gives the seeded demo
 * categories their tile photo. The seeder is insert-only, so categories created by an earlier seed
 * have a null `image_url` and show "No photo yet" until this runs. The schema change is
 * `Migration20261027100000_category_image`.
 *
 * Scope, by the seeded category slug: `mice`, `headsets`, `controllers`, `mousepads` and
 * `keyboards` (the keyboard tile reuses `/photos/product-keyboard-rgb.jpg` by owner decision, see
 * `packages/app/public/photos/CREDITS.md`). No monitors category or monitors photo exists.
 *
 * Owner data is never overwritten: the photo is set only where `image_url` is still null, so a
 * photo an owner chose, or cleared on purpose, is only replaced when it is null. The update is data
 * only and idempotent (a second run matches no row). It never touches `name`, `description`,
 * products, stock, prices, statuses or orders.
 *
 * `down` reverses exactly what `up` sets: it puts null back only where the value is still the path
 * this migration wrote, so an owner's later edit is left alone.
 */
const PHOTOS = [
  { slug: 'mice', photo: '/photos/category-mice.jpg' },
  { slug: 'keyboards', photo: '/photos/product-keyboard-rgb.jpg' },
  { slug: 'headsets', photo: '/photos/category-headsets.jpg' },
  { slug: 'controllers', photo: '/photos/category-controllers.jpg' },
  { slug: 'mousepads', photo: '/photos/category-mouse-pads.jpg' },
];

export class Migration20261027100100_demo_category_images extends Migration {

  override name = 'Migration20261027100100_demo_category_images';

  override up(): void | Promise<void> {
    for (const row of PHOTOS) {
      this.addSql(`update "categories" set "image_url" = '${row.photo}' where "slug" = '${row.slug}' and "image_url" is null;`);
    }
  }

  override down(): void | Promise<void> {
    for (const row of PHOTOS) {
      this.addSql(`update "categories" set "image_url" = null where "slug" = '${row.slug}' and "image_url" = '${row.photo}';`);
    }
  }

}

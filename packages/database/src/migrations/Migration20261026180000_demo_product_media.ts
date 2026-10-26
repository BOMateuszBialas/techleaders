import { Migration } from '@mikro-orm/migrations';

/**
 * One-off data update for existing databases (storefront v2, Phase 3, OA-4b): gives the seeded
 * demo products their photo and, for the Vortex mouse, their fictional technical rows. The seeder
 * is insert-only, so rows created by an earlier seed keep the old SVG image and empty
 * `technical_specs` until this runs.
 *
 * Scope, by the seed's own discriminators (both the SKU and the slug must match):
 * - `vortex-wireless-mouse` (DEMO-MOU-001): `/photos/product-mouse-black.jpg` and its technical rows;
 * - `nova-tkl-mechanical-keyboard` (DEMO-KEY-001): `/photos/product-keyboard-rgb.jpg`;
 * - `echo-surround-headset` (DEMO-HEA-001): `/photos/product-headset-black.jpg`.
 * Demo products without a photo (the Pulse, Titan, Strike, Aurora, headset and controller rows,
 * the mousepads) keep their value and show "No photo yet".
 *
 * Owner data is never overwritten: the photo is set only where `image_url` still holds the seeded
 * SVG path, and the technical rows only where `technical_specs` is still the empty array. The
 * update is data only and idempotent (a second run matches no row). It never touches
 * `stock_quantity`, prices, statuses, orders or any row that is not seeded demo data.
 *
 * `down` reverses exactly what `up` sets: it puts back the SVG path and the empty array only where
 * the value is still the one this migration wrote, so an owner's later edit is left alone.
 */
const VORTEX = { slug: 'vortex-wireless-mouse', sku: 'DEMO-MOU-001' };
const KEYBOARD = { slug: 'nova-tkl-mechanical-keyboard', sku: 'DEMO-KEY-001' };
const HEADSET = { slug: 'echo-surround-headset', sku: 'DEMO-HEA-001' };

const PHOTOS = [
  { ...VORTEX, svg: '/demo/products/vortex-wireless-mouse.svg', photo: '/photos/product-mouse-black.jpg' },
  { ...KEYBOARD, svg: '/demo/products/nova-tkl-mechanical-keyboard.svg', photo: '/photos/product-keyboard-rgb.jpg' },
  { ...HEADSET, svg: '/demo/products/echo-surround-headset.svg', photo: '/photos/product-headset-black.jpg' },
];

const TECHNICAL_SPECS = `[{"label":"Switch type","value":"Optical-mechanical (fictional)"},{"label":"Connection","value":"2.4 GHz wireless and USB-C (fictional)"},{"label":"Weight","value":"65 g (fictional)"},{"label":"Dimensions","value":"118 × 62 × 38 mm (fictional)"},{"label":"Warranty","value":"24 months (fictional, AS-10)"}]`;

export class Migration20261026180000_demo_product_media extends Migration {

  override name = 'Migration20261026180000_demo_product_media';

  override up(): void | Promise<void> {
    for (const row of PHOTOS) {
      this.addSql(`update "products" set "image_url" = '${row.photo}' where "slug" = '${row.slug}' and "sku" = '${row.sku}' and "image_url" = '${row.svg}';`);
    }
    this.addSql(`update "products" set "technical_specs" = '${TECHNICAL_SPECS}'::jsonb where "slug" = '${VORTEX.slug}' and "sku" = '${VORTEX.sku}' and "technical_specs" = '[]'::jsonb;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`update "products" set "technical_specs" = '[]'::jsonb where "slug" = '${VORTEX.slug}' and "sku" = '${VORTEX.sku}' and "technical_specs" = '${TECHNICAL_SPECS}'::jsonb;`);
    for (const row of PHOTOS) {
      this.addSql(`update "products" set "image_url" = '${row.svg}' where "slug" = '${row.slug}' and "sku" = '${row.sku}' and "image_url" = '${row.photo}';`);
    }
  }

}

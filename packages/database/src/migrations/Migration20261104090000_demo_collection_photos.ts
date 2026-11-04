import { Migration } from '@mikro-orm/migrations';

/**
 * One-off data update for existing databases (storefront refresh, 2026-11-04): every seeded demo
 * product in a collection gets a photo from that collection, so the storefront shows no "No photo
 * yet" placeholder for the demo catalogue. Each collection reuses a photo the store already has
 * (the Vortex, Nova, Echo and Glide photos, or the controllers category photo). These photos are
 * stand-ins for the collection, not pictures of each product: replace them with the product's own
 * photo from the admin when you have it.
 *
 * Scope, by the seed's own discriminators (both the SKU and the slug must match, as in the other
 * demo media migrations). Only rows that still hold the seeded SVG path are changed:
 * - mice: `pulse-ultralight-mouse` (DEMO-MOU-002), `titan-mmo-mouse` (DEMO-MOU-003)
 *   → `/photos/product-mouse-black.jpg`
 * - headsets: `drift-wireless-headset` (DEMO-HEA-002), `nimbus-stereo-headset` (DEMO-HEA-003)
 *   → `/photos/product-headset-black.jpg`
 * - keyboards: `aurora-full-size-keyboard` (DEMO-KEY-003), `strike-60-keyboard` (DEMO-KEY-002)
 *   → `/photos/product-keyboard-rgb.jpg`
 * - controllers: `apex-wireless-controller` (DEMO-CON-001), `retro-wired-controller`
 *   (DEMO-CON-002), `arena-fight-stick` (DEMO-CON-003) → `/photos/category-controllers.jpg`
 * - mousepads: `control-cloth-mousepad` (DEMO-PAD-002), `tempered-glass-mousepad` (DEMO-PAD-003)
 *   → `/photos/product-mouse-pad.jpg`
 *
 * Owner data is never overwritten: a row changes only where `image_url` still holds the seeded
 * SVG path. The update is data only and idempotent (a second run matches no row). It never touches
 * `stock_quantity`, prices, statuses, orders or any row that is not seeded demo data.
 *
 * `down` reverses exactly what `up` sets: it puts back the SVG path only where the value is still
 * the photo this migration wrote, so an owner's later edit is left alone.
 */
const DEMO_PHOTOS = [
  { slug: 'pulse-ultralight-mouse', sku: 'DEMO-MOU-002', photo: '/photos/product-mouse-black.jpg' },
  { slug: 'titan-mmo-mouse', sku: 'DEMO-MOU-003', photo: '/photos/product-mouse-black.jpg' },
  { slug: 'drift-wireless-headset', sku: 'DEMO-HEA-002', photo: '/photos/product-headset-black.jpg' },
  { slug: 'nimbus-stereo-headset', sku: 'DEMO-HEA-003', photo: '/photos/product-headset-black.jpg' },
  { slug: 'aurora-full-size-keyboard', sku: 'DEMO-KEY-003', photo: '/photos/product-keyboard-rgb.jpg' },
  { slug: 'strike-60-keyboard', sku: 'DEMO-KEY-002', photo: '/photos/product-keyboard-rgb.jpg' },
  { slug: 'apex-wireless-controller', sku: 'DEMO-CON-001', photo: '/photos/category-controllers.jpg' },
  { slug: 'retro-wired-controller', sku: 'DEMO-CON-002', photo: '/photos/category-controllers.jpg' },
  { slug: 'arena-fight-stick', sku: 'DEMO-CON-003', photo: '/photos/category-controllers.jpg' },
  { slug: 'control-cloth-mousepad', sku: 'DEMO-PAD-002', photo: '/photos/product-mouse-pad.jpg' },
  { slug: 'tempered-glass-mousepad', sku: 'DEMO-PAD-003', photo: '/photos/product-mouse-pad.jpg' },
].map((row) => ({ ...row, svg: `/demo/products/${row.slug}.svg` }));

export class Migration20261104090000_demo_collection_photos extends Migration {

  override name = 'Migration20261104090000_demo_collection_photos';

  override up(): void | Promise<void> {
    for (const row of DEMO_PHOTOS) {
      this.addSql(`update "products" set "image_url" = '${row.photo}' where "slug" = '${row.slug}' and "sku" = '${row.sku}' and "image_url" = '${row.svg}';`);
    }
  }

  override down(): void | Promise<void> {
    for (const row of DEMO_PHOTOS) {
      this.addSql(`update "products" set "image_url" = '${row.svg}' where "slug" = '${row.slug}' and "sku" = '${row.sku}' and "image_url" = '${row.photo}';`);
    }
  }

}

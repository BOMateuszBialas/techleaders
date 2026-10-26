/**
 * The photo rule of the storefront (storefront v2 spec, "Photo mapping", Q8): an item has a photo
 * only when its image path starts with `/photos/`. Anything else (a demo SVG under `/demo/`, an
 * empty value, null, a remote URL) has no photo and shows the "No photo yet" placeholder. The
 * rule lives here only; `ProductImage` and the category tiles ask this module.
 */
export const PHOTO_PATH_PREFIX = "/photos/";

/** The image to show for a stored image path, or null when the item has no photo. */
export function photoSrc(imageUrl: string | null | undefined): string | null {
  return imageUrl?.startsWith(PHOTO_PATH_PREFIX) ? imageUrl : null;
}

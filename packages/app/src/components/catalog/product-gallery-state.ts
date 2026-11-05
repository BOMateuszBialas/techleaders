/** View logic of the product gallery (storefront v2, Phase 3, Q9). No React here. */

/**
 * The gallery's photos in order: the main image, then the further ones. An empty main image is
 * skipped, so a product without a photo shows none. Thumbnails appear from two images (Q9).
 */
export function galleryImageUrls(imageUrl: string | null, additionalImageUrls: string[]): string[] {
  return imageUrl ? [imageUrl, ...additionalImageUrls] : [];
}

/** Thumbnails are a row of buttons only for two or more images. */
export function showsThumbnails(imageCount: number): boolean {
  return imageCount >= 2;
}

/** Accessible name of a thumbnail button, e.g. "Show image 2 of 3". */
export function thumbnailLabel(index: number, imageCount: number): string {
  return `Show image ${index + 1} of ${imageCount}`;
}

/**
 * The index a thumbnail key moves to (roving focus in the thumbnail row): arrows move by one and
 * wrap, Home and End jump to the ends. Null for any other key.
 */
export function nextThumbnailIndex(
  current: number,
  imageCount: number,
  key: string,
): number | null {
  if (imageCount === 0) return null;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % imageCount;
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + imageCount) % imageCount;
    case "Home":
      return 0;
    case "End":
      return imageCount - 1;
    default:
      return null;
  }
}

/** The photo before or after the active one, wrapping at both ends (the arrows of the gallery). */
export function stepThumbnail(current: number, imageCount: number, step: 1 | -1): number {
  return (current + step + imageCount) % imageCount;
}

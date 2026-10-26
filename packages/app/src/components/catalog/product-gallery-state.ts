/** View logic of the product gallery (storefront v2, Phase 3, Q9). No React here. */

/** The gallery shows one image now; thumbnails appear from two images (Q9). */
export function galleryImageUrls(imageUrl: string | null): string[] {
  return imageUrl ? [imageUrl] : [];
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

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEMO_CATALOG } from "./DatabaseSeeder";

/** Storefront photos are served from the app's public folder (storefront v2, photo mapping). */
const PHOTOS_DIR = new URL("../../../app/public/photos/", import.meta.url);

const mappedPhotos = DEMO_CATALOG.products
  .map((product) => product.imageUrl)
  .filter((imageUrl): imageUrl is string => imageUrl?.startsWith("/photos/") === true);

describe("seeded photos", () => {
  it("maps at least one product to a photo", () => {
    expect(mappedPhotos.length).toBeGreaterThan(0);
  });

  it.each(mappedPhotos)("%s has a file and a CREDITS.md line", (imageUrl) => {
    const fileName = imageUrl.slice("/photos/".length);
    expect(existsSync(new URL(fileName, PHOTOS_DIR))).toBe(true);
    const credits = readFileSync(new URL("CREDITS.md", PHOTOS_DIR), "utf8");
    expect(credits).toContain(`| ${fileName} |`);
  });
});

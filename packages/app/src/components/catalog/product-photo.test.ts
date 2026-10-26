import { describe, expect, it } from "vitest";
import { photoSrc } from "./product-photo";

describe("photoSrc (storefront photo rule)", () => {
  it("shows a path under /photos/", () => {
    expect(photoSrc("/photos/product-mouse-black.jpg")).toBe("/photos/product-mouse-black.jpg");
  });

  it("has no photo for a demo SVG, a remote URL, an empty value or null", () => {
    expect(photoSrc("/demo/products/vortex-wireless-mouse.svg")).toBeNull();
    expect(photoSrc("https://cdn.example.com/photos/x.jpg")).toBeNull();
    expect(photoSrc("")).toBeNull();
    expect(photoSrc(null)).toBeNull();
    expect(photoSrc(undefined)).toBeNull();
  });

  it("requires the prefix at the start of the path", () => {
    expect(photoSrc("photos/product-mouse-black.jpg")).toBeNull();
    expect(photoSrc("/demo/photos/product-mouse-black.jpg")).toBeNull();
  });
});

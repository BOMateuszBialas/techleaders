import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductThumbnail } from "./product-thumbnail";

describe("ProductThumbnail", () => {
  it("shows a square photo at the given width", () => {
    const html = renderToStaticMarkup(
      createElement(ProductThumbnail, {
        imageUrl: "/photos/product-mouse-black.jpg",
        name: "Vortex Wireless Mouse",
        widthClassName: "w-14",
      }),
    );
    expect(html).toContain("<img");
    expect(html).toContain("w-14 shrink-0");
    expect(html).toContain('alt="Vortex Wireless Mouse"');
  });

  it("shows nothing for a product without a photo", () => {
    for (const imageUrl of [null, undefined, "/demo/products/vortex-wireless-mouse.svg"]) {
      const html = renderToStaticMarkup(
        createElement(ProductThumbnail, { imageUrl, name: "Vortex", widthClassName: "w-14" }),
      );
      expect(html).toBe("");
    }
  });
});

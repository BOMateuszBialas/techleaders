import { money, type CatalogProductSummary } from "@commerceos/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AvailabilityBadge } from "./availability-badge";
import {
  emptyListingMessage,
  isLocalDemoImage,
  listingLimitNotice,
  productsHref,
} from "./catalog-copy";
import { CategoryNav } from "./category-nav";
import { ProductCard } from "./product-card";
import { ProductImage } from "./product-image";

const product: CatalogProductSummary = {
  id: "p-1",
  slug: "vortex-wireless-mouse",
  name: "Vortex Wireless Mouse",
  price: money(24900, "PLN"),
  category: { slug: "mice", name: "Mice" },
  availability: "in_stock",
  imageUrl: "/photos/product-mouse-black.jpg",
};

const categories = [
  { slug: "keyboards", name: "Keyboards", description: null },
  { slug: "mice", name: "Mice", description: "Gaming mice" },
];

/** `formatMoney` separates the amount and currency with a no-break space. */
function plainText(html: string): string {
  return html.replace(/ /g, " ");
}

describe("catalog copy", () => {
  it("describes empty listings", () => {
    expect(emptyListingMessage(null)).toBe("No products are available yet.");
    expect(emptyListingMessage(categories[1]!)).toBe("No products in Mice yet.");
  });

  it("explains the listing cap only when more products match", () => {
    expect(listingLimitNotice(48, 48)).toBeNull();
    expect(listingLimitNotice(48, 60)).toBe(
      "Showing 48 of 60. Narrow your search or pick a category.",
    );
  });

  it("builds listing links", () => {
    expect(productsHref()).toBe("/products");
    expect(productsHref("mice")).toBe("/products?category=mice");
  });

  it("recognises local demo images", () => {
    expect(isLocalDemoImage("/demo/products/x.svg")).toBe(true);
    expect(isLocalDemoImage("https://cdn.example.com/x.png")).toBe(false);
  });
});

describe("AvailabilityBadge", () => {
  it("labels availability with text", () => {
    expect(
      renderToStaticMarkup(createElement(AvailabilityBadge, { availability: "in_stock" })),
    ).toContain(">In stock<");
    expect(
      renderToStaticMarkup(createElement(AvailabilityBadge, { availability: "out_of_stock" })),
    ).toContain(">Out of stock<");
  });
});

describe("ProductImage", () => {
  it("renders a mapped photo with the product name as alt text", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImage, { imageUrl: product.imageUrl, name: product.name, size: 320 }),
    );
    expect(html).toContain('src="/photos/product-mouse-black.jpg"');
    expect(html).toContain('alt="Vortex Wireless Mouse"');
    expect(html).not.toContain("No photo yet");
  });

  it("shows the placeholder, never the demo SVG or a remote image", () => {
    for (const imageUrl of [
      "/demo/products/vortex-wireless-mouse.svg",
      "https://cdn.example.com/vortex.png",
    ]) {
      const html = renderToStaticMarkup(
        createElement(ProductImage, { imageUrl, name: product.name, size: 320 }),
      );
      expect(html).toContain(">No photo yet<");
      expect(html).not.toContain(imageUrl);
    }
  });

  it("shows a placeholder without an image", () => {
    const html = renderToStaticMarkup(
      createElement(ProductImage, { imageUrl: null, name: product.name, size: 320 }),
    );
    // A text label, not an image: no role and no alt text (storefront v2 Q8).
    expect(html).not.toContain('role="img"');
    expect(html).not.toContain("<img");
    expect(html).toContain(">No photo yet<");
  });
});

describe("ProductCard", () => {
  it("shows name, link, formatted price, category and availability", () => {
    const html = plainText(renderToStaticMarkup(createElement(ProductCard, { product })));
    expect(html).toContain('href="/products/vortex-wireless-mouse"');
    expect(html).toContain(">Vortex Wireless Mouse<");
    expect(html).toContain("249,00 zł");
    expect(html).toContain(">Mice<");
    expect(html).toContain(">In stock<");
  });

  it("omits the category when the product has none", () => {
    const html = renderToStaticMarkup(
      createElement(ProductCard, {
        product: { ...product, category: null, availability: "out_of_stock" },
      }),
    );
    expect(html).not.toContain(">Mice<");
    expect(html).toContain(">Out of stock<");
  });
});

describe("CategoryNav", () => {
  function render(activeSlug?: string | null) {
    return renderToStaticMarkup(createElement(CategoryNav, { categories, activeSlug }));
  }

  it("links to all products and every category", () => {
    const html = render();
    expect(html).toContain('aria-label="Categories"');
    expect(html).toContain('href="/products"');
    expect(html).toContain('href="/products?category=mice"');
    expect(html).not.toContain("aria-current");
  });

  it("marks all products as current", () => {
    expect(render(null)).toMatch(/aria-current="page"[^>]*>All products</);
  });

  it("marks the selected category as current", () => {
    const html = render("mice");
    expect(html).toMatch(/aria-current="page"[^>]*>Mice</);
    expect(html.match(/aria-current/g)).toHaveLength(1);
  });
});

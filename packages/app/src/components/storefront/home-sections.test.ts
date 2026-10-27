import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BestSellers } from "./best-sellers";
import { CategoryTiles } from "./category-tiles";
import { HomeHero } from "./home-hero";
import { HomeSectionUnavailable } from "./home-section-unavailable";
import { LowStockBannerItem, PromoBannerItem } from "./promo-banners";
import { HOME_HERO, PROMO_BANNERS, WHY_BUY_HERE } from "./storefront-content";
import { WhyBuyHere } from "./why-buy-here";

const categories = [
  { slug: "mice", name: "Mice", productCount: 3, imageUrl: null },
  { slug: "mousepads", name: "Mousepads", productCount: 1, imageUrl: null },
];

describe("HomeHero", () => {
  it("renders the one h1, the approved copy, a link to the listing and a decorative photo", () => {
    const html = renderToStaticMarkup(createElement(HomeHero));
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain(HOME_HERO.headline);
    expect(html).toContain(HOME_HERO.description);
    expect(html).toContain(`href="/products"`);
    expect(html).toContain(">Shop all products</a>");
    expect(html).toContain('alt=""');
    expect(html).not.toMatch(/demo data/i);
  });
});

describe("PromoBannerItem", () => {
  it("renders a banner with its photo and a call to action", () => {
    const html = renderToStaticMarkup(
      createElement(PromoBannerItem, { banner: PROMO_BANNERS[1]! }),
    );
    expect(html).toContain("<h3");
    expect(html).toContain("Audio for calls");
    expect(html).toContain("Gaming headsets for PC and consoles.");
    expect(html).toContain('href="/products?category=headsets"');
    expect(html).toContain('alt="Black over-ear headset with a cable, seen from above"');
    expect(html).toContain("/photos/product-headset-black.jpg");
  });

  it("renders a banner without a photo when none is set", () => {
    const html = renderToStaticMarkup(
      createElement(PromoBannerItem, { banner: { ...PROMO_BANNERS[0]!, photo: null } }),
    );
    expect(html).not.toContain("<img");
    expect(html).toContain('href="/products?category=mousepads"');
  });
});

describe("LowStockBannerItem", () => {
  it("names the product with its stock and links to the product page", () => {
    const html = renderToStaticMarkup(
      createElement(LowStockBannerItem, {
        product: { slug: "titan-mmo-mouse", name: "Titan MMO Mouse", stockQuantity: 2 },
      }),
    );
    expect(html).toContain(">Low stock<");
    expect(html).toContain("Titan MMO Mouse: 2 left");
    expect(html).toContain('href="/products/titan-mmo-mouse"');
    expect(html).toContain(">View product</a>");
  });
});

describe("CategoryTiles", () => {
  it("shows each category with its count and the neutral photo label", () => {
    const html = renderToStaticMarkup(createElement(CategoryTiles, { categories }));
    expect(html).toContain('aria-labelledby="home-categories"');
    expect(html).toContain('href="/products?category=mice"');
    expect(html).toContain("3 products");
    expect(html).toContain("1 product<");
    expect(html.match(/No photo yet/g)).toHaveLength(2);
    expect(html).not.toContain("<img");
  });

  it("shows the category photo when it has one, and the label otherwise", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryTiles, {
        categories: [
          { slug: "mice", name: "Mice", productCount: 3, imageUrl: "/photos/category-mice.jpg" },
          { slug: "mousepads", name: "Mousepads", productCount: 1, imageUrl: null },
        ],
      }),
    );
    expect(html.match(/<img/g)).toHaveLength(1);
    expect(html).toContain('src="/photos/category-mice.jpg"');
    expect(html).toContain('alt=""');
    expect(html.match(/No photo yet/g)).toHaveLength(1);
  });

  it("does not show a demo SVG as a category photo (storefront photo rule)", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryTiles, {
        categories: [
          { slug: "mice", name: "Mice", productCount: 3, imageUrl: "/demo/products/x.svg" },
        ],
      }),
    );
    expect(html).not.toContain("<img");
    expect(html).toContain("No photo yet");
  });

  it("renders nothing when no category holds a published product", () => {
    expect(renderToStaticMarkup(createElement(CategoryTiles, { categories: [] }))).toBe("");
  });
});

describe("WhyBuyHere", () => {
  it("lists every item, with the delivery line labelled as an example", () => {
    const html = renderToStaticMarkup(createElement(WhyBuyHere, { items: WHY_BUY_HERE }));
    expect(html).toContain('aria-labelledby="home-why"');
    expect(html).toContain("Buy without an account");
    expect(html).toContain("Example policy: delivery in 1–3 working days, 14-day returns.");
    expect(html.match(/<li/g)).toHaveLength(WHY_BUY_HERE.length);
  });
});

describe("BestSellers", () => {
  it("lists the names in rank order, without numbers or a demo label", () => {
    const html = renderToStaticMarkup(
      createElement(BestSellers, { names: ["Vortex Wireless Mouse", "Titan MMO Mouse"] }),
    );
    expect(html).toContain('aria-labelledby="home-best"');
    expect(html.indexOf("Vortex Wireless Mouse")).toBeLessThan(html.indexOf("Titan MMO Mouse"));
    expect(html).not.toMatch(/demo/i);
  });

  it("renders nothing, not even the heading, when there are no best sellers", () => {
    expect(renderToStaticMarkup(createElement(BestSellers, { names: [] }))).toBe("");
  });
});

describe("HomeSectionUnavailable", () => {
  it("shows the section heading and the catalog message as an alert, never the cause", () => {
    const html = renderToStaticMarkup(
      createElement(HomeSectionUnavailable, { id: "home-best", title: "Best sellers" }),
    );
    expect(html).toContain("Best sellers");
    expect(html).toContain('role="alert"');
    expect(html).toContain("The catalog is temporarily unavailable.");
  });
});

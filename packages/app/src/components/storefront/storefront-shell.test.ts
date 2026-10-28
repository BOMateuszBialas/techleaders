import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { money, type CatalogProductSummary } from "@commerceos/core";
import { FeaturedSlider, FeaturedTabs } from "./featured-products";
import { HeaderMenu } from "./header-menu";
import { FooterCategoryLinks, SiteFooter } from "./site-footer";
import {
  FICTIONAL_COMPANY,
  featuredEmptyMessage,
  homeHref,
  STORE_NAME,
  STORE_TAGLINE,
} from "./storefront-copy";

const categories = [
  { slug: "keyboards", name: "Keyboards", description: null },
  { slug: "mice", name: "Mice", description: "Gaming mice" },
];

describe("storefront copy", () => {
  it("builds home page tab links", () => {
    expect(homeHref()).toBe("/");
    expect(homeHref("mice")).toBe("/?category=mice");
  });

  it("describes an empty featured slider", () => {
    expect(featuredEmptyMessage(null)).toBe("No featured products yet.");
    expect(featuredEmptyMessage(categories[1]!)).toBe("No featured products in Mice yet.");
  });
});

describe("HeaderMenu", () => {
  it("renders the menu inline for wide screens and behind a Categories disclosure for narrow ones", () => {
    const html = renderToStaticMarkup(createElement(HeaderMenu, { categories }));
    expect(html.match(/aria-label="Main"/g)).toHaveLength(2);
    expect(html.match(/>Shop all</g)).toHaveLength(2);
    expect(html.match(/href="\/products\?category=mice"/g)).toHaveLength(2);
    expect(html.match(/href="\/products\?category=keyboards"/g)).toHaveLength(2);
    expect(html).toMatch(
      /<details[^>]*data-slot="disclosure"[^>]*><summary[^>]*data-slot="disclosure-trigger"[^>]*>Categories<svg/,
    );
    expect(html).toContain('data-slot="disclosure-content"');
    expect(html).not.toContain("/admin");
  });

  it("keeps the static links while categories are loading or unavailable", () => {
    const html = renderToStaticMarkup(createElement(HeaderMenu, { categories: [] }));
    expect(html).toContain('href="/products"');
    expect(html).not.toContain("?category=");
  });
});

describe("SiteFooter", () => {
  it("shows the store line, the fictional company block, the streamed category links and the owner sign-in", () => {
    const html = renderToStaticMarkup(
      createElement(SiteFooter, {
        categoryLinks: createElement(FooterCategoryLinks, { categories }),
      }),
    );
    expect(html).toContain(STORE_TAGLINE);
    expect(html).toContain('aria-label="Footer categories"');
    expect(html).toContain('href="/products"');
    expect(html).toContain('href="/products?category=mice"');
    expect(html).toMatch(/href="\/admin"[^>]*>Owner sign-in</);
    expect(html).toContain(FICTIONAL_COMPANY.name);
    expect(html).toContain(FICTIONAL_COMPANY.label);
    expect(html).toContain(`© 2026 ${STORE_NAME}`);
  });

  it("shows no demo notice and no 'demo store' wording (A1, A2)", () => {
    const html = renderToStaticMarkup(
      createElement(SiteFooter, {
        categoryLinks: createElement(FooterCategoryLinks, { categories }),
      }),
    );
    expect(html.toLowerCase()).not.toContain("demo store");
    expect(html).not.toContain("Products and prices are fictional");
  });

  it("carries no address, tax number or contact in the company block (OA-8)", () => {
    const html = renderToStaticMarkup(
      createElement(SiteFooter, {
        categoryLinks: createElement(FooterCategoryLinks, { categories }),
      }),
    );
    expect(Object.keys(FICTIONAL_COMPANY).sort()).toEqual(["label", "name"]);
    expect(html).not.toMatch(/NIP|REGON|KRS|tax number:|@|\+48|ul\. /i);
  });

  it("lists only all products without categories", () => {
    const html = renderToStaticMarkup(createElement(FooterCategoryLinks, { categories: [] }));
    expect(html).toContain(">All products<");
    expect(html).not.toContain("?category=");
  });
});

const titan: CatalogProductSummary = {
  id: "p-2",
  slug: "titan-mmo-mouse",
  name: "Titan MMO Mouse",
  price: money(29900, "PLN"),
  category: { slug: "mice", name: "Mice" },
  availability: "out_of_stock",
  imageUrl: "/demo/products/titan-mmo-mouse.svg",
};

describe("FeaturedTabs", () => {
  it("renders tab links and marks only the active one as current", () => {
    const html = renderToStaticMarkup(
      createElement(FeaturedTabs, {
        tabs: [
          { key: "all", label: "All", href: "/", active: false },
          { key: "mice", label: "Mice", href: "/?category=mice", active: true },
        ],
      }),
    );
    expect(html).toContain('aria-label="Featured categories"');
    expect(html).toMatch(/href="\/"[^>]*>All</);
    expect(html).toContain('href="/?category=mice"');
    expect(html).toMatch(/aria-current="page"[^>]*>Mice</);
    expect(html.match(/aria-current/g)).toHaveLength(1);
  });
});

describe("FeaturedSlider", () => {
  it("renders a scroll-snap row of product cards, out-of-stock products labelled", () => {
    const html = renderToStaticMarkup(
      createElement(FeaturedSlider, { category: null, products: [titan] }),
    );
    expect(html).toMatch(
      /<ul aria-label="Featured products" class="[^"]*snap-x[^"]*overflow-x-auto/,
    );
    expect(html).toContain("snap-start");
    expect(html).toContain('href="/products/titan-mmo-mouse"');
    expect(html).toContain(">Out of stock<");
  });

  it("says a category has no featured products and links to its listing (spec G17)", () => {
    const html = renderToStaticMarkup(
      createElement(FeaturedSlider, { category: categories[1]!, products: [] }),
    );
    expect(html).toContain("No featured products in Mice yet.");
    expect(html).toMatch(/href="\/products\?category=mice"[^>]*>Browse all Mice</);
    expect(html).not.toContain("<ul");
  });

  it("links to every product when nothing is featured at all", () => {
    const html = renderToStaticMarkup(
      createElement(FeaturedSlider, { category: null, products: [] }),
    );
    expect(html).toContain("No featured products yet.");
    expect(html).toMatch(/href="\/products"[^>]*>Browse all products</);
  });
});

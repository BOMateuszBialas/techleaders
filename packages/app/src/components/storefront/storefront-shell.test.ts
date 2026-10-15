import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeaderMenu } from "./header-menu";
import { FooterCategoryLinks, SiteFooter } from "./site-footer";
import { DEMO_NOTICE, featuredEmptyMessage, homeHref, STORE_TAGLINE } from "./storefront-copy";

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
  it("renders the menu inline for wide screens and as a <details> disclosure for narrow ones", () => {
    const html = renderToStaticMarkup(createElement(HeaderMenu, { categories }));
    expect(html.match(/aria-label="Main"/g)).toHaveLength(2);
    expect(html.match(/>Shop all</g)).toHaveLength(2);
    expect(html.match(/href="\/products\?category=mice"/g)).toHaveLength(2);
    expect(html.match(/href="\/products\?category=keyboards"/g)).toHaveLength(2);
    expect(html).toMatch(/<details[^>]*><summary[^>]*><span aria-hidden="true">☰<\/span> Menu/);
    expect(html).not.toContain("/admin");
  });

  it("keeps the static links while categories are loading or unavailable", () => {
    const html = renderToStaticMarkup(createElement(HeaderMenu, { categories: [] }));
    expect(html).toContain('href="/products"');
    expect(html).not.toContain("?category=");
  });
});

describe("SiteFooter", () => {
  it("shows the store line, the streamed category links, the owner sign-in and the demo notice", () => {
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
    expect(html).toContain(DEMO_NOTICE);
    expect(html).toContain("© 2026 CommerceOS demo store.");
  });

  it("lists only all products without categories", () => {
    const html = renderToStaticMarkup(createElement(FooterCategoryLinks, { categories: [] }));
    expect(html).toContain(">All products<");
    expect(html).not.toContain("?category=");
  });
});

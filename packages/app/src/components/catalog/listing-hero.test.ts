import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ListingHero } from "./listing-hero";

describe("ListingHero", () => {
  it("is the one h1 of the collection page, with a decorative photo", () => {
    const html = renderToStaticMarkup(createElement(ListingHero));
    expect(html).toContain('<h1 id="listing-heading"');
    expect(html).toContain(">Products</h1>");
    expect(html).toContain('aria-labelledby="listing-heading"');
    expect(html).toContain('alt=""');
  });
});

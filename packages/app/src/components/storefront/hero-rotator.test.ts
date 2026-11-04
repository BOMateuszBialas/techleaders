import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroRotator } from "./hero-rotator";

const collections = [
  { slug: "mice", name: "Mice", productCount: 3, imageUrl: "/photos/category-mice.jpg" },
  { slug: "headsets", name: "Headsets", productCount: 1, imageUrl: null },
  { slug: "keyboards", name: "Keyboards", productCount: 2, imageUrl: null },
  { slug: "mousepads", name: "Mousepads", productCount: 4, imageUrl: null },
  { slug: "controllers", name: "Controllers", productCount: 5, imageUrl: null },
];

/** The opening tag of one collection's link: its href, slot class, aria-hidden and tabindex. */
function cardOf(html: string, slug: string): string {
  const href = html.indexOf(`href="/products?category=${slug}"`);
  const start = html.lastIndexOf("<a ", href);
  return html.slice(start, html.indexOf(">", href));
}

describe("HeroRotator", () => {
  it("shows the first collection in the middle and its neighbours beside it, with no arrows or dots", () => {
    const html = renderToStaticMarkup(createElement(HeroRotator, { slides: collections }));

    expect(cardOf(html, "mice")).toContain("hero-slot-center");
    expect(cardOf(html, "headsets")).toContain("hero-slot-right");
    expect(cardOf(html, "controllers")).toContain("hero-slot-left");
    expect(cardOf(html, "keyboards")).toContain("hero-slot-hidden");
    expect(html).not.toContain("Show collection");
    expect(html).not.toContain("Choose a collection");
    expect(html).not.toContain("<button");
  });

  it("takes the collections out of the reading order except the one in the middle", () => {
    const html = renderToStaticMarkup(createElement(HeroRotator, { slides: collections }));

    expect(cardOf(html, "mice")).not.toContain("aria-hidden");
    expect(cardOf(html, "headsets")).toContain('aria-hidden="true"');
    expect(cardOf(html, "headsets")).toContain('tabindex="-1"');
  });

  it("shows the photo and the count of a collection, and the neutral label without a photo", () => {
    const html = renderToStaticMarkup(createElement(HeroRotator, { slides: collections }));

    expect(html).toContain('src="/photos/category-mice.jpg"');
    expect(html).toContain("3 products");
    expect(html).toContain("No photo yet");
  });

  it("renders a lone collection in the middle", () => {
    const html = renderToStaticMarkup(createElement(HeroRotator, { slides: [collections[0]!] }));

    expect(cardOf(html, "mice")).toContain("hero-slot-center");
  });

  it("renders nothing without collections", () => {
    expect(renderToStaticMarkup(createElement(HeroRotator, { slides: [] }))).toBe("");
  });
});

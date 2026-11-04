import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroRotator } from "./hero-rotator";

const collections = [
  { slug: "mice", name: "Mice", productCount: 3, imageUrl: "/photos/category-mice.jpg" },
  { slug: "headsets", name: "Headsets", productCount: 1, imageUrl: null },
  { slug: "keyboards", name: "Keyboards", productCount: 2, imageUrl: null },
];

describe("HeroRotator", () => {
  it("shows the first collection with its photo, its count and a dot for each collection", () => {
    const html = renderToStaticMarkup(createElement(HeroRotator, { slides: collections }));

    expect(html).toContain('href="/products?category=mice"');
    expect(html).toContain("Mice");
    expect(html).toContain("3 products");
    expect(html).toContain('src="/photos/category-mice.jpg"');
    expect(html).toContain('aria-label="Show collection 1 of 3"');
    expect(html).toContain('aria-label="Show collection 3 of 3"');
    expect(html).toContain('aria-current="true"');
    expect(html).not.toContain("No photo yet");
  });

  it("shows the neutral label for a collection without a photo", () => {
    const html = renderToStaticMarkup(
      createElement(HeroRotator, { slides: [collections[1]!, collections[2]!] }),
    );

    expect(html).toContain("No photo yet");
    expect(html).not.toContain("<img");
  });

  it("shows no dots for a single collection", () => {
    const html = renderToStaticMarkup(createElement(HeroRotator, { slides: [collections[0]!] }));

    expect(html).toContain("Mice");
    expect(html).not.toContain("Choose a collection");
  });

  it("renders nothing without collections", () => {
    expect(renderToStaticMarkup(createElement(HeroRotator, { slides: [] }))).toBe("");
  });
});

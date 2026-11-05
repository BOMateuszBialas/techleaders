import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StoreFeatures } from "./store-features";
import { STORE_FEATURES } from "./storefront-content";

describe("StoreFeatures", () => {
  it("shows every feature with its text and a button to its collection", () => {
    const html = renderToStaticMarkup(createElement(StoreFeatures));

    for (const feature of STORE_FEATURES) {
      expect(html).toContain(feature.title);
      expect(html).toContain(feature.text);
      expect(html).toContain(`href="${feature.href}"`);
      expect(html).toContain(feature.label);
    }
    expect(html.match(/<article/g)).toHaveLength(STORE_FEATURES.length);
  });

  it("puts the photo on the left in the first and third panels, and on the right in the second", () => {
    const html = renderToStaticMarkup(createElement(StoreFeatures));
    const panels = html.split("<article").slice(1);

    expect(panels[0]).not.toContain("md:order-2");
    expect(panels[1]).toContain("md:order-2");
    expect(panels[2]).not.toContain("md:order-2");
  });

  it("keeps the photos decorative", () => {
    const html = renderToStaticMarkup(createElement(StoreFeatures));

    expect(html).not.toMatch(/alt="[^"]+"/);
  });
});

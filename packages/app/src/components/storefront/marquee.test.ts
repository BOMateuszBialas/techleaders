import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Marquee } from "./marquee";

describe("Marquee", () => {
  it("writes the phrases twice, and hides the second copy from assistive technology", () => {
    const html = renderToStaticMarkup(
      createElement(Marquee, { items: ["Guest checkout", "Demo store"] }),
    );

    expect(html.match(/Guest checkout/g)).toHaveLength(2);
    expect(html.match(/Demo store/g)).toHaveLength(2);
    // Four separators (two per copy) and the second copy as a whole.
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(5);
    expect(html.match(/aria-hidden="true">•/g)).toHaveLength(4);
  });

  it("spans the full width of the screen and moves with the storefront animation", () => {
    const html = renderToStaticMarkup(createElement(Marquee, { items: ["Demo store"] }));

    expect(html).toContain("w-screen");
    expect(html).toContain("storefront-marquee");
  });
});

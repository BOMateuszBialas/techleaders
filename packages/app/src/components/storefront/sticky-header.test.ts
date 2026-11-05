import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StickyHeader } from "./sticky-header";

describe("StickyHeader", () => {
  it("is pinned to the top of the page and shown before the first scroll", () => {
    const html = renderToStaticMarkup(
      createElement(StickyHeader, null, createElement("div", null, "Header content")),
    );

    expect(html).toContain("<header");
    expect(html).toContain("sticky top-0");
    expect(html).not.toContain("-translate-y-full");
    expect(html).toContain("Header content");
  });
});

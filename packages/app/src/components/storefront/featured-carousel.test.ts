import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createCarouselController, type CarouselView } from "./featured-carousel-state";
import { FeaturedCarouselView } from "./featured-carousel";

/** The carousel markup for a view, with a real controller that has no track to move. */
function render(view: CarouselView) {
  return renderToStaticMarkup(
    createElement(
      FeaturedCarouselView,
      {
        trackId: "featured",
        label: "Featured products",
        view,
        controller: createCarouselController("featured", vi.fn()),
      },
      createElement("li", null, "Card"),
    ),
  );
}

/** A button whose own attributes (not its class names) carry the `disabled` attribute. */
function isDisabled(html: string, label: string) {
  return new RegExp(`<button(?=[^>]*aria-label="${label}")[^>]*\\sdisabled[=\\s>]`).test(html);
}

describe("FeaturedCarouselView", () => {
  it("shows the arrows and one dot per page, with the first page current", () => {
    const html = render({ pages: 3, active: 0 });

    expect(html).toContain('aria-label="Show page 1 of 3"');
    expect(html).toContain('aria-label="Show page 3 of 3"');
    expect(html).toContain('aria-current="true"');
    expect(html).toContain('aria-label="Next products"');
  });

  it("disables the previous arrow on the first page", () => {
    const html = render({ pages: 3, active: 0 });

    expect(isDisabled(html, "Previous products")).toBe(true);
    expect(isDisabled(html, "Next products")).toBe(false);
  });

  it("disables the next arrow on the last page", () => {
    const html = render({ pages: 3, active: 2 });

    expect(isDisabled(html, "Next products")).toBe(true);
    expect(isDisabled(html, "Previous products")).toBe(false);
  });

  it("shows no arrows and no dots when the track does not overflow", () => {
    const html = render({ pages: 1, active: 0 });

    expect(html).not.toContain("Next products");
    expect(html).not.toContain("Show page");
    expect(html).toContain("<li>Card</li>");
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomeVideo } from "./home-video";
import { HOME_VIDEO } from "./storefront-content";

describe("HomeVideo", () => {
  it("plays the gaming video muted and looping across the full width, with its poster", () => {
    const html = renderToStaticMarkup(createElement(HomeVideo));
    expect(html).toContain("<video");
    expect(html).toContain(`src="${HOME_VIDEO.src}"`);
    expect(html).toContain(`poster="${HOME_VIDEO.poster}"`);
    expect(html).toContain("muted");
    expect(html).toContain("loop");
    expect(html).toContain("w-screen");
    expect(html).toContain(`aria-label="${HOME_VIDEO.label}"`);
  });
});

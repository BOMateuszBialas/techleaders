import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomePhotoBand } from "./home-video";
import { HOME_HERO } from "./storefront-content";

describe("HomePhotoBand", () => {
  it("shows the hero photo across the full width, decorative, with no video", () => {
    const html = renderToStaticMarkup(createElement(HomePhotoBand));
    expect(html).toContain("home-photo-band");
    expect(html).toContain("w-screen");
    expect(html).toContain(HOME_HERO.photo);
    expect(html).toContain(`alt=""`);
    expect(html).not.toContain("<video");
  });
});

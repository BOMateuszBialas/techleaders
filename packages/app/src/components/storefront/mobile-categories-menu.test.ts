import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { closeMenuOnNavigate, MobileCategoriesMenu } from "./mobile-categories-menu";

describe("MobileCategoriesMenu", () => {
  it("renders a closed burger button with the Categories name, and no list until it opens", () => {
    const html = renderToStaticMarkup(
      createElement(MobileCategoriesMenu, {
        categories: [{ slug: "mice", name: "Mice", description: null }],
      }),
    );
    expect(html).toContain('aria-label="Categories"');
    expect(html).not.toContain("Shop all");
  });
});

describe("closeMenuOnNavigate", () => {
  it("closes the menu when a link is followed", () => {
    const setOpen = vi.fn();
    closeMenuOnNavigate(setOpen)();
    expect(setOpen).toHaveBeenCalledWith(false);
  });
});

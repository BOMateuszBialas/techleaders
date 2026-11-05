import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MobileCategoriesMenu } from "./mobile-categories-menu";

vi.mock("next/navigation", () => ({ usePathname: () => "/products" }));

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

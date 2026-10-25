import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./navigation-menu";

/**
 * The server HTML is what a browser without JavaScript gets (spec G13, B4.25): the trigger must be
 * a working link to the catalog and the category links must already be in the page (hidden until
 * the panel opens). Interaction is covered by the Storybook stories.
 */
describe("NavigationMenu server HTML", () => {
  const html = renderToStaticMarkup(
    h(
      NavigationMenu,
      { "aria-label": "Main" },
      h(
        NavigationMenuList,
        null,
        h(
          NavigationMenuItem,
          null,
          h(NavigationMenuTrigger, { href: "/products" }, "Shop"),
          h(
            NavigationMenuContent,
            null,
            h(
              NavigationMenuLink,
              { href: "/products?category=mice", description: "Gaming mice" },
              "Mice",
            ),
          ),
        ),
      ),
    ),
  );

  it("renders the trigger as a link to the catalog inside a named nav", () => {
    expect(html).toMatch(/<nav[^>]*aria-label="Main"/);
    // No button role or expanded state before hydration: without JavaScript it is only a link.
    const trigger = html.match(/<a[^>]*data-slot="navigation-menu-trigger"[^>]*>/)?.[0] ?? "";
    expect(trigger).toContain('href="/products"');
    expect(trigger).not.toContain("role=");
    expect(trigger).not.toContain("aria-expanded");
  });

  it("keeps the category links in the HTML, hidden until the panel opens", () => {
    expect(html).toContain('href="/products?category=mice"');
    expect(html).toMatch(
      /data-slot="navigation-menu-content"[^>]*hidden|hidden[^>]*data-slot="navigation-menu-content"/,
    );
  });
});

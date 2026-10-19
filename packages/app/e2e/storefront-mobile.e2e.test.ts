import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { ARTIFACTS_DIR, useBrowser } from "./support/browser-test";

/** Each storefront page with text from its streamed content: widths are measured once it has rendered. */
const PAGES = [
  { path: "/", loaded: "Vortex Wireless Mouse" },
  { path: "/products", loaded: "Vortex Wireless Mouse" },
  { path: "/products?q=mouse", loaded: "Vortex Wireless Mouse" },
  { path: "/products/vortex-wireless-mouse", loaded: "Add to cart" },
  { path: "/cart", loaded: "Your cart" },
  { path: "/orders/lookup", loaded: "Find your order" },
];

/**
 * The storefront on a phone: the header (search, menu, cart) wraps inside the viewport, so no
 * page scrolls sideways and the cart link stays in view. Nothing here buys anything.
 */
describe("storefront at 390 px", () => {
  const browser = useBrowser();

  async function layout() {
    return z
      .object({ scrollWidth: z.number(), innerWidth: z.number(), cartRight: z.number() })
      .parse(
        await browser().evaluate(
          "({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, cartRight: document.querySelector('header a[href=\"/cart\"]').getBoundingClientRect().right })",
        ),
      );
  }

  // No viewport reset afterwards: the session belongs to this file and closes with it.
  beforeAll(async () => {
    await browser().setViewport(390, 844);
  });

  it("keeps every storefront page and the header's cart link within the viewport", async () => {
    for (const { path, loaded } of PAGES) {
      await browser().open(path);
      await browser().waitForText(loaded);
      const { scrollWidth, innerWidth, cartRight } = await layout();
      expect(innerWidth, path).toBe(390);
      expect(scrollWidth, path).toBe(innerWidth);
      expect(cartRight, path).toBeLessThanOrEqual(innerWidth);
    }
    await browser().open("/");
    await browser().waitForText("Vortex Wireless Mouse");
    // QA evidence; the folder is git-ignored and CI uploads it only on failure.
    await browser().screenshot(`${ARTIFACTS_DIR}/storefront-home-390.png`);
  });
});

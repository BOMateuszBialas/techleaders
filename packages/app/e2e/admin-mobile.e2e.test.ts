import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { ARTIFACTS_DIR, useBrowser } from "./support/browser-test";
import { useOwnerSession } from "./support/sign-in";

const ADMIN_PAGES = [
  "/admin",
  "/admin/orders",
  "/admin/products",
  "/admin/categories",
  "/admin/copilot",
];
const NAV_LINKS = ["Dashboard", "Orders", "Products", "Categories", "Copilot", "View storefront"];

/**
 * The admin shell on a phone (#56): the navigation wraps inside the viewport, so no admin page
 * scrolls sideways. Uses the owner session of the global setup (no extra sign-in).
 */
describe("admin shell at 390 px", () => {
  const browser = useBrowser();

  async function pageWidths() {
    return z
      .object({ scrollWidth: z.number(), innerWidth: z.number() })
      .parse(
        await browser().evaluate(
          "({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth })",
        ),
      );
  }

  beforeAll(async () => {
    await browser().clearCookies();
    await useOwnerSession(browser());
    await browser().setViewport(390, 844);
  });

  afterAll(async () => {
    await browser().setViewport(1280, 720);
  });

  it("keeps every admin page within the viewport, with every nav link visible", async () => {
    for (const path of ADMIN_PAGES) {
      await browser().open(path);
      await browser().waitForText("Signed in as");
      const { scrollWidth, innerWidth } = await pageWidths();
      expect(innerWidth, path).toBe(390);
      expect(scrollWidth, path).toBe(innerWidth);
    }

    const links = Object.values((await browser().snapshot()).refs);
    for (const name of NAV_LINKS) expect(links).toContainEqual({ role: "link", name });
    const navRight = await browser().evaluate(
      "Math.max(...[...document.querySelectorAll('nav[aria-label=\"Admin\"] a')].map((a) => a.getBoundingClientRect().right))",
    );
    expect(navRight).toBeLessThanOrEqual(390);
    await browser().screenshot(`${ARTIFACTS_DIR}/admin-nav-390.png`);
  });
});

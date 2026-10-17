import { METRIC_DEFINITIONS } from "@commerceos/core";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { ARTIFACTS_DIR, useBrowser } from "./support/browser-test";
import { useOwnerSession } from "./support/sign-in";

/** Each page with text from its streamed content: widths are measured once it has rendered. */
const ADMIN_PAGES = [
  { path: "/admin", loaded: METRIC_DEFINITIONS.revenue.label },
  { path: "/admin/orders", loaded: "DEMO-" },
  { path: "/admin/products", loaded: "Vortex Wireless Mouse" },
  { path: "/admin/categories", loaded: "Keyboards" },
  { path: "/admin/copilot", loaded: "Commerce Copilot" },
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

  // No viewport reset afterwards: the session belongs to this file and closes with it.
  beforeAll(async () => {
    await browser().clearCookies();
    await useOwnerSession(browser());
    await browser().setViewport(390, 844);
  });

  it("keeps every admin page within the viewport, with every nav link visible", async () => {
    for (const { path, loaded } of ADMIN_PAGES) {
      await browser().open(path);
      await browser().waitForText("Signed in as");
      await browser().waitForText(loaded);
      const { scrollWidth, innerWidth } = await pageWidths();
      expect(innerWidth, path).toBe(390);
      expect(scrollWidth, path).toBe(innerWidth);
    }

    const links = Object.values((await browser().snapshot()).refs);
    for (const name of NAV_LINKS) expect(links).toContainEqual({ role: "link", name });
    const nav = z
      .object({ count: z.number(), right: z.number() })
      .parse(
        await browser().evaluate(
          "(() => { const links = [...document.querySelectorAll('nav[aria-label=Admin] a')]; return { count: links.length, right: Math.max(...links.map((a) => a.getBoundingClientRect().right)) }; })()",
        ),
      );
    expect(nav.count).toBe(NAV_LINKS.length);
    expect(nav.right).toBeLessThanOrEqual(390);
    // QA evidence for #56; the folder is git-ignored and CI uploads it only on failure.
    await browser().screenshot(`${ARTIFACTS_DIR}/admin-nav-390.png`);
  });
});

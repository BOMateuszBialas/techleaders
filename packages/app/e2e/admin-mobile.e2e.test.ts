import { METRIC_DEFINITIONS } from "@commerceos/core";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { ARTIFACTS_DIR, useBrowser } from "./support/browser-test";
import { resetCopilotQuestionBudget } from "./support/copilot-budget";
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
    await resetCopilotQuestionBudget();
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

  it("keeps Copilot evidence tables readable without sideways scrolling", async () => {
    await browser().open("/admin/copilot");
    await browser().waitForText("Or ask about your store");
    await browser().clickRole("button", "Which products get views but few sales?");
    await browser().waitForText("Most viewed products in the last 7 days");
    const overflow = z
      .array(z.number())
      .parse(
        await browser().evaluate(
          "[...document.querySelectorAll('main [data-testid=\"copilot-answer\"] [data-slot=table-container]')].map((c) => c.scrollWidth - c.clientWidth)",
        ),
      );
    expect(overflow.length).toBeGreaterThan(0);
    for (const extra of overflow) expect(extra).toBe(0);
    await browser().screenshot(`${ARTIFACTS_DIR}/admin-copilot-390.png`);
  });

  it("marks the current section with aria-current on the nav link", async () => {
    await browser().open("/admin/orders");
    await browser().waitForText("Signed in as");
    await browser().waitForText("DEMO-");
    expect(await browser().text('nav[aria-label="Admin"] a[aria-current="page"]')).toBe("Orders");
  });

  it("puts the sidebar beside the content from 768 px", async () => {
    await browser().setViewport(768, 1024);
    await browser().open("/admin/orders");
    await browser().waitForText("Signed in as");
    await browser().waitForText("DEMO-");
    const layout = z
      .object({
        asideRight: z.number(),
        mainLeft: z.number(),
        asideTop: z.number(),
        mainTop: z.number(),
      })
      .parse(
        await browser().evaluate(
          "(() => { const a = document.querySelector('aside').getBoundingClientRect(); const m = document.querySelector('main').getBoundingClientRect(); return { asideRight: a.right, mainLeft: m.left, asideTop: a.top, mainTop: m.top }; })()",
        ),
      );
    expect(layout.mainLeft).toBeGreaterThanOrEqual(layout.asideRight);
    expect(layout.mainTop).toBe(layout.asideTop);
    await browser().screenshot(`${ARTIFACTS_DIR}/admin-shell-768.png`);
  });
});

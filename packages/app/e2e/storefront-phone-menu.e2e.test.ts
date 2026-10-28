import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { ARTIFACTS_DIR, useBrowser } from "./support/browser-test";

const TRIGGER = 'summary[data-slot="disclosure-trigger"]';
const PHONE_LINK = 'details[data-slot="disclosure"] a[href="/products?category=mice"]';

/**
 * The storefront header's category menu (P4, owner choice): below 768 px one "Categories" button
 * opens the list; from 768 px the inline menu shows and the button is hidden. Nothing here buys
 * anything.
 */
describe("storefront category menu on a phone (P4)", () => {
  const browser = useBrowser();

  /** The page width, and the trigger's size and visibility (zero size when it is hidden). */
  async function measure() {
    return z
      .object({
        scrollWidth: z.number(),
        innerWidth: z.number(),
        triggerHeight: z.number(),
        triggerWidth: z.number(),
        inlineVisible: z.boolean(),
      })
      .parse(
        await browser().evaluate(
          `(() => { const t = document.querySelector('${TRIGGER}'); const r = t ? t.getBoundingClientRect() : { height: 0, width: 0 }; const inline = document.querySelector('header nav[aria-label="Main"]'); return { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, triggerHeight: r.height, triggerWidth: r.width, inlineVisible: inline ? inline.getBoundingClientRect().width > 0 : false }; })()`,
        ),
      );
  }

  beforeAll(async () => {
    await browser().setViewport(390, 844);
  });

  it("opens the Categories button at 390 px and follows a category link", async () => {
    await browser().open("/products");
    await browser().waitForText("Shop all products");

    const closed = await measure();
    expect(closed.scrollWidth).toBe(closed.innerWidth);
    expect(closed.triggerHeight).toBeGreaterThanOrEqual(44);
    expect(closed.inlineVisible).toBe(false);

    await browser().click(TRIGGER);
    await browser().waitForText("Mice");
    const open = await measure();
    expect(open.scrollWidth).toBe(open.innerWidth);

    await browser().click(PHONE_LINK);
    await browser().waitForUrl("/products?category=mice");
    await browser().waitForText("Mice");
    expect((await measure()).scrollWidth).toBe(390);
    // QA evidence; the folder is git-ignored and CI uploads it only on failure.
    await browser().screenshot(`${ARTIFACTS_DIR}/storefront-phone-menu-390.png`);
  });
});

describe("storefront category menu from 768 px (P4)", () => {
  const browser = useBrowser();

  it("shows the inline menu and hides the Categories button at 768 px and 1440 px", async () => {
    for (const width of [768, 1440]) {
      await browser().setViewport(width, 1024);
      await browser().open("/products");
      await browser().waitForText("Shop all products");
      const measured = await measure();
      expect(measured.scrollWidth, `${width} px`).toBe(measured.innerWidth);
      expect(measured.triggerWidth, `${width} px trigger`).toBe(0);
      expect(measured.inlineVisible, `${width} px inline`).toBe(true);
    }
  });

  /** The page width, the trigger's size and whether the inline header menu is shown. */
  async function measure() {
    return z
      .object({
        scrollWidth: z.number(),
        innerWidth: z.number(),
        triggerWidth: z.number(),
        inlineVisible: z.boolean(),
      })
      .parse(
        await browser().evaluate(
          `(() => { const t = document.querySelector('${TRIGGER}'); const inline = document.querySelector('header nav[aria-label="Main"]'); return { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, triggerWidth: t ? t.getBoundingClientRect().width : 0, inlineVisible: inline ? inline.getBoundingClientRect().width > 0 : false }; })()`,
        ),
      );
  }
});

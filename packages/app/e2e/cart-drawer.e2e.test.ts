import { beforeEach, describe, expect, it } from "vitest";
import { ARTIFACTS_DIR, useBrowser } from "./support/browser-test";

const CART_LINK = 'header a[href="/cart"]';
const DRAWER = '[role="dialog"]';
const VORTEX = "Vortex Wireless Mouse";
const PULSE = "Pulse Ultralight Mouse";

/**
 * The cart drawer (storefront v2, spec 2026-10-26 Phase 2, A10-A14, A17). Uses the seeded catalogue:
 * Vortex Wireless Mouse (249,00 zł, 25 in stock) and Pulse Ultralight Mouse (189,00 zł, 3 in
 * stock). The drawer changes the same cookie as `/cart`; nothing here buys anything.
 */
describe("cart drawer (storefront v2, Phase 2)", () => {
  const browser = useBrowser();

  beforeEach(async () => {
    await browser().clearCookies();
  });

  /** Polls until the selector matches `count` elements (the drawer mounts and unmounts). */
  async function waitForCount(selector: string, count: number) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if ((await browser().count(selector)) === count) return;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`${selector} did not reach ${count} elements`);
  }

  /** The quantity the drawer shows for a line (empty when the line is not shown). */
  async function quantityOf(name: string): Promise<string> {
    const selector = 'output[aria-label="Quantity of ' + name + '"]';
    const value = await browser().evaluate(
      `document.querySelector(${JSON.stringify(selector)})?.textContent ?? ""`,
    );
    return String(value);
  }

  /** Polls the drawer line's quantity until the server has re-rendered it (a check). */
  async function waitForQuantity(name: string, quantity: string) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if ((await quantityOf(name)) === quantity) return;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(
      `quantity of ${name} is not ${quantity}; drawer: ${await browser().text('[role="dialog"]')}`,
    );
  }

  async function addFromProductPage(slug: string, name: string) {
    await browser().open(`/products/${slug}`);
    await browser().waitForText(name);
    await browser().clickRole("button", "Add to cart");
    await waitForCount(DRAWER, 1);
    // The drawer is server-rendered after the add; give its client forms time to hydrate before a click.
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  it("opens after a successful add, moves focus into it, and Escape returns focus to Add to cart (A10, A14)", async () => {
    await addFromProductPage("vortex-wireless-mouse", VORTEX);
    await browser().waitForText("Your cart (1)");
    expect(await browser().text(DRAWER)).toContain("Added to cart.");
    expect(await browser().count('[role="dialog"] a[href="/checkout"]')).toBe(1);

    const focused = await browser().evaluate(
      "document.activeElement && (document.activeElement.tagName + ' ' + (document.activeElement.getAttribute('aria-label') || document.activeElement.textContent.slice(0, 40)))",
    );
    expect(focused).toBe("BUTTON Close");

    await browser().press("Escape");
    await waitForCount(DRAWER, 0);
    const returned = await browser().evaluate(
      "document.activeElement && document.activeElement.textContent",
    );
    expect(returned).toContain("Add to cart");
  });

  it("changes the quantity with the minus and plus buttons, and the header count follows (A13)", async () => {
    await addFromProductPage("vortex-wireless-mouse", VORTEX);
    await browser().clickRole("button", `Increase quantity of ${VORTEX}`);
    await waitForQuantity(VORTEX, "2");
    expect(await browser().text(CART_LINK)).toMatch(/Cart\s*2/);

    await browser().clickRole("button", `Decrease quantity of ${VORTEX}`);
    await waitForQuantity(VORTEX, "1");
    expect(await browser().text(CART_LINK)).toMatch(/Cart\s*1/);
  });

  it("refuses a quantity above the stock under the line (A12)", async () => {
    await addFromProductPage("pulse-ultralight-mouse", PULSE);
    await browser().clickRole("button", `Increase quantity of ${PULSE}`);
    await waitForQuantity(PULSE, "2");
    await browser().clickRole("button", `Increase quantity of ${PULSE}`);
    await waitForQuantity(PULSE, "3");
    await browser().clickRole("button", `Increase quantity of ${PULSE}`);
    await browser().waitForText("Only 3 left in stock.");
    expect(await quantityOf(PULSE)).toBe("3");
  });

  it("removes a line from the drawer and shows the empty state (A13)", async () => {
    await addFromProductPage("vortex-wireless-mouse", VORTEX);
    await browser().clickRole("button", `Remove ${VORTEX}`);
    await browser().waitForText("Your cart is empty.");
    expect(await browser().text(CART_LINK)).toMatch(/Cart\s*0/);
  });

  it("opens from the header link without leaving the page, and its Checkout link goes to checkout (A10, A15)", async () => {
    await addFromProductPage("vortex-wireless-mouse", VORTEX);
    await browser().press("Escape");
    await waitForCount(DRAWER, 0);

    await browser().click(CART_LINK);
    await waitForCount(DRAWER, 1);
    expect(new URL(await browser().url()).pathname).toBe("/products/vortex-wireless-mouse");

    await browser().clickRole("link", "Checkout");
    await browser().waitForUrl("**/checkout");
  });

  it("keeps the drawer inside a 320 px screen, with no sideways scroll (A17)", async () => {
    await browser().setViewport(320, 640);
    await addFromProductPage("vortex-wireless-mouse", VORTEX);
    await browser().waitForText("Your cart (1)");
    const fit = await browser().evaluate(
      "(() => { const d = document.querySelector('[role=\"dialog\"]'); return { scroll: document.documentElement.scrollWidth, inner: window.innerWidth, width: d.getBoundingClientRect().width }; })()",
    );
    expect(fit).toEqual({ scroll: 320, inner: 320, width: 320 });
    // QA evidence; the folder is git-ignored and CI uploads it only on failure.
    await browser().screenshot(`${ARTIFACTS_DIR}/cart-drawer-320.png`);
    await browser().setViewport(1280, 800);
  });
});

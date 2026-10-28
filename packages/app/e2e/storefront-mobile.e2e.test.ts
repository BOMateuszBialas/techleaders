import { beforeAll, describe, expect, inject, it } from "vitest";
import { z } from "zod";
import { ARTIFACTS_DIR, useBrowser } from "./support/browser-test";
import { useCustomerSession } from "./support/sign-in";

/** Each storefront page with text from its streamed content: widths are measured once it has rendered. */
const PAGES = [
  { path: "/", loaded: "Vortex Wireless Mouse" },
  { path: "/products", loaded: "Vortex Wireless Mouse" },
  { path: "/products?q=mouse", loaded: "Vortex Wireless Mouse" },
  { path: "/products/vortex-wireless-mouse", loaded: "Add to cart" },
  { path: "/cart", loaded: "Your cart" },
  { path: "/orders/lookup", loaded: "Find your order" },
  { path: "/account/sign-in", loaded: "Sign in to your account" },
  { path: "/account/sign-up", loaded: "Already have an account?" },
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

  // E07 A21: the signed-in header adds "My orders" and "Sign out"; both stay in view on a phone.
  it("keeps the signed-in customer header within the viewport", async () => {
    await useCustomerSession(browser(), "a");
    await browser().open("/account/orders");
    // Customer A may already have orders from other suites (E07 Phase 2b): wait for the
    // streamed account block, not for the empty state.
    await browser().waitForText(`Signed in as ${inject("customerAEmail")}`);
    // The orders table, when there is one, keeps every column in view (lesson 2026-10-19).
    const tableOverflow = await browser().evaluate(
      "[...document.querySelectorAll('[data-slot=table-container]')].map((el) => el.scrollWidth - el.clientWidth)",
    );
    expect(
      z
        .array(z.number())
        .parse(tableOverflow)
        .every((overflow) => overflow <= 0),
    ).toBe(true);
    const measured = z
      .object({ scrollWidth: z.number(), innerWidth: z.number(), signOutRight: z.number() })
      .parse(
        await browser().evaluate(
          "({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, signOutRight: [...document.querySelectorAll('header button')].find((b) => b.textContent.includes('Sign out')).getBoundingClientRect().right })",
        ),
      );
    expect(measured.scrollWidth).toBe(measured.innerWidth);
    expect(measured.signOutRight).toBeLessThanOrEqual(measured.innerWidth);
    expect((await layout()).cartRight).toBeLessThanOrEqual(measured.innerWidth);
  });
});

/**
 * The cart page and the cart drawer at 320 px (retrofit Phase 1, A-items and T16): no sideways
 * scroll, and the buttons a shopper presses on a phone are at least 44 px tall.
 */
describe("cart at 320 px", () => {
  const browser = useBrowser();

  beforeAll(async () => {
    await browser().setViewport(320, 640);
  });

  it("keeps the cart page within the viewport, with 44 px Update, Remove and Checkout", async () => {
    await browser().open("/products/vortex-wireless-mouse");
    await browser().waitForText("Vortex Wireless Mouse");
    await browser().clickRole("button", "Add to cart");
    await browser().waitForText("Added to cart.");

    await browser().open("/cart");
    await browser().waitForText("Prices are confirmed at checkout.");
    const measured = z
      .object({
        scrollWidth: z.number(),
        innerWidth: z.number(),
        update: z.number(),
        remove: z.number(),
        checkout: z.number(),
      })
      .parse(
        await browser().evaluate(
          "(() => { const find = (sel, test) => [...document.querySelectorAll(sel)].find(test); const h = (el) => (el ? el.getBoundingClientRect().height : 0); return { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, update: h(find('button', (b) => b.textContent.trim() === 'Update')), remove: h(find('button', (b) => (b.getAttribute('aria-label') || '').startsWith('Remove'))), checkout: h(find('a', (a) => a.textContent.trim() === 'Checkout')) }; })()",
        ),
      );
    expect(measured.scrollWidth).toBe(measured.innerWidth);
    expect(measured.update).toBeGreaterThanOrEqual(44);
    expect(measured.remove).toBeGreaterThanOrEqual(44);
    expect(measured.checkout).toBeGreaterThanOrEqual(44);
  });

  it("keeps the cart drawer within the viewport, with a 44 px Remove", async () => {
    await browser().open("/products/vortex-wireless-mouse");
    await browser().waitForText("Vortex Wireless Mouse");
    // A successful add opens the drawer (storefront v2, Q6): it is already open here.
    await browser().clickRole("button", "Add to cart");
    await browser().waitForText("Subtotal");
    const measured = z
      .object({
        scrollWidth: z.number(),
        innerWidth: z.number(),
        remove: z.number(),
        dialogRight: z.number(),
      })
      .parse(
        await browser().evaluate(
          "(() => { const dialog = document.querySelector('[role=dialog]'); const remove = [...document.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '').startsWith('Remove')); return { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, remove: remove ? remove.getBoundingClientRect().height : 0, dialogRight: dialog ? dialog.offsetLeft + dialog.offsetWidth : 0 }; })()",
        ),
      );
    expect(measured.scrollWidth).toBe(measured.innerWidth);
    // offsetLeft and offsetWidth ignore the slide-in transform, which getBoundingClientRect does not.
    expect(measured.dialogRight).toBeLessThanOrEqual(measured.innerWidth);
    expect(measured.remove).toBeGreaterThanOrEqual(44);
  });
});

/**
 * The checkout at 320 px (retrofit Phase 2): the form and the order summary stack in one column,
 * and the page does not scroll sideways. Nothing here places an order.
 */
describe("checkout at 320 px", () => {
  const browser = useBrowser();

  beforeAll(async () => {
    await browser().setViewport(320, 640);
  });

  it("keeps the checkout form and the order summary within the viewport", async () => {
    await browser().open("/products/vortex-wireless-mouse");
    await browser().waitForText("Vortex Wireless Mouse");
    await browser().clickRole("button", "Add to cart");
    await browser().waitForText("Added to cart.");

    await browser().open("/checkout");
    await browser().waitForText("Place order");
    await browser().waitForText("Total");
    const measured = z
      .object({ scrollWidth: z.number(), innerWidth: z.number() })
      .parse(
        await browser().evaluate(
          "({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth })",
        ),
      );
    expect(measured.scrollWidth).toBe(measured.innerWidth);
  });
});

/**
 * The payment step, the confirmation, the lookup and the not-found page at 320 px (retrofit
 * Phase 3): no sideways scroll, and the test-payment button is at least 44 px tall. The test
 * buys one mouse, pays it with the test payment and then opens the other pages.
 */
describe("payment and order pages at 320 px", () => {
  const browser = useBrowser();

  beforeAll(async () => {
    await browser().setViewport(320, 640);
  });

  /** Whether the page fits the viewport, and the height of the named button (0 when none). */
  async function measure(buttonName?: string): Promise<{ fits: boolean; height: number }> {
    const label = JSON.stringify(buttonName ?? null);
    const measured = z
      .object({ scrollWidth: z.number(), innerWidth: z.number(), height: z.number() })
      .parse(
        await browser().evaluate(
          `(() => { const label = ${label}; const button = label ? [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === label) : null; return { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, height: button ? button.getBoundingClientRect().height : 0 }; })()`,
        ),
      );
    return { fits: measured.scrollWidth === measured.innerWidth, height: measured.height };
  }

  it("keeps the payment step, the order page, the lookup and the not-found page within the viewport", async () => {
    await browser().open("/products/vortex-wireless-mouse");
    await browser().waitForText("Vortex Wireless Mouse");
    await browser().clickRole("button", "Add to cart");
    await browser().waitForText("Added to cart.");
    await browser().open("/cart");
    await browser().waitForText("Prices are confirmed at checkout.");
    await browser().clickRole("link", "Checkout");
    await browser().waitForText("Place order");
    await browser().fillLabel("Full name", "Grace Hopper");
    await browser().fillLabel("Email", "grace@example.test");
    await browser().fillLabel("Address", "ul. Długa 5");
    await browser().fillLabel("City", "Gdańsk");
    await browser().fillLabel("Postal code", "80-827");
    await browser().clickRole("button", "Place order");
    await browser().waitForText("Confirm test payment");

    const pay = await measure("Confirm test payment");
    expect(pay.fits, "payment step").toBe(true);
    expect(pay.height, "Confirm test payment").toBeGreaterThanOrEqual(44);

    await browser().clickRole("button", "Confirm test payment");
    await browser().waitForText("Thank you — test payment received");
    expect((await measure()).fits, "order page").toBe(true);

    await browser().open("/orders/lookup");
    await browser().waitForText("Find your order");
    expect((await measure()).fits, "lookup").toBe(true);

    await browser().open("/orders/CO-22222-22222-22222-22222");
    await browser().waitForText("No order found with this reference");
    expect((await measure()).fits, "not found").toBe(true);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { useBrowser } from "./support/browser-test";

const CART_LINK = 'header a[href="/cart"]';
const PULSE_CARD_ADD =
  'article:has(a[href="/products/pulse-ultralight-mouse"]) button[type="submit"]';

/**
 * The cart (cart spec, Phase 1, E02-S01 #16). Uses the seeded demo catalog: Vortex Wireless
 * Mouse (249,00 zł, 25 in stock), Pulse Ultralight Mouse (189,00 zł, 3 in stock) and Titan MMO
 * Mouse (out of stock). Nothing here changes stock: the cart reserves none (spec A3).
 */
describe("storefront cart (E02-S01)", () => {
  const browser = useBrowser();

  beforeEach(async () => {
    await browser().clearCookies();
  });

  async function addFromProductPage(slug: string, name: string) {
    await browser().open(`/products/${slug}`);
    await browser().waitForText(name);
    await browser().clickRole("button", "Add to cart");
    await browser().waitForText("Added to cart.");
  }

  async function openCart() {
    await browser().open("/cart");
    await browser().waitForText("Prices are confirmed at checkout.");
  }

  it("adds an in-stock product: the header counts it and the cart shows qty 1 and the total (AC1)", async () => {
    await addFromProductPage("vortex-wireless-mouse", "Vortex Wireless Mouse");
    expect(await browser().text(CART_LINK)).toMatch(/Cart\s*1/);

    await openCart();
    expect(await browser().value('ul[aria-label="Cart items"] input[name="quantity"]')).toBe("1");
    expect(await browser().text('[data-testid="cart-subtotal"]')).toMatch(/249,00\s*zł/);
    expect(await browser().count('main a[href="/checkout"]')).toBe(1);
  });

  it("changes the quantity and removes the line, updating the totals (AC2)", async () => {
    await addFromProductPage("vortex-wireless-mouse", "Vortex Wireless Mouse");
    await openCart();

    await browser().fillLabel("Quantity of Vortex Wireless Mouse", "3");
    await browser().clickRole("button", "Update");
    await browser().waitForText("Cart updated.");
    expect(await browser().text('[data-testid="cart-subtotal"]')).toMatch(/747,00\s*zł/);
    expect(await browser().text(CART_LINK)).toMatch(/Cart\s*3/);

    await browser().clickRole("button", "Remove Vortex Wireless Mouse");
    await browser().waitForText("Your cart is empty.");
    expect(await browser().text(CART_LINK)).toMatch(/Cart\s*0/);
  });

  it("refuses a quantity above the stock with a clear message (AC3)", async () => {
    await browser().open("/products/pulse-ultralight-mouse");
    await browser().waitForText("Pulse Ultralight Mouse");
    await browser().fillLabel("Quantity", "4");
    await browser().clickRole("button", "Add to cart");
    await browser().waitForText("Only 3 left in stock.");
    expect(await browser().text(CART_LINK)).not.toMatch(/Cart\s*4/);

    await addFromProductPage("pulse-ultralight-mouse", "Pulse Ultralight Mouse");
    await openCart();
    await browser().fillLabel("Quantity of Pulse Ultralight Mouse", "4");
    await browser().clickRole("button", "Update");
    await browser().waitForText("Only 3 left in stock.");
    expect(await browser().text('[data-testid="cart-subtotal"]')).toMatch(/189,00\s*zł/);
  });

  it("cannot add an out-of-stock product (AC4)", async () => {
    await browser().open("/products/titan-mmo-mouse");
    await browser().waitForText("Titan MMO Mouse");
    const { refs } = await browser().snapshot();
    const buttons = Object.values(refs).filter((ref) => ref.role === "button");
    expect(buttons.map((button) => button.name)).toContain("Out of stock");
    expect(buttons.map((button) => button.name)).not.toContain("Add to cart");
  });

  it("adds one from a product card in the listing and stays on the page (G8, G9)", async () => {
    await browser().open("/products?category=mice");
    await browser().waitForText("Pulse Ultralight Mouse");
    await browser().click(PULSE_CARD_ADD);
    await browser().waitForText("Added to cart.");
    expect(new URL(await browser().url()).pathname).toBe("/products");
    expect(await browser().text(CART_LINK)).toMatch(/Cart\s*1/);

    await openCart();
    expect(await browser().text("main")).toContain("Pulse Ultralight Mouse");
  });
});

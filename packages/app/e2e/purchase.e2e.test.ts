import { beforeEach, describe, expect, inject, it } from "vitest";
import { useBrowser } from "./support/browser-test";

const REFERENCE = /CO-[0-9A-HJKMNP-TV-Z]{5}(-[0-9A-HJKMNP-TV-Z]{5}){3}/;
const CARD_FIELDS =
  'input[autocomplete^="cc-"], input[name*="card" i], input[name*="cvc" i], input[name*="expir" i]';

/**
 * The whole purchase (cart spec, Phase 3, E02-S03 #18): browse → add → checkout → the demo
 * payment page → confirm → confirmation → lookup. Buys one Echo Surround Headset (349,00 zł,
 * 14 in stock), which no other suite counts on.
 */
describe("storefront purchase with the demo payment (E02-S03)", () => {
  const browser = useBrowser();
  const baseUrl = inject("baseUrl");

  beforeEach(async () => {
    await browser().clearCookies();
  });

  async function expectNoCardField() {
    expect(await browser().count(CARD_FIELDS)).toBe(0);
  }

  async function purchase(): Promise<string> {
    await browser().open("/products?category=headsets");
    await browser().waitForText("Echo Surround Headset");
    await browser().clickRole("link", "Echo Surround Headset");
    // The listing's product cards have their own "Add to cart", so waiting for that text can
    // pass before the product page has loaded: wait for the product page's URL and form.
    await browser().waitForUrl("**/products/echo-surround-headset");
    await browser().waitForText("Quantity");
    await browser().clickRole("button", "Add to cart");
    await browser().waitForText("Added to cart.");

    await browser().open("/cart");
    await browser().waitForText("Prices are confirmed at checkout.");
    await browser().clickRole("link", "Checkout");
    await browser().waitForText("Place order");
    await expectNoCardField();
    await browser().fillLabel("Full name", "Grace Hopper");
    await browser().fillLabel("Email", "grace@example.test");
    await browser().fillLabel("Address", "ul. Długa 5");
    await browser().fillLabel("City", "Gdańsk");
    await browser().fillLabel("Postal code", "80-827");
    await browser().clickRole("button", "Place order");
    await browser().waitForText("Confirm demo payment (no charge)");
    return REFERENCE.exec(await browser().text("main"))?.[0] ?? "";
  }

  it("pays with the demo payment and shows the confirmation (AC1, AC2, AC4)", async () => {
    const reference = await purchase();
    expect(reference).toMatch(REFERENCE);

    const pay = await browser().text("main");
    expect(pay).toContain(
      "Demo store — this is a demo payment. No real money is charged and no card details are collected.",
    );
    expect(pay).toMatch(/349,00\s*zł/);
    await expectNoCardField();

    await browser().clickRole("button", "Confirm demo payment (no charge)");
    await browser().waitForText("Thank you — demo payment received");
    expect(new URL(await browser().url()).pathname).toBe(`/orders/${reference}`);
    const confirmation = await browser().text("main");
    expect(confirmation).toContain(reference);
    expect(confirmation).toContain("Echo Surround Headset × 1");
    expect(confirmation).toMatch(/349,00\s*zł/);
    expect(confirmation).toContain("Paid with: Demo payment (no money charged)");
    expect(confirmation).toContain("Save this reference to check your order.");
    // No personal data on a page reached by a bearer reference (A8).
    expect(confirmation).not.toContain("Grace");
    expect(confirmation).not.toContain("grace@example.test");

    // Paying again is a no-op: the payment page sends a paid order to its status page.
    await browser().open(`/checkout/pay/${reference}`);
    await browser().waitForText("Order status");
    expect(await browser().text("main")).toContain("Paid");
  });

  it("finds the order by reference, and answers the same for guessed and malformed ones (AC3)", async () => {
    const reference = await purchase();
    await browser().clickRole("button", "Confirm demo payment (no charge)");
    await browser().waitForText("Thank you — demo payment received");

    await browser().open("/orders/lookup");
    await browser().waitForText("Find your order");
    await browser().fillLabel("Order reference", reference.toLowerCase().replace(/-/g, " "));
    await browser().clickRole("button", "Find order");
    await browser().waitForText("Order status");
    expect(new URL(await browser().url()).pathname).toBe(`/orders/${reference}`);
    expect(await browser().text("main")).toContain("Paid");

    await browser().open("/orders/CO-00000-00000-00000-00000");
    await browser().waitForText("No order found with this reference");
    await browser().open("/orders/not-a-reference");
    await browser().waitForText("No order found with this reference");

    await browser().open("/orders/lookup");
    await browser().waitForText("Find your order");
    await browser().fillLabel("Order reference", "12345");
    await browser().clickRole("button", "Find order");
    await browser().waitForText("Enter a reference like CO-XXXXX-XXXXX-XXXXX-XXXXX.");
  });

  it("marks order pages noindex and no-referrer", async () => {
    const html = await (await fetch(`${baseUrl}/orders/CO-00000-00000-00000-00000`)).text();
    expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"\s*\/?>/);
    expect(html).toMatch(/<meta name="referrer" content="no-referrer"\s*\/?>/);
  });
});

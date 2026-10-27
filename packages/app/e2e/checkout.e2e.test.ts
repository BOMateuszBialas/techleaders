import { beforeEach, describe, expect, it } from "vitest";
import { useBrowser } from "./support/browser-test";
import { useOwnerSession } from "./support/sign-in";

const PAY_PAGE = /^\/checkout\/pay\/CO-[0-9A-HJKMNP-TV-Z]{5}(-[0-9A-HJKMNP-TV-Z]{5}){3}$/;
const CART_LINK = 'header a[href="/cart"]';

/**
 * Checkout (cart spec, Phase 2, E02-S02 #17). Buys the seeded Vortex Wireless Mouse (249,00 zł,
 * plenty in stock), so the other suites keep their stock assumptions (Pulse 3, Titan 0). The
 * stock is read on the admin product page before and after.
 */
describe("storefront checkout (E02-S02)", () => {
  const browser = useBrowser();

  beforeEach(async () => {
    await browser().clearCookies();
  });

  /**
   * The stock the owner sees for a product, from its admin page ("Current stock: N"). The owner
   * session and the shopper's cart cookie live side by side in this browser.
   */
  async function adminStock(name: string): Promise<number> {
    await browser().open("/admin/products");
    await browser().waitForText(name);
    await browser().clickRole("link", name);
    await browser().waitForText("Stock history");
    const match = /Current stock: (\d+)/.exec(await browser().text("main"));
    return Number(match?.[1]);
  }

  async function addVortex(quantity: string) {
    await browser().open("/products/vortex-wireless-mouse");
    await browser().waitForText("Vortex Wireless Mouse");
    await browser().fillLabel("Quantity", quantity);
    await browser().clickRole("button", "Add to cart");
    await browser().waitForText("Added to cart.");
  }

  async function openCheckout() {
    await browser().open("/cart");
    await browser().waitForText("Prices are confirmed at checkout.");
    await browser().clickRole("link", "Checkout");
    await browser().waitForText("Place order");
  }

  async function fillCustomer(email = "ada@example.test") {
    await browser().fillLabel("Full name", "Ada Lovelace");
    await browser().fillLabel("Email", email);
    await browser().fillLabel("Address", "ul. Marszałkowska 1");
    await browser().fillLabel("City", "Warszawa");
    await browser().fillLabel("Postal code", "00-950");
  }

  it("redirects an empty cart from /checkout to /cart", async () => {
    await browser().open("/checkout");
    await browser().waitForUrl("**/cart");
    await browser().waitForText("Your cart is empty.");
  });

  it("refuses an invalid form with field errors and places no order (AC3)", async () => {
    await addVortex("1");
    await openCheckout();
    const main = await browser().text("main");
    expect(main).toMatch(/249,00\s*zł/);
    expect(main).toContain("free");
    expect(main).not.toContain("demo store");
    expect(main).toContain("Poland");

    await fillCustomer("not-an-email");
    await browser().fillLabel("Postal code", "00950");
    await browser().clickRole("button", "Place order");
    await browser().waitForText("Enter a valid email address.");
    expect(await browser().text("main")).toContain("Enter a postal code like 00-950.");
    expect(new URL(await browser().url()).pathname).toBe("/checkout");
    // The typed values stay, and the cart was not cleared.
    expect(await browser().value("#checkout-customerName")).toBe("Ada Lovelace");
    expect(await browser().text(CART_LINK)).toMatch(/Cart\s*1/);
  });

  it("moves the focus to the first invalid field after an empty submit (retrofit Phase 2, A11)", async () => {
    await addVortex("1");
    await openCheckout();
    await browser().clickRole("button", "Place order");
    await browser().waitForText("Enter your name.");
    // The first field with an error, in the form's order: the full name.
    expect(await browser().evaluate("document.activeElement && document.activeElement.id")).toBe(
      "checkout-customerName",
    );
    // Each field message shows once; the email message is not repeated anywhere.
    const main = await browser().text("main");
    expect(main).toContain("Enter a valid email address.");
    expect(main.match(/Enter a valid email address\./g)).toHaveLength(1);
  });

  it("places an order priced by the server and decrements stock once, even on a double click (AC1, AC4)", async () => {
    await useOwnerSession(browser());
    const before = await adminStock("Vortex Wireless Mouse");
    await addVortex("2");
    await openCheckout();
    await fillCustomer();
    expect(await browser().text('[data-testid="order-total"]')).toMatch(/498,00\s*zł/);

    // Two quick submits of the same form: the button disables itself, and the server's
    // idempotency key covers a second request that gets through. The second click targets the
    // checkout form only: once the payment page has loaded, a generic submit selector would
    // confirm the test payment instead.
    await browser().clickRole("button", "Place order");
    await browser()
      .click('main form:has(#checkout-customerName) button[type="submit"]')
      .catch(() => {});
    await browser().waitForText("Confirm test payment");
    expect(new URL(await browser().url()).pathname).toMatch(PAY_PAGE);
    expect(await browser().text("main")).toMatch(/498,00\s*zł/);
    // The cart was cleared.
    expect(await browser().text(CART_LINK)).toMatch(/Cart\s*0/);

    expect(await adminStock("Vortex Wireless Mouse")).toBe(before - 2);
  });
});

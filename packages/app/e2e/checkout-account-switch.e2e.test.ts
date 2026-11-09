import { beforeEach, describe, expect, inject, it } from "vitest";
import { useBrowser } from "./support/browser-test";
import { useCustomerSession } from "./support/sign-in";

const REFERENCE = /CO-[0-9A-HJKMNP-TV-Z]{5}(-[0-9A-HJKMNP-TV-Z]{5}){3}/;
const SWITCHED_MESSAGE = "You signed in as another account. Review your details and submit again.";

/**
 * E07 follow-up (issue 105): the checkout is rendered for customer A, the shopper signs in as B in
 * another tab (the same browser's session cookie is replaced), then submits. No order is placed,
 * the message appears, the form shows B and starts empty, and a second submit places B's order.
 */
describe("checkout after an account switch in another tab (E07 issue 105)", () => {
  const browser = useBrowser();
  const baseUrl = inject("baseUrl");
  const email = { a: inject("customerAEmail"), b: inject("customerBEmail") };
  const cookie = { a: inject("customerASessionCookie"), b: inject("customerBSessionCookie") };

  beforeEach(async () => {
    await browser().clearCookies();
  });

  /** The references of a customer's account orders, read over HTTP (the browser's cart stays). */
  async function ordersOf(customer: "a" | "b"): Promise<string[]> {
    const response = await fetch(`${baseUrl}/api/account/orders`, {
      headers: { cookie: cookie[customer] },
    });
    const body = await response.json();
    return body.data.orders.map((order: { reference: string }) => order.reference);
  }

  async function fillCustomer(name: string) {
    await browser().fillLabel("Full name", name);
    await browser().fillLabel("Address", "ul. Testowa 2");
    await browser().fillLabel("City", "Gdańsk");
    await browser().fillLabel("Postal code", "80-001");
  }

  it("places no order for A's form under B, and a second submit places B's order", async () => {
    const before = { a: await ordersOf("a"), b: await ordersOf("b") };

    // A adds a product and opens the checkout: the form says "Buying as A".
    await browser().clearCookies();
    await useCustomerSession(browser(), "a");
    await browser().open("/products/vortex-wireless-mouse");
    await browser().waitForText("Vortex Wireless Mouse");
    await browser().clickRole("button", "Add to cart");
    await browser().waitForText("Added to cart.");
    await browser().open("/checkout");
    await browser().waitForText(`Buying as ${email.a}`);
    await fillCustomer("Customer A before switch");

    // Another tab signs in as B: the session cookie is replaced, the form stays as it was.
    await browser().setCookieHeader(cookie.b);
    await browser().clickRole("button", "Place order");

    await browser().waitForText(SWITCHED_MESSAGE);
    const main = await browser().text("main");
    expect(main).toContain(`Buying as ${email.b}`);
    expect(main).not.toContain("Confirm test payment");
    expect(main).not.toContain("Customer A before switch");
    expect(await browser().value("#checkout-customerName")).toBe("");
    expect(await browser().value("#checkout-customerEmail")).toBe(email.b);
    expect(new URL(await browser().url()).pathname).toBe("/checkout");

    // Nothing was placed: neither account gained an order.
    expect(await ordersOf("b")).toEqual(before.b);
    expect(await ordersOf("a")).toEqual(before.a);

    // The reset form, submitted again for B, places B's order.
    await browser().open("/checkout");
    await browser().waitForText(`Buying as ${email.b}`);
    await fillCustomer("Customer B after switch");
    await browser().clickRole("button", "Place order");
    await browser().waitForText("Confirm test payment");
    const reference = REFERENCE.exec(await browser().text("main"))?.[0] ?? "";
    expect(reference).toMatch(REFERENCE);
    expect(await ordersOf("b")).toContain(reference);
    expect(await ordersOf("a")).toEqual(before.a);
  });
});

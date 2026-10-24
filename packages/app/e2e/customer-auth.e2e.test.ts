import { randomBytes, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { useBrowser } from "./support/browser-test";
import { signInAsCustomer } from "./support/sign-in";

/**
 * Customer accounts (E07 spec, Phase 1, E07-S01 #92): register, sign out, sign in, the generic
 * errors and the checkout round trip. One customer is created through the real form; every
 * sign-up and sign-in here counts against the customer instance's shared limits (20 per minute
 * per path), so the suite stays small. The tests run in order on one browser session.
 */
describe("customer accounts (E07-S01)", () => {
  const browser = useBrowser();
  const email = `shopper-${randomUUID()}@e2e.test`;
  const password = randomBytes(18).toString("base64url");

  /** The sign-out button of the "My orders" page (the header has its own). */
  const MAIN_SIGN_OUT = 'main form button[type="submit"]';

  it("registers through the form and lands on an empty My orders", async () => {
    await browser().clearCookies();
    await browser().open("/account/sign-up");
    await browser().waitForText("Create an account");
    expect(await browser().title()).toBe("Create an account · CommerceOS");
    await browser().fillLabel("Email", email);
    await browser().fillLabel("Password", password);
    await browser().clickRole("button", "Create account");
    await browser().waitForUrl("**/account/orders");
    await browser().waitForText("You have no orders yet.");

    const main = await browser().text("main");
    expect(main).toContain("My orders");
    expect(main).toContain(`Signed in as ${email}`);
    const { refs } = await browser().snapshot();
    expect(Object.values(refs)).toContainEqual({ role: "link", name: "My orders" });
    expect(Object.values(refs)).not.toContainEqual({ role: "link", name: "Sign in" });
  });

  it("signs out, after which My orders sends the browser to sign-in", async () => {
    await browser().click(MAIN_SIGN_OUT);
    await browser().waitForText("Vortex Wireless Mouse");
    expect(new URL(await browser().url()).pathname).toBe("/");

    await browser().open("/account/orders");
    await browser().waitForUrl("**/account/sign-in");
    await browser().waitForText("Sign in to your account");
    expect(await browser().text("main")).not.toContain(email);
    await browser().open("/account");
    await browser().waitForUrl("**/account/sign-in");
  });

  it("answers a wrong password with the generic alert and stays signed out", async () => {
    await signInAsCustomer(browser(), email, "definitely-the-wrong-password");
    await browser().waitForText("Invalid email or password.");
    expect(new URL(await browser().url()).searchParams.get("error")).toBe("invalid");
    await browser().open("/account/orders");
    await browser().waitForUrl("**/account/sign-in");
  });

  it("signs in again and returns to My orders; /account and the sign-in page lead there too", async () => {
    await signInAsCustomer(browser(), email, password);
    await browser().waitForUrl("**/account/orders");
    await browser().waitForText("You have no orders yet.");

    await browser().open("/account");
    await browser().waitForUrl("**/account/orders");
    await browser().open("/account/sign-in");
    await browser().waitForUrl("**/account/orders");
    expect(new URL(await browser().url()).pathname).toBe("/account/orders");
  });

  it("refuses a second account for the same email with the one generic message (A9)", async () => {
    await browser().clearCookies();
    await browser().open("/account/sign-up");
    await browser().waitForText("Create an account");
    await browser().fillLabel("Email", email);
    await browser().fillLabel("Password", randomBytes(18).toString("base64url"));
    await browser().clickRole("button", "Create account");
    await browser().waitForText(
      "We could not create an account with these details. If you already have an account, sign in.",
    );
    expect(new URL(await browser().url()).searchParams.get("error")).toBe("refused");
    expect(await browser().text("main")).not.toMatch(/already exists|already registered/i);
  });

  it("offers sign-in at checkout and returns there afterwards (A16, A17)", async () => {
    await browser().clearCookies();
    await browser().open("/products/vortex-wireless-mouse");
    await browser().waitForText("Vortex Wireless Mouse");
    await browser().clickRole("button", "Add to cart");
    await browser().waitForText("Added to cart.");
    await browser().open("/checkout");
    await browser().waitForText("Place order");
    await browser().clickRole("link", "Sign in for order history");
    await browser().waitForUrl("**/account/sign-in?from=checkout");
    await browser().waitForText("Sign in to your account");

    await browser().fillLabel("Email", email);
    await browser().fillLabel("Password", password);
    await browser().clickRole("button", "Sign in");
    await browser().waitForUrl("**/checkout");
    await browser().waitForText("Place order");
    // The cart survives signing in (A20), and a signed-in customer no longer sees the link.
    expect(await browser().text("main")).toContain("Vortex Wireless Mouse");
    expect(await browser().text("main")).not.toContain("Sign in for order history");
  });
});

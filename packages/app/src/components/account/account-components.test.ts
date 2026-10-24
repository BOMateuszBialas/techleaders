import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ACCOUNT_COPY } from "./account-copy";
import { AccountHeaderLink } from "./account-header-link";
import { AccountOrdersView } from "./account-orders-view";
import { CheckoutAccountNote } from "./checkout-account-note";
import { CustomerAuthCard } from "./customer-auth-card";

const action = async () => {};
const render = (element: Parameters<typeof renderToStaticMarkup>[0]) =>
  // Class names are styling, not behaviour: dropped so attribute order does not matter.
  renderToStaticMarkup(element).replace(/ class="[^"]*"/g, "");

describe("CustomerAuthCard", () => {
  it("renders sign-in with email and password only, the demo note and the guest way out", () => {
    const html = render(
      createElement(CustomerAuthCard, {
        mode: "sign-in",
        action,
        error: null,
        fromCheckout: false,
      }),
    );
    expect(html).toContain("<h1>Sign in to your account</h1>");
    expect(html).toContain(ACCOUNT_COPY.demoNote);
    expect(html.match(/<input /g)).toHaveLength(2);
    expect(html).toMatch(
      /<input id="customer-email" type="email"[^>]*autoComplete="email" required="" name="email"\/>/,
    );
    expect(html).toMatch(
      /<input id="customer-password" type="password"[^>]*autoComplete="current-password" required="" minLength="8" maxLength="128" name="password"\/>/,
    );
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Sign in<\/button>/);
    expect(html).toMatch(/href="\/account\/sign-up"[^>]*>Create an account</);
    expect(html).toMatch(/href="\/"[^>]*>Continue as a guest</);
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('name="from"');
    // No name, role or image field of any kind (A7, AC1).
    expect(html).not.toMatch(/name="(name|role|image)"/);
  });

  it("renders sign-up with a new-password field and a link back to sign-in", () => {
    const html = render(
      createElement(CustomerAuthCard, {
        mode: "sign-up",
        action,
        error: null,
        fromCheckout: false,
      }),
    );
    expect(html).toContain("<h1>Create an account</h1>");
    expect(html).toContain('autoComplete="new-password"');
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Create account<\/button>/);
    expect(html).toMatch(/Already have an account\? <a href="\/account\/sign-in"/);
  });

  it("shows the given error as an alert and keeps from=checkout in the form and the links", () => {
    const html = render(
      createElement(CustomerAuthCard, {
        mode: "sign-up",
        action,
        error: "We could not create an account with these details.",
        fromCheckout: true,
      }),
    );
    expect(html).toMatch(/role="alert"[^>]*>We could not create an account with these details\./);
    expect(html).toContain('<input type="hidden" name="from" value="checkout"/>');
    expect(html).toContain('href="/account/sign-in?from=checkout"');
    expect(html).toMatch(/href="\/checkout"[^>]*>Continue as a guest</);
  });
});

describe("AccountOrdersView", () => {
  it("shows the signed-in email, a sign-out button and the empty state", () => {
    const html = render(
      createElement(AccountOrdersView, { email: "a@shop.example", signOutAction: action }),
    );
    expect(html).toContain("Signed in as <span>a@shop.example</span>");
    expect(html).toMatch(/<form[^>]*>.*<button[^>]*type="submit"[^>]*>Sign out<\/button>/);
    expect(html).toContain("You have no orders yet.");
    expect(html).toMatch(/href="\/products"[^>]*>Browse the catalog</);
  });
});

describe("AccountHeaderLink", () => {
  it("offers sign-in to a signed-out shopper", () => {
    const html = render(
      createElement(AccountHeaderLink, { signedIn: false, signOutAction: action }),
    );
    expect(html).toMatch(
      /href="\/account\/sign-in"><svg[^>]*>(<path[^>]*><\/path>)*<\/svg> Sign in</,
    );
    expect(html).not.toContain("My orders");
    expect(html).not.toContain("<form");
  });

  it("offers My orders and sign-out to a signed-in customer", () => {
    const html = render(
      createElement(AccountHeaderLink, { signedIn: true, signOutAction: action }),
    );
    expect(html).toMatch(
      /href="\/account\/orders"><svg[^>]*>(<path[^>]*><\/path>)*<\/svg> My orders</,
    );
    expect(html).toMatch(/<form[^>]*><button type="submit"[^>]*>Sign out<\/button><\/form>/);
    expect(html).not.toContain('href="/account/sign-in"');
  });
});

describe("CheckoutAccountNote", () => {
  it("links a signed-out shopper to sign-in with the fixed checkout return code", () => {
    const html = render(createElement(CheckoutAccountNote, { signedIn: false }));
    expect(html).toMatch(
      /href="\/account\/sign-in\?from=checkout"[^>]*>Sign in for order history</,
    );
    expect(html).toContain("or continue below as a guest.");
  });

  it("renders nothing for a signed-in customer", () => {
    expect(render(createElement(CheckoutAccountNote, { signedIn: true }))).toBe("");
  });
});

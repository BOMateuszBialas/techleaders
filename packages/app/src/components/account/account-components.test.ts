import { money, type CustomerOrderDto, type CustomerOrderList } from "@commerceos/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AccountOrderNotFoundPage from "@/app/(storefront)/account/orders/[id]/not-found";
import OrderNotFound from "@/app/(storefront)/orders/[reference]/not-found";
import { ACCOUNT_COPY, accountOrderPath } from "./account-copy";
import { AccountOrderDetailView } from "./account-order-detail-view";
import { AccountOrderHint, AccountOrderNotFound } from "./account-order-not-found";
import { AccountHeaderLink } from "./account-header-link";
import { AccountOrdersView } from "./account-orders-view";
import { CustomerAuthCard, CustomerAuthCardSkeleton } from "./customer-auth-card";

const action = async () => {};
const render = (element: Parameters<typeof renderToStaticMarkup>[0]) =>
  // Class names are styling, not behaviour: dropped so attribute order does not matter.
  renderToStaticMarkup(element).replace(/ class="[^"]*"/g, "");

describe("CustomerAuthCard", () => {
  it("renders sign-in with email and password only, the sign-in limitation and the guest way out", () => {
    const html = render(
      createElement(CustomerAuthCard, {
        mode: "sign-in",
        action,
        error: null,
        fromCheckout: false,
      }),
    );
    expect(html).toContain("<h1>Sign in to your account</h1>");
    expect(html).toContain("Sign-in has no password reset and no email verification.");
    expect(html).toContain(ACCOUNT_COPY.signInLimitation);
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

describe("CustomerAuthCardSkeleton", () => {
  it("is a placeholder without any form, so no form without from=checkout can be submitted", () => {
    const html = render(createElement(CustomerAuthCardSkeleton));
    expect(html).toBe('<div aria-label="Loading"></div>');
  });
});

describe("AccountHeaderLink", () => {
  it("offers sign-in to a signed-out shopper", () => {
    const html = render(
      createElement(AccountHeaderLink, { signedIn: false, signOutAction: action }),
    );
    expect(html).toMatch(
      /<a href="\/account\/sign-in"><svg[^>]*>(<path[^>]*><\/path>)*<\/svg><span>Sign in<\/span><\/a>/,
    );
    expect(html).not.toContain("My orders");
    expect(html).not.toContain("<form");
  });

  it("offers My orders and sign-out to a signed-in customer", () => {
    const html = render(
      createElement(AccountHeaderLink, { signedIn: true, signOutAction: action }),
    );
    expect(html).toMatch(
      /<a href="\/account\/orders"><svg[^>]*>(<path[^>]*><\/path>)*<\/svg><span>My orders<\/span><\/a>/,
    );
    expect(html).toMatch(
      /<form[^>]*><button type="submit"><svg[^>]*>(<path[^>]*><\/path>)*<\/svg><span>Sign out<\/span><\/button><\/form>/,
    );
    expect(html).not.toContain('href="/account/sign-in"');
  });

  it("keeps the labels for screen readers while a phone shows only the icons", () => {
    const html = renderToStaticMarkup(
      createElement(AccountHeaderLink, { signedIn: true, signOutAction: action }),
    );
    expect(html.match(/<span class="sr-only sm:not-sr-only sm:whitespace-nowrap">/g)).toHaveLength(
      2,
    );
  });
});

describe("AccountOrdersView (E07 A13, S03)", () => {
  const order = (id: string, reference: string) => ({
    id,
    reference,
    createdAt: new Date("2026-10-24T10:00:00.000Z"),
    status: "paid" as const,
    total: money(24900, "PLN"),
  });
  const view = (list: CustomerOrderList | null) =>
    render(
      createElement(AccountOrdersView, { email: "a@shop.example", signOutAction: action, list }),
    );

  it("shows the signed-in email, a sign-out button and the empty state", () => {
    const html = view({ orders: [], capped: false });
    expect(html).toContain("Signed in as <span>a@shop.example</span>");
    expect(html).toMatch(/<form[^>]*>.*<button[^>]*type="submit"[^>]*>Sign out<\/button>/);
    expect(html).toContain("You have no orders yet.");
    expect(html).toMatch(/href="\/products"[^>]*>Browse the catalog</);
    expect(html).not.toContain("<table");
    expect(html).not.toContain("not saved to your account");
  });

  it("lists the orders with reference, date, status and total, each linking to its detail", () => {
    const id = "d0000000-0000-4000-8000-000000000001";
    const html = view({ orders: [order(id, "CO-AAAAA-BBBBB-CCCCC-DDDDD")], capped: false });
    expect(html).toMatch(/<caption[^>]*>Your orders, newest first<\/caption>/);
    expect(html).toMatch(
      new RegExp(`<a href="/account/orders/${id}">CO-AAAAA-BBBBB-CCCCC-DDDDD</a>`),
    );
    expect(html).toContain('<time dateTime="2026-10-24T10:00:00.000Z">24 Oct 2026, 12:00</time>');
    expect(html).toContain("Paid");
    expect(html).toMatch(/249,00\s*zł/);
    expect(html).not.toContain("Showing your 50 most recent orders.");
  });

  it("says when only the newest 50 are shown, and shows a generic error", () => {
    expect(view({ orders: [order("x", "CO-X")], capped: true })).toContain(
      '<p role="note">Showing your 50 most recent orders.</p>',
    );
    const error = view(null);
    expect(error).toContain(
      '<p role="alert">Your orders are unavailable right now. Try again.</p>',
    );
    expect(error).not.toContain("You have no orders yet.");
  });
});

describe("AccountOrderDetailView (E07 A5, S03)", () => {
  const base: CustomerOrderDto = {
    id: "d0000000-0000-4000-8000-000000000001",
    reference: "CO-AAAAA-BBBBB-CCCCC-DDDDD",
    createdAt: new Date("2026-10-24T10:00:00.000Z"),
    status: "pending_payment",
    total: money(24900, "PLN"),
    items: [
      {
        name: "Vortex Wireless Mouse",
        unitPrice: money(24900, "PLN"),
        quantity: 1,
        lineTotal: money(24900, "PLN"),
      },
    ],
    subtotal: money(24900, "PLN"),
    shipping: money(0, "PLN"),
    paidAt: null,
    paymentProvider: null,
    contact: { name: "Ada Lovelace", email: "ada@example.test" },
    shippingAddress: {
      line1: "ul. Marszałkowska 1",
      line2: null,
      city: "Warszawa",
      postalCode: "00-950",
      country: "PL",
    },
  };

  it("shows a pending order read only, with its items, address and a link to pay", () => {
    const html = render(createElement(AccountOrderDetailView, { order: base }));
    expect(html).toContain("<h1>Order details</h1>");
    expect(html).toContain("CO-AAAAA-BBBBB-CCCCC-DDDDD");
    expect(html).toContain("Awaiting payment");
    expect(html).toContain("Vortex Wireless Mouse");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("ul. Marszałkowska 1");
    expect(html).toContain("00-950 Warszawa, PL");
    expect(html).toMatch(/href="\/checkout\/pay\/CO-AAAAA-BBBBB-CCCCC-DDDDD"/);
    expect(html).toMatch(/href="\/account\/orders"[^>]*>Back to My orders</);
    expect(html).not.toContain("<button");
    expect(html).not.toContain("Paid with");
  });

  it("shows how a paid order was paid and its second address line, without a pay link", () => {
    const html = render(
      createElement(AccountOrderDetailView, {
        order: {
          ...base,
          status: "paid",
          paidAt: new Date("2026-10-24T10:05:00.000Z"),
          paymentProvider: "demo",
          shippingAddress: { ...base.shippingAddress, line2: "m. 4" },
        },
      }),
    );
    expect(html).toContain("Paid with: test payment (no money taken)");
    expect(html).toContain("m. 4");
    expect(html).not.toContain("/checkout/pay/");
  });
});

describe("account not-found and the reference hint (E07 A11, A2)", () => {
  it("answers an unknown or foreign order id with one generic page", () => {
    for (const page of [AccountOrderNotFound, AccountOrderNotFoundPage]) {
      const html = render(createElement(page));
      expect(html).toContain("<h1>Order not found</h1>");
      expect(html).toMatch(/href="\/account\/orders"/);
    }
  });

  it("adds the unconditional account hint to the reference not-found page", () => {
    expect(render(createElement(OrderNotFound))).toContain(
      "<p>Orders placed with an account open only while you are signed in to it.</p>",
    );
    expect(render(createElement(AccountOrderHint))).toContain("signed in to it.");
  });

  it("builds account order paths from the uuid only", () => {
    expect(accountOrderPath("d0000000-0000-4000-8000-000000000001")).toBe(
      "/account/orders/d0000000-0000-4000-8000-000000000001",
    );
    expect(accountOrderPath("a/b")).toBe("/account/orders/a%2Fb");
  });
});

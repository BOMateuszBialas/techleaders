import { money, type OrderView } from "@commerceos/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { IDLE_ACTION_STATE, type ActionState } from "@/lib/action-state";
import OrderNotFound from "@/app/(storefront)/orders/[reference]/not-found";
import PayNotFound from "@/app/(storefront)/checkout/pay/[reference]/not-found";
import { CartChanges } from "../cart/cart-changes";
import { DEMO_PAYMENT_BANNER, orderStatusLabel } from "./checkout-copy";
import { CheckoutForm } from "./checkout-form";
import { CheckoutFormView } from "./checkout-form-view";
import { CHECKOUT_SESSION_LOST, type CheckoutMode } from "./checkout-mode";
import { OrderDetails } from "./order-details";
import { LookupForm, PayForm } from "./order-forms";
import {
  DemoPaymentBanner,
  LookupFormView,
  OrderStatusBadge,
  PayFormView,
} from "./order-forms-view";
import { OrderSummary } from "./order-summary";

const REFERENCE = "CO-0DT7M-1EV8N-2FW9P-3GXAQ";
const KEY = "0b7e6a9c-1d2f-4a3b-8c4d-5e6f7a8b9c0d";
const action = vi.fn();
const serverAction = vi.fn(async (state: ActionState) => state);

/** `formatMoney` separates the amount and currency with a no-break space. */
function plainText(html: string): string {
  return html.replace(/ /g, " ");
}

const order: OrderView = {
  reference: REFERENCE,
  status: "pending_payment",
  createdAt: new Date("2026-10-16T10:00:00.000Z"),
  paidAt: null,
  items: [
    {
      name: "Vortex Wireless Mouse",
      unitPrice: money(24900, "PLN"),
      quantity: 2,
      lineTotal: money(49800, "PLN"),
    },
  ],
  subtotal: money(49800, "PLN"),
  shipping: money(0, "PLN"),
  total: money(49800, "PLN"),
  paymentProvider: null,
};
const paid: OrderView = {
  ...order,
  status: "paid",
  paidAt: new Date("2026-10-16T10:05:00.000Z"),
  paymentProvider: "demo",
};

const GUEST: CheckoutMode = { kind: "guest", sessionError: false };

function renderCheckout(state: ActionState, pending = false, mode: CheckoutMode = GUEST) {
  return renderToStaticMarkup(
    createElement(CheckoutFormView, {
      action,
      state,
      pending,
      idempotencyKey: KEY,
      cartFingerprint: "a:1",
      expectedTotalMinor: 49800,
      mode,
    }),
  );
}

describe("checkout copy", () => {
  it("labels every status in words", () => {
    expect(orderStatusLabel("pending_payment")).toBe("Awaiting payment");
    expect(orderStatusLabel("paid")).toBe("Paid");
    expect(orderStatusLabel("cancelled")).toBe("Cancelled");
  });
});

describe("OrderSummary", () => {
  it("lists items and totals; shipping 0 reads 'free (demo store)'", () => {
    const html = plainText(
      renderToStaticMarkup(
        createElement(OrderSummary, {
          items: order.items,
          subtotal: order.subtotal,
          shipping: order.shipping,
          total: order.total,
        }),
      ),
    );
    expect(html).toContain("Vortex Wireless Mouse × 2");
    expect(html).toContain("249,00 zł each");
    expect(html).toContain("free (demo store)");
    expect(html).toContain("498,00 zł");
    expect(html).not.toMatch(/tax|VAT/i);
  });

  it("shows a non-zero shipping amount as money", () => {
    const html = plainText(
      renderToStaticMarkup(
        createElement(OrderSummary, {
          items: [],
          subtotal: money(100, "PLN"),
          shipping: money(500, "PLN"),
          total: money(600, "PLN"),
        }),
      ),
    );
    expect(html).toContain("5,00 zł");
  });
});

describe("CheckoutFormView", () => {
  it("carries the rendered key, cart and total, ships to Poland and has no payment field", () => {
    const html = renderCheckout(IDLE_ACTION_STATE);
    expect(html).toContain(`name="idempotencyKey" value="${KEY}"`);
    expect(html).toContain('name="cartFingerprint" value="a:1"');
    expect(html).toContain('name="expectedTotalMinor" value="49800"');
    expect(html).toContain('name="shippingCountry" value="PL"');
    expect(html).toContain("Poland");
    expect(html).toContain('autoComplete="postal-code"');
    expect(html).not.toMatch(/cc-|card|cvc|expir/i);
    expect(html).toContain(">Place order<");
  });

  it("shows field errors under their inputs and keeps what was typed", () => {
    const html = renderCheckout({
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: { customerEmail: ["Enter a valid email address."] },
      values: { customerName: "Ada", customerEmail: "nope" },
    });
    expect(html).toContain("Enter a valid email address.");
    expect(html).toContain('value="Ada"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).not.toContain("Review your cart");
  });

  it("links back to the cart on a conflict, and disables the button while pending", () => {
    const html = renderCheckout({ status: "error", message: "Sorry, X just sold out." });
    expect(html).toContain('role="alert"');
    expect(html).toContain('href="/cart"');
    expect(renderCheckout(IDLE_ACTION_STATE, true)).toContain("Placing order…");
  });

  it("renders through its client wrapper", () => {
    const html = renderToStaticMarkup(
      createElement(CheckoutForm, {
        action: serverAction,
        idempotencyKey: KEY,
        cartFingerprint: "a:1",
        expectedTotalMinor: 1,
        mode: GUEST,
      }),
    );
    expect(html).toContain(">Place order<");
  });
});

describe("CheckoutFormView modes (E07 A24, A16)", () => {
  const ACCOUNT: CheckoutMode = { kind: "account", email: "a@shop.example" };
  const modeLine = (html: string) => /data-testid="checkout-mode">(.*?)<\/div>/.exec(html)?.[1];

  it("shows the account mode, carries checkoutAs=account and prefills the editable email", () => {
    const html = renderCheckout(IDLE_ACTION_STATE, false, ACCOUNT);
    expect(html).toContain('name="checkoutAs" value="account"');
    expect(modeLine(html)).toContain("Buying as <span");
    expect(modeLine(html)).toContain("a@shop.example");
    expect(html).toContain("This order will appear under My orders.");
    expect(html).toMatch(/name="customerEmail"[^>]*value="a@shop.example"/);
    expect(html).not.toMatch(/name="customerEmail"[^>]*readOnly/i);
    expect(html).not.toContain("Buying as a guest");
  });

  it("keeps a typed email over the prefill after an error", () => {
    const html = renderCheckout(
      { status: "error", message: "Sold out.", values: { customerEmail: "other@x.test" } },
      false,
      ACCOUNT,
    );
    expect(html).toMatch(/name="customerEmail"[^>]*value="other@x.test"/);
    expect(html).toContain('name="checkoutAs" value="account"');
  });

  it("shows the guest mode with the sign-in link and no prefill", () => {
    const html = renderCheckout(IDLE_ACTION_STATE);
    expect(html).toContain('name="checkoutAs" value="guest"');
    expect(modeLine(html)).toMatch(
      /Buying as a guest\. <a[^>]*href="\/account\/sign-in\?from=checkout"[^>]*>Sign in for order history<\/a>/,
    );
    expect(modeLine(html)).not.toContain('role="alert"');
    expect(html).toMatch(/name="customerEmail"[^>]*value=""/);
  });

  it("adds the banner when the page could not confirm the sign-in", () => {
    const html = renderCheckout(IDLE_ACTION_STATE, false, { kind: "guest", sessionError: true });
    expect(modeLine(html)).toContain(
      '<p role="alert" class="text-destructive">We could not confirm your sign-in, so you are checking out as a guest.',
    );
    expect(html).toContain('name="checkoutAs" value="guest"');
  });

  it("switches an account page to guest mode after the session was lost on submit", () => {
    const html = renderCheckout(
      {
        status: "error",
        code: CHECKOUT_SESSION_LOST,
        message: "We could not confirm your sign-in, so you are checking out as a guest. Sign in…",
        values: { customerEmail: "a@shop.example", customerName: "Ada" },
      },
      false,
      ACCOUNT,
    );
    expect(html).toContain('name="checkoutAs" value="guest"');
    expect(modeLine(html)).toContain("Buying as a guest.");
    expect(modeLine(html)).toContain('role="alert"');
    // One alert only (the banner), no "Review your cart" link, the typed values kept.
    expect(html.match(/role="alert"/g)).toHaveLength(1);
    expect(html).not.toContain('href="/cart"');
    expect(html).toContain('value="Ada"');
  });
});

describe("payment and lookup forms", () => {
  it("says plainly that the payment is a demo and no money moves", () => {
    const html = renderToStaticMarkup(createElement(DemoPaymentBanner));
    expect(html).toContain('role="status"');
    expect(html).toContain(DEMO_PAYMENT_BANNER);
  });

  it("posts only the reference to pay, and shows pending and errors", () => {
    const html = renderToStaticMarkup(
      createElement(PayFormView, {
        action,
        state: IDLE_ACTION_STATE,
        pending: false,
        reference: REFERENCE,
      }),
    );
    expect(html).toContain(`name="reference" value="${REFERENCE}"`);
    expect(html).toContain("Confirm demo payment (no charge)");
    expect(html.match(/<input/g)).toHaveLength(1);
    const pending = renderToStaticMarkup(
      createElement(PayFormView, {
        action,
        state: { status: "error", message: "Too many lookups. Try again in a minute." },
        pending: true,
        reference: REFERENCE,
      }),
    );
    expect(pending).toContain("Confirming…");
    expect(pending).toContain("Too many lookups.");
  });

  it("shows the lookup field and its format error", () => {
    const html = renderToStaticMarkup(
      createElement(LookupFormView, {
        action,
        state: {
          status: "error",
          message: "Enter a reference like CO-XXXXX-XXXXX-XXXXX-XXXXX.",
          fieldErrors: { reference: ["Enter a reference like CO-XXXXX-XXXXX-XXXXX-XXXXX."] },
          values: { reference: "123" },
        },
        pending: false,
      }),
    );
    expect(html).toContain("Order reference");
    expect(html).toContain('value="123"');
    expect(html).toContain('aria-invalid="true"');
  });

  it("renders both through their client wrappers, and the status badge in words", () => {
    expect(
      renderToStaticMarkup(createElement(PayForm, { action: serverAction, reference: REFERENCE })),
    ).toContain("no charge");
    expect(renderToStaticMarkup(createElement(LookupForm, { action: serverAction }))).toContain(
      "Find order",
    );
    expect(renderToStaticMarkup(createElement(OrderStatusBadge, { status: "paid" }))).toContain(
      "Paid",
    );
    expect(
      renderToStaticMarkup(createElement(OrderStatusBadge, { status: "pending_payment" })),
    ).toContain("Awaiting payment");
  });
});

describe("OrderDetails", () => {
  it("thanks the shopper after the demo payment and says how it was paid", () => {
    const html = plainText(
      renderToStaticMarkup(createElement(OrderDetails, { order: paid, justPaid: true })),
    );
    expect(html).toContain("Thank you — demo payment received");
    expect(html).toContain(REFERENCE);
    expect(html).toContain("Paid with: Demo payment (no money charged)");
    expect(html).toContain("Save this reference to check your order.");
    expect(html).not.toContain("Complete demo payment");
  });

  it("shows a pending order's status with a link back to the payment", () => {
    const html = renderToStaticMarkup(createElement(OrderDetails, { order, justPaid: true }));
    expect(html).toContain("Order status");
    expect(html).toContain("Awaiting payment");
    expect(html).toContain(`href="/checkout/pay/${REFERENCE}"`);
    expect(html).not.toContain("Paid with");
  });
});

describe("CartChanges and the not-found pages", () => {
  it("lists the changes with the button that stores them", () => {
    const html = renderToStaticMarkup(
      createElement(CartChanges, {
        notices: ["Titan MMO Mouse is no longer available and was removed from your cart."],
        acceptAction: vi.fn(async () => {}),
      }),
    );
    expect(html).toContain("Your cart changed");
    expect(html).toContain("Titan MMO Mouse is no longer available");
    expect(html).toContain("OK, update my cart");
  });

  it("answers the same 'not found' on the order and the payment page", () => {
    for (const page of [OrderNotFound, PayNotFound]) {
      const html = renderToStaticMarkup(createElement(page));
      expect(html).toContain("No order found with this reference");
      expect(html).toContain('href="/orders/lookup"');
    }
  });
});

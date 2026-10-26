import { money, priceCart, type PricedCartLine } from "@commerceos/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { IDLE_ACTION_STATE, type ActionState } from "@/lib/action-state";
import { AddToCartView } from "./add-to-cart-view";
import { CartChanges } from "./cart-changes";
import { CartFormMessage } from "./cart-form-message";
import { CartLineView } from "./cart-line-view";
import { CartLink } from "./cart-link";
import { CartPageSkeleton, CartPageUnavailable } from "./cart-page-states";
import { CartSummary } from "./cart-summary";
import { CartDrawerView } from "./cart-drawer-view";

/**
 * Retrofit Phase 1 presentation (spec 2026-10-26-retrofit-checkout-cart, A1 to A7): the
 * colours, roles and DS components of the cart, the drawer and the add-to-cart form. The
 * behaviour (prices, stock, cookie) is covered by the other cart tests.
 */

const VORTEX_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const action = vi.fn();
const serverAction = vi.fn(async (state: ActionState) => state);
const acceptAction = vi.fn(async () => {});

const line: PricedCartLine = {
  productId: VORTEX_ID,
  slug: "vortex-wireless-mouse",
  name: "Vortex Wireless Mouse",
  imageUrl: null,
  unitPrice: money(24900, "PLN"),
  quantity: 2,
  lineTotal: money(49800, "PLN"),
};

const idle = { action, state: IDLE_ACTION_STATE, pending: false };

/** The opening tag of the element carrying `aria-label`, so its classes can be checked. */
function tagWithLabel(html: string, tag: string, label: string): string {
  return html.match(new RegExp(`<${tag}[^>]*aria-label="${label}"[^>]*>`))?.[0] ?? "";
}

/** The opening tag of the `<a>` whose text is `text`. */
function linkTag(html: string, text: string): string {
  return html.match(new RegExp(`<a [^>]*>${text}</a>`))?.[0] ?? "";
}

/** The opening tag of the `<button>` whose text is `text`. */
function buttonTag(html: string, text: string): string {
  return html.match(new RegExp(`<button [^>]*>${text}</button>`))?.[0] ?? "";
}

describe("A1: add to cart colour and size", () => {
  const props = {
    action,
    state: IDLE_ACTION_STATE,
    pending: false,
    productId: VORTEX_ID,
    available: true,
    withQuantity: true,
  };

  it("is the action colour on the product page", () => {
    const html = renderToStaticMarkup(
      createElement(AddToCartView, { ...props, variant: "action" }),
    );
    expect(buttonTag(html, "Add to cart")).toContain("bg-action");
  });

  it("is an outline small button in a product card", () => {
    const html = renderToStaticMarkup(
      createElement(AddToCartView, {
        ...props,
        withQuantity: false,
        variant: "outline",
        size: "sm",
      }),
    );
    const tag = buttonTag(html, "Add to cart");
    expect(tag).toContain("border-input");
    expect(tag).toContain("h-control-sm");
    expect(tag).not.toContain("bg-action");
  });

  it("keeps the default colour when no variant is given", () => {
    const html = renderToStaticMarkup(createElement(AddToCartView, props));
    expect(buttonTag(html, "Add to cart")).toContain("bg-primary");
  });

  it("marks the button busy while adding, and keeps it disabled", () => {
    const html = renderToStaticMarkup(
      createElement(AddToCartView, { ...props, variant: "action", pending: true }),
    );
    const tag = buttonTag(html, "Adding…");
    expect(tag).toContain('aria-busy="true"');
    expect(tag).toContain('disabled=""');
  });

  it("shows the quantity error with its id, and the success as a status", () => {
    const error = renderToStaticMarkup(
      createElement(AddToCartView, {
        ...props,
        state: {
          status: "error",
          message: "Only 3 left in stock.",
          fieldErrors: { quantity: ["Only 3 left in stock."] },
        },
      }),
    );
    expect(error).toContain('id="quantity-7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01-error"');
    expect(error).toContain('aria-invalid="true"');
    expect(error).toContain('role="alert"');
    const success = renderToStaticMarkup(
      createElement(AddToCartView, {
        ...props,
        state: { status: "success", message: "Added to cart." },
      }),
    );
    expect(success).toContain('role="status"');
    expect(success).toContain('data-variant="success"');
  });
});

describe("A2: cart buttons", () => {
  const cart = priceCart(
    [{ productId: VORTEX_ID, quantity: 2 }],
    [
      {
        id: VORTEX_ID,
        slug: "vortex-wireless-mouse",
        name: "Vortex Wireless Mouse",
        priceMinor: 24900,
        currency: "PLN",
        stockQuantity: 3,
        status: "published",
        imageUrl: null,
      },
    ],
  );

  it("makes Checkout the action colour, Update outline and Remove a link", () => {
    const html = renderToStaticMarkup(
      createElement(CartSummary, {
        cart,
        updateAction: serverAction,
        removeAction: serverAction,
        acceptAction,
      }),
    );
    expect(linkTag(html, "Checkout")).toContain("bg-action");
    expect(buttonTag(html, "Update")).toContain("border-input");
    expect(tagWithLabel(html, "button", "Remove Vortex Wireless Mouse")).toContain("text-link");
  });

  it("keeps the name of Remove, and the price stays out of the action colour", () => {
    const html = renderToStaticMarkup(
      createElement(CartLineView, { line, update: idle, remove: idle }),
    );
    expect(tagWithLabel(html, "button", "Remove Vortex Wireless Mouse")).toContain("text-link");
    expect(html).not.toContain("bg-action");
    expect(html).toContain('class="font-semibold" data-testid="line-total"');
  });
});

describe("A3: empty cart", () => {
  it("shows an empty state with an outline link to the catalogue", () => {
    const html = renderToStaticMarkup(
      createElement(CartSummary, {
        cart: priceCart([], []),
        updateAction: serverAction,
        removeAction: serverAction,
        acceptAction,
      }),
    );
    expect(html).toContain('data-slot="empty"');
    expect(html).toContain("Your cart is empty.");
    expect(linkTag(html, "Browse all products")).toContain("border-input");
  });

  it("shows 'Shop all products' in the drawer's empty state, with no action colour", () => {
    const html = renderToStaticMarkup(
      createElement(CartDrawerView, {
        cart: priceCart([], []),
        notice: null,
        updateAction: serverAction,
        removeAction: serverAction,
        acceptAction,
      }),
    );
    expect(html).toContain('data-slot="empty"');
    expect(linkTag(html, "Shop all products")).toContain("border-input");
    expect(html).not.toContain("bg-action");
  });
});

describe("A4: cart changed block", () => {
  it("is a warning alert with status role and an h2 heading, the list and the accept button", () => {
    const html = renderToStaticMarkup(
      createElement(CartChanges, {
        notices: ["Only 1 left of Vortex Wireless Mouse."],
        acceptAction,
      }),
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('data-variant="warning"');
    expect(html).toContain('<h2 id="cart-changes-heading"');
    expect(html).toContain("Your cart changed");
    expect(html).toContain("<ul");
    expect(html).toContain("Only 1 left of Vortex Wireless Mouse.");
    expect(buttonTag(html, "Update my cart")).toContain("border-input");
  });
});

describe("A5: unreadable cart", () => {
  it("shows an error state with a retry link to /cart on the cart page", () => {
    const html = renderToStaticMarkup(createElement(CartPageUnavailable));
    expect(html).toContain('role="alert"');
    expect(html).toContain("Cart unavailable");
    expect(html).toContain("The cart is temporarily unavailable.");
    expect(linkTag(html, "Try again")).toContain('href="/cart"');
  });

  it("shows an error state with 'View full cart' in the drawer", () => {
    const html = renderToStaticMarkup(
      createElement(CartDrawerView, {
        cart: null,
        notice: null,
        updateAction: serverAction,
        removeAction: serverAction,
        acceptAction,
      }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Cart unavailable");
    expect(linkTag(html, "View full cart")).toContain('href="/cart"');
  });
});

describe("A6: cart loading state", () => {
  it("is one status group with the label 'Loading cart' and no aria-label on a plain div", () => {
    const html = renderToStaticMarkup(createElement(CartPageSkeleton));
    expect(html).toContain('role="status"');
    expect(html).toContain('<span class="sr-only">Loading cart</span>');
    expect(html).not.toContain("aria-label");
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(2);
  });
});

describe("A7: line messages and quantity errors", () => {
  const refused: ActionState = {
    status: "error",
    message: "Only 3 left in stock.",
    fieldErrors: { quantity: ["Only 3 left in stock."] },
  };

  it("shows the quantity error under the input with aria-describedby and aria-invalid", () => {
    const html = renderToStaticMarkup(
      createElement(CartLineView, {
        line,
        update: { ...idle, state: refused },
        remove: idle,
      }),
    );
    const errorId = `cart-quantity-${VORTEX_ID}-error`;
    expect(html).toContain(`aria-describedby="${errorId}"`);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain(`data-slot="field-error" class="`);
    expect(html).toContain(`id="${errorId}"`);
    expect(html).not.toContain('role="alert"');
  });

  it("shows a failed remove as an alert and a removal as a status", () => {
    const failed = renderToStaticMarkup(
      createElement(CartFormMessage, { state: { status: "error", message: "Try again." } }),
    );
    expect(failed).toContain('role="alert"');
    expect(failed).toContain('data-variant="destructive"');
    const done = renderToStaticMarkup(
      createElement(CartFormMessage, {
        state: { status: "success", message: "Removed from your cart." },
      }),
    );
    expect(done).toContain('role="status"');
    expect(done).toContain("Removed from your cart.");
  });

  it("renders nothing before the first submit", () => {
    expect(renderToStaticMarkup(createElement(CartFormMessage, { state: IDLE_ACTION_STATE }))).toBe(
      "",
    );
  });
});

describe("header cart link", () => {
  it("is an outline small button with the count pill", () => {
    const html = renderToStaticMarkup(createElement(CartLink, { itemCount: 3 }));
    expect(html).toContain("border-input");
    expect(html).toContain("h-control-sm");
    expect(html).toContain('data-testid="cart-count"');
  });
});

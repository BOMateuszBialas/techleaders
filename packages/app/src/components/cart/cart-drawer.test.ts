import { money, type PricedCart, type PricedCartLine } from "@commerceos/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { IDLE_ACTION_STATE, type ActionState } from "@/lib/action-state";
import { AddToCart } from "./add-to-cart";
import { CartDrawer } from "./cart-drawer";
import { CartDrawerProvider, useCartDrawer } from "./cart-drawer-context";
import { CartDrawerLineView } from "./cart-drawer-line-view";
import { CartDrawerView, type CartDrawerViewProps } from "./cart-drawer-view";
import { CartLink } from "./cart-link";

const VORTEX_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const action = vi.fn();
const acceptAction = vi.fn(async () => {});

/** `formatMoney` separates the amount and currency with a no-break space. */
function plainText(html: string): string {
  return html.replace(/ /g, " ");
}

const line: PricedCartLine = {
  productId: VORTEX_ID,
  slug: "vortex-wireless-mouse",
  name: "Vortex Wireless Mouse",
  imageUrl: null,
  unitPrice: money(24900, "PLN"),
  quantity: 2,
  lineTotal: money(49800, "PLN"),
};

const cart: PricedCart = {
  lines: [line],
  subtotal: money(49800, "PLN"),
  itemCount: 2,
  canCheckout: true,
  notices: [],
  storedLines: [{ productId: VORTEX_ID, quantity: 2 }],
  changed: false,
};

const emptyCart: PricedCart = {
  lines: [],
  subtotal: null,
  itemCount: 0,
  canCheckout: false,
  notices: [],
  storedLines: [],
  changed: false,
};

const idle = { action, state: IDLE_ACTION_STATE, pending: false };

function renderView(overrides: Partial<CartDrawerViewProps> = {}) {
  return plainText(
    renderToStaticMarkup(
      createElement(CartDrawerView, {
        cart,
        notice: null,
        updateAction: action,
        removeAction: action,
        acceptAction,
        ...overrides,
      }),
    ),
  );
}

/** The opening tag of the button named `label`, so its attributes can be checked. */
function buttonTag(html: string, label: string): string {
  return html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0] ?? "";
}

function renderLine(update = idle, remove = idle, quantity = 2) {
  return plainText(
    renderToStaticMarkup(
      createElement(CartDrawerLineView, {
        line: { ...line, quantity },
        update,
        remove,
      }),
    ),
  );
}

describe("CartDrawerView", () => {
  it("lists the lines with the subtotal, the checkout link and the full-cart link", () => {
    const html = renderView();
    expect(html).toContain('aria-label="Cart items"');
    expect(html).toContain("Vortex Wireless Mouse");
    expect(html).toContain('data-testid="cart-subtotal"');
    expect(html).toContain("498,00");
    expect(html).toContain('href="/checkout"');
    expect(html).toContain('href="/cart"');
    expect(html).toContain("Prices are confirmed at checkout.");
  });

  it("shows the empty state with a link to the catalogue and no checkout", () => {
    const html = renderView({ cart: emptyCart });
    expect(html).toContain("Your cart is empty.");
    expect(html).toContain('href="/products"');
    expect(html).toContain("Shop all products");
    expect(html).not.toContain('href="/checkout"');
    expect(html).not.toContain("cart-subtotal");
  });

  it("shows the corrections and closes the checkout until they are accepted", () => {
    const html = renderView({
      cart: { ...cart, changed: true, notices: ["Only 1 left of Vortex Wireless Mouse."] },
    });
    expect(html).toContain("Only 1 left of Vortex Wireless Mouse.");
    expect(html).toContain("<form");
    expect(html).not.toContain('href="/checkout"');
    expect(html).toContain('href="/cart"');
  });

  it("shows the added-to-cart notice as a status message", () => {
    const html = renderView({ notice: "Added to cart." });
    expect(html).toContain('role="status"');
    expect(html).toContain("Added to cart.");
  });

  it("says so when the cart could not be read, without a checkout", () => {
    const html = renderView({ cart: null });
    expect(html).toContain('role="alert"');
    expect(html).toContain("The cart is temporarily unavailable.");
    expect(html).not.toContain('href="/checkout"');
  });
});

describe("CartDrawerLineView", () => {
  it("has labelled minus and plus buttons, the quantity, the total and a remove button", () => {
    const html = renderLine();
    expect(html).toContain('aria-label="Decrease quantity of Vortex Wireless Mouse"');
    expect(html).toContain('aria-label="Increase quantity of Vortex Wireless Mouse"');
    expect(html).toContain('aria-label="Quantity of Vortex Wireless Mouse"');
    expect(html).toContain('aria-label="Remove Vortex Wireless Mouse"');
    expect(html).toContain('name="quantity" value="1"');
    expect(html).toContain('name="quantity" value="3"');
    expect(html).toContain("498,00");
    expect(html).not.toContain('disabled="');
  });

  it("stops the minus button at one and disables both buttons while an update runs", () => {
    expect(
      buttonTag(renderLine(idle, idle, 1), "Decrease quantity of Vortex Wireless Mouse"),
    ).toContain('disabled=""');
    const pending = renderLine({ ...idle, pending: true }, idle, 2);
    expect(buttonTag(pending, "Decrease quantity of Vortex Wireless Mouse")).toContain(
      'disabled=""',
    );
    expect(buttonTag(pending, "Increase quantity of Vortex Wireless Mouse")).toContain(
      'disabled=""',
    );
    expect(buttonTag(renderLine(), "Increase quantity of Vortex Wireless Mouse")).not.toContain(
      'disabled=""',
    );
  });

  it("shows a quantity refused above the stock under the line", () => {
    const refused: ActionState = {
      status: "error",
      message: "Only 3 left in stock.",
      fieldErrors: { quantity: ["Only 3 left in stock."] },
    };
    const html = renderLine({ ...idle, state: refused });
    expect(html).toContain("Only 3 left in stock.");
    expect(html).toContain("text-destructive");
  });

  it("shows a failed remove as an alert", () => {
    const failed: ActionState = { status: "error", message: "Try again." };
    const html = renderLine(idle, { ...idle, state: failed });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Try again.");
  });

  it("disables the remove button while a remove runs", () => {
    const html = renderLine(idle, { ...idle, pending: true });
    expect(buttonTag(html, "Remove Vortex Wireless Mouse")).toContain('disabled=""');
  });
});

describe("CartDrawer", () => {
  const props = {
    cart,
    updateAction: action,
    removeAction: action,
    acceptAction,
  };

  it("renders nothing outside the provider", () => {
    expect(renderToStaticMarkup(createElement(CartDrawer, props))).toBe("");
  });

  it("is closed until it is opened, so the page renders no drawer markup", () => {
    const html = renderToStaticMarkup(
      createElement(CartDrawerProvider, null, createElement(CartDrawer, props)),
    );
    expect(html).toBe("");
  });

  it("renders its closed drawer for an unreadable cart too", () => {
    const html = renderToStaticMarkup(
      createElement(CartDrawerProvider, null, createElement(CartDrawer, { ...props, cart: null })),
    );
    expect(html).toBe("");
  });

  it("renders the header link and the add button inside the provider", () => {
    const html = renderToStaticMarkup(
      createElement(
        CartDrawerProvider,
        null,
        createElement(
          "div",
          null,
          createElement(CartLink, { itemCount: 2 }),
          createElement(AddToCart, {
            action: vi.fn(async () => IDLE_ACTION_STATE),
            productId: VORTEX_ID,
            available: true,
            withQuantity: false,
          }),
        ),
      ),
    );
    expect(html).toContain('href="/cart"');
    expect(html).toContain("Add to cart");
  });

  it("exposes the drawer state to a consumer, and nothing outside the provider", () => {
    let seen: unknown = "unset";
    function Probe() {
      seen = useCartDrawer();
      return null;
    }
    renderToStaticMarkup(createElement(Probe));
    expect(seen).toBeNull();
    renderToStaticMarkup(createElement(CartDrawerProvider, null, createElement(Probe)));
    expect(seen).toMatchObject({ state: { open: false, notice: null } });
  });
});

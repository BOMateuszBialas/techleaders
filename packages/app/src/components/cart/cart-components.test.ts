import { money, priceCart, type PricedCartLine } from "@commerceos/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { IDLE_ACTION_STATE, type ActionState } from "@/lib/action-state";
import { AddToCart } from "./add-to-cart";
import { AddToCartView } from "./add-to-cart-view";
import { cartLinkLabel } from "./cart-copy";
import { CartLineItem } from "./cart-line-item";
import { CartLineView, lineMessage } from "./cart-line-view";
import { CartLink } from "./cart-link";
import { CartSummary } from "./cart-summary";

const VORTEX_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const action = vi.fn();
const serverAction = vi.fn(async (state: ActionState) => state);

/** `formatMoney` separates the amount and currency with a no-break space. */
function plainText(html: string): string {
  return html.replace(/ /g, " ");
}

function renderAdd(
  state: ActionState,
  options: { pending?: boolean; available?: boolean; withQuantity?: boolean } = {},
) {
  return renderToStaticMarkup(
    createElement(AddToCartView, {
      action,
      state,
      pending: options.pending ?? false,
      productId: VORTEX_ID,
      available: options.available ?? true,
      withQuantity: options.withQuantity ?? true,
    }),
  );
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

const idle = { action, state: IDLE_ACTION_STATE, pending: false };

function renderLine(update = idle, remove = idle) {
  return plainText(renderToStaticMarkup(createElement(CartLineView, { line, update, remove })));
}

describe("cart copy", () => {
  it("names the cart link with its count", () => {
    expect(cartLinkLabel(0)).toBe("Cart, 0 items");
    expect(cartLinkLabel(1)).toBe("Cart, 1 item");
    expect(cartLinkLabel(3)).toBe("Cart, 3 items");
  });
});

describe("AddToCartView", () => {
  it("posts the product id and a quantity (1 to start), never a price", () => {
    const html = renderAdd(IDLE_ACTION_STATE);
    expect(html).toContain(`name="productId" value="${VORTEX_ID}"`);
    expect(html).toContain('name="quantity"');
    expect(html).toContain('value="1"');
    expect(html).toContain('max="99"');
    expect(html).toContain("noValidate");
    expect(html).not.toContain("price");
    expect(html).toContain(">Add to cart<");
  });

  it("adds one without a quantity input on product cards", () => {
    const html = renderAdd(IDLE_ACTION_STATE, { withQuantity: false });
    expect(html).not.toContain('name="quantity"');
    expect(html).toContain(">Add to cart<");
  });

  it("is a disabled 'Out of stock' button without a form for an unavailable product", () => {
    const html = renderAdd(IDLE_ACTION_STATE, { available: false });
    expect(html).toContain("Out of stock");
    expect(html).toContain("disabled");
    expect(html).not.toContain("<form");
  });

  it("shows the pending, success and error states", () => {
    expect(renderAdd(IDLE_ACTION_STATE, { pending: true })).toContain("Adding…");
    expect(renderAdd({ status: "success", message: "Added to cart." })).toContain('role="status"');
    const error = renderAdd({
      status: "error",
      message: "Only 3 left in stock.",
      fieldErrors: { quantity: ["Enter a whole number from 1 to 99."] },
      values: { productId: VORTEX_ID, quantity: "100" },
    });
    expect(error).toContain('role="alert"');
    expect(error).toContain("Only 3 left in stock.");
    expect(error).toContain("Enter a whole number from 1 to 99.");
    expect(error).toContain('value="100"');
    expect(error).toContain('aria-invalid="true"');
  });

  it("renders through its client wrapper", () => {
    const html = renderToStaticMarkup(
      createElement(AddToCart, {
        action: serverAction,
        productId: VORTEX_ID,
        available: true,
        withQuantity: false,
      }),
    );
    expect(html).toContain(">Add to cart<");
  });
});

describe("CartLink", () => {
  it("links to the cart with the item count, or plain 'Cart' while loading", () => {
    const counted = renderToStaticMarkup(createElement(CartLink, { itemCount: 3 }));
    expect(counted).toContain('href="/cart"');
    expect(counted).toContain('aria-label="Cart, 3 items"');
    expect(counted).toContain(">3<");
    const loading = renderToStaticMarkup(createElement(CartLink, { itemCount: null }));
    expect(loading).toContain('aria-label="Cart"');
    expect(loading).not.toContain("cart-count");
  });
});

describe("CartLineView", () => {
  it("shows the name, unit price, quantity, line total and a remove button", () => {
    const html = renderLine();
    expect(html).toContain('href="/products/vortex-wireless-mouse"');
    expect(html).toContain("249,00 zł each");
    expect(html).toContain('value="2"');
    expect(html).toContain("498,00 zł");
    expect(html).toContain('aria-label="Remove Vortex Wireless Mouse"');
  });

  it("shows a refused quantity under the field only", () => {
    const refused: ActionState = {
      status: "error",
      message: "Only 3 left in stock.",
      fieldErrors: { quantity: ["Only 3 left in stock."] },
      values: { productId: VORTEX_ID, quantity: "4" },
    };
    const html = renderLine({ ...idle, state: refused });
    expect(html.match(/Only 3 left in stock\./g)).toHaveLength(1);
    expect(html).toContain('value="4"');
    expect(html).not.toContain('role="alert"');
  });

  it("disables the buttons while pending", () => {
    const html = renderLine({ ...idle, pending: true }, { ...idle, pending: true });
    expect(html.match(/ disabled=""/g)).toHaveLength(2);
  });

  it("picks one message: a failed remove, else the update's result", () => {
    const failed: ActionState = { status: "error", message: "Something went wrong. Try again." };
    const updated: ActionState = { status: "success", message: "Cart updated." };
    expect(lineMessage(updated, failed)).toBe(failed);
    expect(lineMessage(updated, IDLE_ACTION_STATE)).toBe(updated);
    expect(lineMessage(failed, IDLE_ACTION_STATE)).toBe(failed);
    expect(
      lineMessage({ status: "error", fieldErrors: { quantity: ["x"] } }, IDLE_ACTION_STATE),
    ).toBe(IDLE_ACTION_STATE);
  });

  it("renders through its client wrapper", () => {
    const html = renderToStaticMarkup(
      createElement(CartLineItem, { line, updateAction: serverAction, removeAction: serverAction }),
    );
    expect(html).toContain(">Update<");
  });
});

describe("CartSummary", () => {
  const props = { updateAction: serverAction, removeAction: serverAction };

  it("shows the empty state with a link to the catalog", () => {
    const html = renderToStaticMarkup(
      createElement(CartSummary, { cart: priceCart([], []), ...props }),
    );
    expect(html).toContain("Your cart is empty.");
    expect(html).toContain('href="/products"');
    expect(html).not.toContain("Subtotal");
  });

  it("shows the notices, the lines, the subtotal and that checkout is coming soon", () => {
    const cart = priceCart(
      [
        { productId: VORTEX_ID, quantity: 5 },
        { productId: "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3eff", quantity: 1 },
      ],
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
    const html = plainText(renderToStaticMarkup(createElement(CartSummary, { cart, ...props })));
    expect(html).toContain("Only 3 left of Vortex Wireless Mouse; we updated the quantity.");
    expect(html).toContain("A product in your cart is no longer available and was removed.");
    expect(html).toContain("747,00 zł");
    expect(html).toContain("Prices are confirmed at checkout.");
    expect(html).toContain("Checkout is coming soon.");
    expect(html).toContain("cookies must be enabled");
  });
});

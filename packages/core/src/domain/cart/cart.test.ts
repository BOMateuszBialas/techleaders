import { describe, expect, it } from "vitest";
import { ValidationError } from "../../errors/app-error";
import { money } from "../money";
import {
  CART_LIMITS,
  CART_LINES_LIMIT_MESSAGE,
  CART_QUANTITY_LIMIT_MESSAGE,
  addLine,
  cartItemCount,
  findLine,
  priceCart,
  removeLine,
  setLineQuantity,
  type CartLine,
  type CartProduct,
} from "./cart";

const VORTEX_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const PULSE_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e02";
const TITAN_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e03";

function product(overrides: Partial<CartProduct> = {}): CartProduct {
  return {
    id: VORTEX_ID,
    slug: "vortex-wireless-mouse",
    name: "Vortex Wireless Mouse",
    priceMinor: 24900,
    currency: "PLN",
    stockQuantity: 25,
    status: "published",
    imageUrl: "/demo/products/vortex-wireless-mouse.svg",
    ...overrides,
  };
}

const pulse = product({
  id: PULSE_ID,
  slug: "pulse-ultralight-mouse",
  name: "Pulse Ultralight Mouse",
  priceMinor: 18900,
  stockQuantity: 3,
  imageUrl: null,
});

function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected a throw");
}

describe("cart lines", () => {
  it("appends a new product and merges a repeated one", () => {
    const one = addLine([], VORTEX_ID, 1);
    expect(one).toEqual([{ productId: VORTEX_ID, quantity: 1 }]);
    const two = addLine(addLine(one, PULSE_ID, 2), VORTEX_ID, 3);
    expect(two).toEqual([
      { productId: VORTEX_ID, quantity: 4 },
      { productId: PULSE_ID, quantity: 2 },
    ]);
    expect(cartItemCount(two)).toBe(6);
    expect(findLine(two, PULSE_ID)).toEqual({ productId: PULSE_ID, quantity: 2 });
    expect(findLine(two, TITAN_ID)).toBeUndefined();
  });

  it("refuses more than 99 of one product", () => {
    const lines = [{ productId: VORTEX_ID, quantity: 98 }];
    expect(addLine(lines, VORTEX_ID, 1)).toEqual([{ productId: VORTEX_ID, quantity: 99 }]);
    const error = thrown(() => addLine(lines, VORTEX_ID, 2));
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({
      message: CART_QUANTITY_LIMIT_MESSAGE,
      fieldErrors: { quantity: [CART_QUANTITY_LIMIT_MESSAGE] },
    });
  });

  it("refuses a 21st distinct product but still merges into an existing line", () => {
    const full: CartLine[] = Array.from({ length: CART_LIMITS.maxLines }, (_, index) => ({
      productId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      quantity: 1,
    }));
    expect(thrown(() => addLine(full, VORTEX_ID, 1))).toMatchObject({
      message: CART_LINES_LIMIT_MESSAGE,
    });
    expect(addLine(full, full[0]!.productId, 1)[0]?.quantity).toBe(2);
  });

  it("sets and removes lines; absent lines are a no-op", () => {
    const lines = [
      { productId: VORTEX_ID, quantity: 1 },
      { productId: PULSE_ID, quantity: 2 },
    ];
    expect(setLineQuantity(lines, PULSE_ID, 3)).toEqual([
      { productId: VORTEX_ID, quantity: 1 },
      { productId: PULSE_ID, quantity: 3 },
    ]);
    expect(setLineQuantity(lines, TITAN_ID, 3)).toEqual(lines);
    expect(removeLine(lines, VORTEX_ID)).toEqual([{ productId: PULSE_ID, quantity: 2 }]);
    expect(removeLine(lines, TITAN_ID)).toEqual(lines);
  });
});

describe("priceCart", () => {
  it("prices every line from the catalog and sums the subtotal", () => {
    const cart = priceCart(
      [
        { productId: VORTEX_ID, quantity: 2 },
        { productId: PULSE_ID, quantity: 1 },
      ],
      [pulse, product()],
    );
    expect(cart.lines).toEqual([
      {
        productId: VORTEX_ID,
        slug: "vortex-wireless-mouse",
        name: "Vortex Wireless Mouse",
        imageUrl: "/demo/products/vortex-wireless-mouse.svg",
        unitPrice: money(24900, "PLN"),
        quantity: 2,
        lineTotal: money(49800, "PLN"),
      },
      {
        productId: PULSE_ID,
        slug: "pulse-ultralight-mouse",
        name: "Pulse Ultralight Mouse",
        imageUrl: null,
        unitPrice: money(18900, "PLN"),
        quantity: 1,
        lineTotal: money(18900, "PLN"),
      },
    ]);
    expect(cart.subtotal).toEqual(money(68700, "PLN"));
    expect(cart.itemCount).toBe(3);
    expect(cart.canCheckout).toBe(true);
    expect(cart.notices).toEqual([]);
    expect(cart.changed).toBe(false);
    expect(cart.storedLines).toEqual([
      { productId: VORTEX_ID, quantity: 2 },
      { productId: PULSE_ID, quantity: 1 },
    ]);
  });

  it("is empty without lines", () => {
    const cart = priceCart([], []);
    expect(cart).toMatchObject({ lines: [], subtotal: null, itemCount: 0, canCheckout: false });
  });

  it("removes unknown, unpublished and out-of-stock products with a notice (G12)", () => {
    const cart = priceCart(
      [
        { productId: TITAN_ID, quantity: 1 },
        { productId: PULSE_ID, quantity: 1 },
        { productId: VORTEX_ID, quantity: 1 },
      ],
      [
        product({ id: TITAN_ID, name: "Titan MMO Mouse", stockQuantity: 0 }),
        { ...pulse, status: "draft" },
      ],
    );
    expect(cart.lines).toEqual([]);
    expect(cart.subtotal).toBeNull();
    expect(cart.canCheckout).toBe(false);
    expect(cart.changed).toBe(true);
    expect(cart.notices).toEqual([
      "Titan MMO Mouse is no longer available and was removed from your cart.",
      "Pulse Ultralight Mouse is no longer available and was removed from your cart.",
      "A product in your cart is no longer available and was removed.",
    ]);
  });

  it("lowers a quantity above the stock to the stock (G13)", () => {
    const cart = priceCart([{ productId: PULSE_ID, quantity: 5 }], [pulse]);
    expect(cart.storedLines).toEqual([{ productId: PULSE_ID, quantity: 3 }]);
    expect(cart.subtotal).toEqual(money(56700, "PLN"));
    expect(cart.notices).toEqual([
      "Only 3 left of Pulse Ultralight Mouse; we updated the quantity.",
    ]);
    expect(cart.changed).toBe(true);
  });

  it("keeps one currency: a line in another currency is removed", () => {
    const cart = priceCart(
      [
        { productId: VORTEX_ID, quantity: 1 },
        { productId: PULSE_ID, quantity: 1 },
      ],
      [product(), { ...pulse, currency: "EUR" }],
    );
    expect(cart.storedLines).toEqual([{ productId: VORTEX_ID, quantity: 1 }]);
    expect(cart.notices).toEqual([
      "Pulse Ultralight Mouse is priced in another currency and was removed from your cart.",
    ]);
  });
});

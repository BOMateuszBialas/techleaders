import { describe, expect, it } from "vitest";
import { hasAppErrorCode } from "../../errors/app-error";
import {
  InsufficientStockError,
  MAX_ORDER_TOTAL_MINOR,
  MIXED_CURRENCY_MESSAGE,
  ORDER_TOO_LARGE_MESSAGE,
  OrderNotPayableError,
  PRICE_CHANGED_MESSAGE,
  PriceChangedError,
  buildOrderDraft,
  cartFingerprint,
  isOrderConflict,
  soldOutMessage,
  type ReservedLine,
} from "./order";
import {
  generateOrderReference,
  isOrderReference,
  normalizeOrderReference,
} from "./order-reference";

const vortex: ReservedLine = {
  productId: "p-1",
  name: "Vortex Wireless Mouse",
  sku: "DEMO-MOU-001",
  unitPriceMinor: 24900,
  currency: "PLN",
  quantity: 2,
};
const pulse: ReservedLine = {
  productId: "p-2",
  name: "Pulse Ultralight Mouse",
  sku: null,
  unitPriceMinor: 18900,
  currency: "PLN",
  quantity: 1,
};

function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected a throw");
}

describe("buildOrderDraft", () => {
  it("snapshots each line and totals in minor units with free shipping", () => {
    expect(buildOrderDraft([vortex, pulse], 68700)).toEqual({
      currency: "PLN",
      items: [
        {
          productId: "p-1",
          name: "Vortex Wireless Mouse",
          sku: "DEMO-MOU-001",
          unitPriceMinor: 24900,
          quantity: 2,
          lineTotalMinor: 49800,
        },
        {
          productId: "p-2",
          name: "Pulse Ultralight Mouse",
          sku: null,
          unitPriceMinor: 18900,
          quantity: 1,
          lineTotalMinor: 18900,
        },
      ],
      subtotalMinor: 68700,
      shippingMinor: 0,
      totalMinor: 68700,
    });
  });

  it("refuses a total that differs from the one shown (price changed)", () => {
    const error = thrown(() => buildOrderDraft([vortex], 49700));
    expect(error).toBeInstanceOf(PriceChangedError);
    expect(isOrderConflict(error, "price_changed")).toBe(true);
    expect(error).toMatchObject({ message: PRICE_CHANGED_MESSAGE });
  });

  it("refuses an empty order, mixed currencies and a total beyond the int range", () => {
    expect(
      hasAppErrorCode(
        thrown(() => buildOrderDraft([], 0)),
        "VALIDATION_FAILED",
      ),
    ).toBe(true);
    expect(thrown(() => buildOrderDraft([vortex, { ...pulse, currency: "EUR" }], 0))).toMatchObject(
      { message: MIXED_CURRENCY_MESSAGE },
    );
    const huge = { ...vortex, unitPriceMinor: MAX_ORDER_TOTAL_MINOR, quantity: 1 };
    expect(buildOrderDraft([huge], MAX_ORDER_TOTAL_MINOR).totalMinor).toBe(MAX_ORDER_TOTAL_MINOR);
    expect(thrown(() => buildOrderDraft([huge, pulse], 0))).toMatchObject({
      message: ORDER_TOO_LARGE_MESSAGE,
    });
  });
});

describe("order conflicts", () => {
  it("names the sold-out products and tells reasons apart by code", () => {
    const error = new InsufficientStockError(["Pulse Ultralight Mouse"]);
    expect(error.message).toBe(
      "Sorry, Pulse Ultralight Mouse just sold out. Review your cart and try again.",
    );
    expect(isOrderConflict(error, "insufficient_stock")).toBe(true);
    expect(isOrderConflict(error, "price_changed")).toBe(false);
    expect(isOrderConflict(new OrderNotPayableError(), "not_payable")).toBe(true);
    expect(isOrderConflict(new Error("x"), "not_payable")).toBe(false);
    expect(soldOutMessage([])).toBe("Sorry, an item in your cart just sold out.");
  });

  it("fingerprints a cart independently of line order", () => {
    expect(
      cartFingerprint([
        { productId: "b", quantity: 1 },
        { productId: "a", quantity: 2 },
      ]),
    ).toBe("a:2,b:1");
  });
});

describe("order references", () => {
  const counting = (length: number) => Uint8Array.from({ length }, (_, index) => index * 13);

  it("draws 20 Crockford base32 characters (100 bits) and groups them by five", () => {
    const reference = generateOrderReference(counting);
    expect(reference).toMatch(/^CO-[0-9A-HJKMNP-TV-Z]{5}(-[0-9A-HJKMNP-TV-Z]{5}){3}$/);
    expect(reference).toBe("CO-0DT7M-1EV8N-2FW9P-3GXAQ");
    expect(isOrderReference(reference)).toBe(true);
    expect(() => generateOrderReference(() => new Uint8Array(4))).toThrow("wrong length");
  });

  it("normalises typed references and refuses anything else", () => {
    expect(normalizeOrderReference(" co-0dt7m 1ev8n-2FW9P3gxaq ")).toBe(
      "CO-0DT7M-1EV8N-2FW9P-3GXAQ",
    );
    for (const bad of ["", "CO-123", "XX-0DT7M-0DT7M-0DT7M-0DT7M", "CO-0DT7M-0DT7M-0DT7M-0DT7I"]) {
      expect(normalizeOrderReference(bad)).toBeNull();
    }
    expect(isOrderReference("co-0dt7m-0dt7m-0dt7m-0dt7m")).toBe(false);
  });
});

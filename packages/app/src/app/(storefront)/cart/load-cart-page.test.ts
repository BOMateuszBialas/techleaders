import { priceCart } from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCart = vi.fn();
const dispose = vi.fn(async () => {});
const readCartLines = vi.fn();

vi.mock("@/server/container", () => ({
  createRequestScope: () => ({ cradle: { getCartUseCase: { execute: getCart } }, dispose }),
}));
vi.mock("@/server/cart/cart-cookie", () => ({
  readCartLines: (options?: unknown) => readCartLines(options),
}));

const { loadCartPage } = await import("./load-cart-page");

const lines = [{ productId: "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01", quantity: 2 }];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadCartPage", () => {
  it("prices the cookie's lines on a request scope", async () => {
    const cart = priceCart([], []);
    readCartLines.mockResolvedValue(lines);
    getCart.mockResolvedValue(cart);

    expect(await loadCartPage()).toEqual({ kind: "ok", data: cart });
    expect(getCart).toHaveBeenCalledWith({ lines });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("passes the logging option to the cookie read (the drawer does not log an invalid cookie)", async () => {
    readCartLines.mockResolvedValue([]);
    getCart.mockResolvedValue(priceCart([], []));

    await loadCartPage({ logInvalid: false });
    expect(readCartLines).toHaveBeenCalledWith({ logInvalid: false });
  });
});

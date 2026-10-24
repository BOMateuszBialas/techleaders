import { NotFoundError, priceCart } from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as RequireCustomer from "@/server/customer-auth/require-customer";

const getCart = vi.fn();
const getOrder = vi.fn();
const consume = vi.fn();
const dispose = vi.fn(async () => {});
const readCartLines = vi.fn();

vi.mock("@/server/container", () => ({
  createRequestScope: () => ({
    cradle: {
      env: {},
      getCartUseCase: { execute: getCart },
      getOrderByReferenceUseCase: { execute: getOrder },
      rateLimiter: { consume },
    },
    dispose,
  }),
}));
vi.mock("@/server/cart/cart-cookie", () => ({ readCartLines: () => readCartLines() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
const getCurrentCustomerId = vi.fn();
vi.mock("@/server/customer-auth/require-customer", async (importOriginal) => ({
  ...(await importOriginal<typeof RequireCustomer>()),
  getCurrentCustomerId: () => getCurrentCustomerId(),
}));
const CUSTOMER_A = "c0000000-0000-4000-8000-00000000000a";

const { loadCheckoutPage } = await import("./load-checkout-page");
const { loadOrderPage } = await import("../orders/load-order-page");

const VORTEX_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const REFERENCE = "CO-0DT7M-1EV8N-2FW9P-3GXAQ";

beforeEach(() => {
  vi.clearAllMocks();
  consume.mockResolvedValue({ allowed: true, remaining: 119 });
  getCurrentCustomerId.mockResolvedValue({ status: "none" });
});

describe("loadCheckoutPage", () => {
  it("prices the cookie's cart and renders a fresh key and the cart fingerprint", async () => {
    const lines = [{ productId: VORTEX_ID, quantity: 2 }];
    readCartLines.mockResolvedValue(lines);
    const cart = { ...priceCart([], []), storedLines: lines };
    getCart.mockResolvedValue(cart);

    const first = await loadCheckoutPage();
    const second = await loadCheckoutPage();
    expect(first).toMatchObject({ kind: "ok", data: { cart, cartFingerprint: `${VORTEX_ID}:2` } });
    expect(first.kind === "ok" && second.kind === "ok").toBe(true);
    if (first.kind === "ok" && second.kind === "ok") {
      expect(first.data.idempotencyKey).not.toBe(second.data.idempotencyKey);
    }
  });
});

describe("loadOrderPage", () => {
  it("counts the lookup, then reads the order", async () => {
    getOrder.mockResolvedValue({ reference: REFERENCE });
    expect(await loadOrderPage("/orders/[reference]", REFERENCE)).toEqual({
      kind: "ok",
      data: { kind: "order", order: { reference: REFERENCE } },
    });
    expect(consume).toHaveBeenCalledWith("order-lookup|shared", 120, 60);
    expect(getOrder).toHaveBeenCalledWith({ reference: REFERENCE, viewer: { customerId: null } });
  });

  it.each([
    [
      "the signed-in customer",
      { status: "customer", customerId: CUSTOMER_A, email: "a@x.test" },
      CUSTOMER_A,
    ],
    ["no session", { status: "none" }, null],
    ["a guest viewer on a session-read failure (A24)", { status: "error" }, null],
  ] as const)("reads with the session's viewer: %s (E07 A2)", async (_label, session, expected) => {
    getCurrentCustomerId.mockResolvedValueOnce(session);
    getOrder.mockResolvedValue({ reference: REFERENCE });
    await loadOrderPage("/orders/[reference]", REFERENCE);
    expect(getCurrentCustomerId).toHaveBeenCalledOnce();
    expect(getOrder).toHaveBeenCalledWith({
      reference: REFERENCE,
      viewer: { customerId: expected },
    });
  });

  it("answers another customer's account order as not found (E07 A2)", async () => {
    getCurrentCustomerId.mockResolvedValueOnce({
      status: "customer",
      customerId: CUSTOMER_A,
      email: "a@x.test",
    });
    getOrder.mockRejectedValueOnce(new NotFoundError());
    expect(await loadOrderPage("/orders/[reference]", REFERENCE)).toEqual({ kind: "not-found" });
  });

  it("does not query the order over the limit, and maps not found", async () => {
    consume.mockResolvedValueOnce({ allowed: false, remaining: 0 });
    expect(await loadOrderPage("/orders/[reference]", REFERENCE)).toEqual({
      kind: "ok",
      data: { kind: "limited" },
    });
    expect(getOrder).not.toHaveBeenCalled();
    expect(getCurrentCustomerId).not.toHaveBeenCalled();

    getOrder.mockRejectedValueOnce(new NotFoundError());
    expect(await loadOrderPage("/orders/[reference]", "nope")).toEqual({ kind: "not-found" });
  });
});

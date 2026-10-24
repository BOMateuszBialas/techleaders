import {
  InsufficientStockError,
  NotFoundError,
  ORDER_NOT_FOUND_MESSAGE,
  OrderNotPayableError,
} from "@commerceos/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDLE_ACTION_STATE } from "@/lib/action-state";
import { readCartLines, writeCartLines } from "../cart/cart-cookie";
import { createRequestScope } from "../container";
import { logger } from "../logger";
import { confirmDemoPayment, lookupOrder, placeOrder } from "./order.action";
import { TOO_MANY_LOOKUPS_MESSAGE } from "./order-lookup-limit";
import { REFERENCE_FORMAT_MESSAGE } from "./order-paths";

const REFERENCE = "CO-0DT7M-1EV8N-2FW9P-3GXAQ";
const VORTEX_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const stored = [{ productId: VORTEX_ID, quantity: 1 }];

const CUSTOMER_A = "c0000000-0000-4000-8000-00000000000a";
const CUSTOMER_B = "c0000000-0000-4000-8000-00000000000b";
const getCurrentCustomerId = vi.fn();

vi.mock("../customer-auth/require-customer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../customer-auth/require-customer")>()),
  getCurrentCustomerId: () => getCurrentCustomerId(),
}));

const placeOrderUseCase = { execute: vi.fn() };
const confirmDemoPaymentUseCase = { execute: vi.fn() };
const rateLimiter = { consume: vi.fn() };
const dispose = vi.fn(async () => {});

vi.mock("../container", () => ({ createRequestScope: vi.fn() }));
vi.mock("../cart/cart-cookie", () => ({ readCartLines: vi.fn(), writeCartLines: vi.fn() }));
vi.mock("../env", () => ({ getEnv: () => ({}) }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
  unstable_rethrow: vi.fn((error: unknown) => {
    if (error instanceof Error && error.message.startsWith("NEXT_")) throw error;
  }),
}));

const { refresh } = await import("next/cache");

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createRequestScope).mockReturnValue({
    cradle: { placeOrderUseCase, confirmDemoPaymentUseCase, rateLimiter },
    dispose,
  } as never);
  vi.mocked(readCartLines).mockResolvedValue(stored);
  rateLimiter.consume.mockResolvedValue({ allowed: true, remaining: 119 });
  getCurrentCustomerId.mockResolvedValue({ status: "none" });
  vi.spyOn(logger, "info").mockImplementation(() => {});
});

describe("placeOrder (public, guest checkout)", () => {
  it("places the order from the cookie's lines, clears the cart and goes to the payment page", async () => {
    placeOrderUseCase.execute.mockResolvedValue({
      orderId: "order-1",
      reference: REFERENCE,
      replayed: false,
    });

    await expect(
      placeOrder(
        IDLE_ACTION_STATE,
        form({ customerName: "Ada", price: "1", lines: "x", customerId: CUSTOMER_B }),
      ),
    ).rejects.toThrow(`NEXT_REDIRECT /checkout/pay/${REFERENCE}`);

    const call = placeOrderUseCase.execute.mock.calls[0]?.[0];
    expect(call.lines).toBe(stored);
    // Phase 2a: a guest order, even with a customer session; never a posted customer id.
    expect(call.customerId).toBeNull();
    expect(call.request).not.toHaveProperty("customerId");
    expect(getCurrentCustomerId).not.toHaveBeenCalled();
    // Only the checkout fields are read: a posted price or line list never reaches the use case.
    expect(call.request.customerName).toBe("Ada");
    expect(call.request).not.toHaveProperty("price");
    expect(call.request).not.toHaveProperty("lines");
    expect(writeCartLines).toHaveBeenCalledWith([]);
    // The id is logged, never the reference (a bearer secret).
    expect(logger.info).toHaveBeenCalledWith("order.placed", { id: "order-1" });
  });

  it("logs a replayed submit as such", async () => {
    placeOrderUseCase.execute.mockResolvedValue({
      orderId: "order-1",
      reference: REFERENCE,
      replayed: true,
    });
    await expect(placeOrder(IDLE_ACTION_STATE, form({}))).rejects.toThrow("NEXT_REDIRECT");
    expect(logger.info).toHaveBeenCalledWith("order.place.replayed", { id: "order-1" });
  });

  it("keeps the cart and refreshes the page with the conflict message", async () => {
    placeOrderUseCase.execute.mockRejectedValue(
      new InsufficientStockError(["Pulse Ultralight Mouse"]),
    );
    const state = await placeOrder(IDLE_ACTION_STATE, form({ customerName: "Ada" }));
    expect(state).toMatchObject({
      status: "error",
      message: "Sorry, Pulse Ultralight Mouse just sold out. Review your cart and try again.",
    });
    expect(state.values?.customerName).toBe("Ada");
    expect(writeCartLines).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
  });
});

describe("confirmDemoPayment", () => {
  it("counts the lookup, confirms and goes to the confirmation page", async () => {
    confirmDemoPaymentUseCase.execute.mockResolvedValue({
      orderId: "order-1",
      reference: REFERENCE,
      outcome: "paid",
    });
    await expect(
      confirmDemoPayment(IDLE_ACTION_STATE, form({ reference: REFERENCE })),
    ).rejects.toThrow(`NEXT_REDIRECT /orders/${REFERENCE}?paid=1`);
    expect(rateLimiter.consume).toHaveBeenCalledOnce();
    expect(confirmDemoPaymentUseCase.execute).toHaveBeenCalledWith({
      reference: REFERENCE,
      viewer: { customerId: null },
    });
    expect(logger.info).toHaveBeenCalledWith("payment.demo.confirmed", { id: "order-1" });
  });

  it.each([
    [
      "the signed-in customer",
      { status: "customer", customerId: CUSTOMER_A, email: "a@x.test" },
      CUSTOMER_A,
    ],
    ["a guest when the session read fails (A24)", { status: "error" }, null],
  ] as const)(
    "takes the viewer from the session only: %s (E07 A2)",
    async (_label, session, expected) => {
      getCurrentCustomerId.mockResolvedValueOnce(session);
      confirmDemoPaymentUseCase.execute.mockResolvedValue({
        orderId: "order-1",
        reference: REFERENCE,
        outcome: "paid",
      });
      await expect(
        confirmDemoPayment(
          IDLE_ACTION_STATE,
          form({ reference: REFERENCE, customerId: CUSTOMER_B, viewer: CUSTOMER_B }),
        ),
      ).rejects.toThrow("NEXT_REDIRECT");
      expect(getCurrentCustomerId).toHaveBeenCalledOnce();
      expect(confirmDemoPaymentUseCase.execute).toHaveBeenCalledWith({
        reference: REFERENCE,
        viewer: { customerId: expected },
      });
    },
  );

  it("answers another customer's order as not found and never redirects (E07 A2)", async () => {
    getCurrentCustomerId.mockResolvedValueOnce({
      status: "customer",
      customerId: CUSTOMER_B,
      email: "b@x.test",
    });
    confirmDemoPaymentUseCase.execute.mockRejectedValueOnce(
      new NotFoundError(ORDER_NOT_FOUND_MESSAGE),
    );
    await expect(
      confirmDemoPayment(IDLE_ACTION_STATE, form({ reference: REFERENCE })),
    ).resolves.toMatchObject({ status: "error", message: ORDER_NOT_FOUND_MESSAGE });
  });

  it("treats an already paid order as success", async () => {
    confirmDemoPaymentUseCase.execute.mockResolvedValue({
      orderId: "order-1",
      reference: REFERENCE,
      outcome: "already_paid",
    });
    await expect(
      confirmDemoPayment(IDLE_ACTION_STATE, form({ reference: REFERENCE })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(logger.info).toHaveBeenCalledWith("payment.demo.already_paid", { id: "order-1" });
  });

  it("refuses over the lookup limit without reading the order, and shows not-payable", async () => {
    rateLimiter.consume.mockResolvedValueOnce({ allowed: false, remaining: 0 });
    await expect(
      confirmDemoPayment(IDLE_ACTION_STATE, form({ reference: REFERENCE })),
    ).resolves.toMatchObject({ status: "error", message: TOO_MANY_LOOKUPS_MESSAGE });
    expect(confirmDemoPaymentUseCase.execute).not.toHaveBeenCalled();

    confirmDemoPaymentUseCase.execute.mockRejectedValueOnce(new OrderNotPayableError());
    await expect(
      confirmDemoPayment(IDLE_ACTION_STATE, form({ reference: REFERENCE })),
    ).resolves.toMatchObject({ message: "This order can no longer be paid." });
  });
});

describe("lookupOrder", () => {
  it("normalises a typed reference and goes to the order page", async () => {
    await expect(
      lookupOrder(IDLE_ACTION_STATE, form({ reference: " co-0dt7m 1ev8n 2fw9p 3gxaq " })),
    ).rejects.toThrow(`NEXT_REDIRECT /orders/${REFERENCE}`);
    expect(rateLimiter.consume).not.toHaveBeenCalled();
  });

  it("refuses anything that is not a reference under the field", async () => {
    await expect(lookupOrder(IDLE_ACTION_STATE, form({ reference: "12345" }))).resolves.toEqual({
      status: "error",
      message: REFERENCE_FORMAT_MESSAGE,
      fieldErrors: { reference: [REFERENCE_FORMAT_MESSAGE] },
      values: { reference: "12345" },
    });
  });
});

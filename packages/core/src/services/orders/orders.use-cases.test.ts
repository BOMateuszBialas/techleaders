import { beforeEach, describe, expect, it, vi } from "vitest";
import { money } from "../../domain/money";
import { InsufficientStockError, isOrderConflict } from "../../domain/orders/order";
import { hasAppErrorCode, isNotFoundError } from "../../errors/app-error";
import type { PaymentGateway } from "../../ports/payment-gateway.port";
import {
  STALE_CHECKOUT_FORM_MESSAGE,
  checkoutSchema,
  type CheckoutRequest,
} from "../../validators/orders/checkout.schema";
import { InMemoryCatalog, productRecord } from "../catalog/in-memory-catalog.fixture";
import { ConfirmDemoPaymentUseCase } from "../payments/confirm-demo-payment.use-case";
import { GetOrderByReferenceUseCase } from "./get-order-by-reference.use-case";
import { InMemoryOrderRepository } from "./in-memory-order-repository.fixture";
import { ORDER_NOT_FOUND_MESSAGE } from "./order.dto";
import {
  CART_CHANGED_MESSAGE,
  EMPTY_CART_MESSAGE,
  FORM_REUSED_MESSAGE,
  PlaceOrderUseCase,
} from "./place-order.use-case";

const VORTEX_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const PULSE_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e02";
const KEY = "0b7e6a9c-1d2f-4a3b-8c4d-5e6f7a8b9c0d";
const GUEST = { customerId: null };

const products = [
  productRecord({ id: VORTEX_ID, stockQuantity: 25 }),
  productRecord({
    id: PULSE_ID,
    slug: "pulse-ultralight-mouse",
    name: "Pulse Ultralight Mouse",
    priceMinor: 18900,
    stockQuantity: 1,
  }),
];

let orders: InMemoryOrderRepository;
let catalog: InMemoryCatalog;
let referenceCounter = 0;

const randomBytes = (length: number) =>
  Uint8Array.from({ length }, (_, index) => (index + referenceCounter) % 256);
const sha256Hex = vi.fn(async (text: string) => `sha:${text.length}:${text}`);

beforeEach(() => {
  orders = new InMemoryOrderRepository(products);
  catalog = new InMemoryCatalog([], products);
  referenceCounter += 1;
  sha256Hex.mockClear();
});

const placeOrder = () =>
  new PlaceOrderUseCase({
    orderRepository: orders,
    catalogRepository: catalog,
    randomBytes,
    sha256Hex,
  });

const lines = [
  { productId: VORTEX_ID, quantity: 2 },
  { productId: PULSE_ID, quantity: 1 },
];

function form(overrides: Partial<CheckoutRequest> = {}): CheckoutRequest {
  return {
    idempotencyKey: KEY,
    customerName: " Ada Lovelace ",
    customerEmail: "ada@example.test",
    shippingLine1: "ul. Marszałkowska 1",
    shippingLine2: "",
    shippingCity: "Warszawa",
    shippingPostalCode: "00-950",
    shippingCountry: "PL",
    expectedTotalMinor: "68700",
    cartFingerprint: `${VORTEX_ID}:2,${PULSE_ID}:1`,
    ...overrides,
  };
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("expected a rejection");
    },
    (error: unknown) => error,
  );
}

describe("checkoutSchema", () => {
  it("trims the fields, stores a blank second line as null and parses the total", () => {
    const parsed = checkoutSchema.parse(form());
    expect(parsed).toMatchObject({
      customerName: "Ada Lovelace",
      shippingLine2: null,
      expectedTotalMinor: 68700,
    });
    expect(checkoutSchema.parse(form({ shippingLine2: " Flat 2 " })).shippingLine2).toBe("Flat 2");
  });

  it("reports each invalid field", () => {
    const result = checkoutSchema.safeParse(
      form({
        customerName: " ",
        customerEmail: "not-an-email",
        shippingPostalCode: "00950",
        shippingCountry: "DE",
        expectedTotalMinor: "-1",
        idempotencyKey: "x",
      }),
    );
    const fields = result.error?.issues.map((issue) => [issue.path[0], issue.message]);
    expect(fields).toEqual(
      expect.arrayContaining([
        ["customerName", "Enter your name."],
        ["customerEmail", "Enter a valid email address."],
        ["shippingPostalCode", "Enter a postal code like 00-950."],
        ["shippingCountry", "We ship to Poland only."],
        ["expectedTotalMinor", STALE_CHECKOUT_FORM_MESSAGE],
        ["idempotencyKey", STALE_CHECKOUT_FORM_MESSAGE],
      ]),
    );
  });
});

describe("PlaceOrderUseCase", () => {
  it("places an order priced by the server, decrementing stock once", async () => {
    const result = await placeOrder().execute({ customerId: null, lines, request: form() });

    expect(result.replayed).toBe(false);
    expect(result.reference).toMatch(/^CO-/);
    const order = orders.orders[0];
    expect(order).toMatchObject({ status: "pending_payment", totalMinor: 68700 });
    expect(orders.stock.get(VORTEX_ID)).toBe(23);
    expect(orders.stock.get(PULSE_ID)).toBe(0);
    // The fingerprint binds the cart and the normalised customer fields, hashed.
    expect(sha256Hex.mock.calls[0]?.[0]).toContain('"customerName":"Ada Lovelace"');
    expect(order?.requestFingerprint).toBe(await sha256Hex.mock.results[0]?.value);
  });

  it("refuses an invalid form with field errors and places nothing", async () => {
    const error = await rejection(
      placeOrder().execute({ customerId: null, lines, request: form({ customerEmail: "" }) }),
    );
    expect(hasAppErrorCode(error, "VALIDATION_FAILED")).toBe(true);
    expect(error).toMatchObject({ fieldErrors: { customerEmail: expect.any(Array) } });
    expect(orders.placeCalls).toBe(0);
  });

  it("refuses an empty cart, and a cart whose lines had to be corrected", async () => {
    const empty = await rejection(
      placeOrder().execute({ customerId: null, lines: [], request: form() }),
    );
    expect(empty).toMatchObject({ message: EMPTY_CART_MESSAGE });
    const gone = await rejection(
      placeOrder().execute({
        customerId: null,
        lines: [{ productId: "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3eff", quantity: 1 }],
        request: form(),
      }),
    );
    expect(isOrderConflict(gone, "cart_changed")).toBe(true);
    expect(gone).toMatchObject({
      message: "A product in your cart is no longer available and was removed.",
    });
  });

  it("refuses a cart that changed after the checkout rendered", async () => {
    const error = await rejection(
      placeOrder().execute({
        customerId: null,
        lines: [{ productId: VORTEX_ID, quantity: 1 }],
        request: form(),
      }),
    );
    expect(isOrderConflict(error, "cart_changed")).toBe(true);
    expect(error).toMatchObject({ message: CART_CHANGED_MESSAGE });
    expect(orders.placeCalls).toBe(0);
  });

  it("refuses a changed price: the client total is only compared, never used", async () => {
    const error = await rejection(
      placeOrder().execute({
        customerId: null,
        lines,
        request: form({ expectedTotalMinor: "100" }),
      }),
    );
    expect(isOrderConflict(error, "price_changed")).toBe(true);
    expect(orders.orders).toEqual([]);
    expect(orders.stock.get(VORTEX_ID)).toBe(25);
  });

  it("returns the same order for a repeated submit without touching stock again", async () => {
    const first = await placeOrder().execute({ customerId: null, lines, request: form() });
    const again = await placeOrder().execute({ customerId: null, lines, request: form() });
    expect(again).toEqual({ orderId: first.orderId, reference: first.reference, replayed: true });
    expect(orders.placeCalls).toBe(1);
    expect(orders.stock.get(VORTEX_ID)).toBe(23);
  });

  it("returns the order for a repeat that arrives after the cart was cleared (second tab)", async () => {
    const first = await placeOrder().execute({ customerId: null, lines, request: form() });
    const again = await placeOrder().execute({ customerId: null, lines: [], request: form() });
    expect(again).toEqual({ orderId: first.orderId, reference: first.reference, replayed: true });
  });

  it("refuses a reused form with another customer", async () => {
    await placeOrder().execute({ customerId: null, lines, request: form() });
    const error = await rejection(
      placeOrder().execute({
        customerId: null,
        lines,
        request: form({ customerName: "Someone Else" }),
      }),
    );
    expect(isOrderConflict(error, "form_reused")).toBe(true);
    expect(error).toMatchObject({ message: FORM_REUSED_MESSAGE });
  });

  it("returns the winner's order when a concurrent identical submit took the last unit", async () => {
    const winner = await placeOrder().execute({ customerId: null, lines, request: form() });
    // Simulate the race: the fast-path lookup missed, the placement then fails on stock.
    const missOnce = vi.spyOn(orders, "findByIdempotencyKey").mockResolvedValueOnce(null);
    orders.failNextPlacement = new InsufficientStockError(["Pulse Ultralight Mouse"]);

    const result = await placeOrder().execute({ customerId: null, lines, request: form() });
    expect(result).toEqual({
      orderId: winner.orderId,
      reference: winner.reference,
      replayed: true,
    });
    expect(missOnce).toHaveBeenCalledTimes(2);
  });

  it("rethrows a placement failure when no order with the key exists", async () => {
    orders.failNextPlacement = new InsufficientStockError(["Pulse Ultralight Mouse"]);
    const error = await rejection(
      placeOrder().execute({ customerId: null, lines, request: form() }),
    );
    expect(isOrderConflict(error, "insufficient_stock")).toBe(true);
  });
});

describe("PlaceOrderUseCase across principals (E07 A15)", () => {
  const CUSTOMER_A = "c0000000-0000-4000-8000-00000000000a";
  const CUSTOMER_B = "c0000000-0000-4000-8000-00000000000b";

  /** The form_reused conflict, with nothing of the original order in it. */
  function expectFormReused(error: unknown, original: { orderId: string; reference: string }) {
    expect(isOrderConflict(error, "form_reused")).toBe(true);
    expect(error).toMatchObject({ message: FORM_REUSED_MESSAGE });
    const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error));
    expect(serialized).not.toContain(original.reference);
    expect(serialized).not.toContain(original.orderId);
    expect(serialized).not.toContain("68700");
  }

  it("attaches the order to the given customer and folds the principal into the fingerprint", async () => {
    await placeOrder().execute({ customerId: CUSTOMER_A, lines, request: form() });
    expect(orders.orders[0]?.customerId).toBe(CUSTOMER_A);
    expect(sha256Hex).toHaveBeenLastCalledWith(
      expect.stringContaining(`"principal":"customer:${CUSTOMER_A}"`),
    );

    orders = new InMemoryOrderRepository(products);
    await placeOrder().execute({ customerId: null, lines, request: form() });
    expect(orders.orders[0]?.customerId).toBeNull();
    expect(sha256Hex).toHaveBeenLastCalledWith(expect.stringContaining(`"principal":"guest"`));
  });

  it("never reads a customer id from the submitted form", async () => {
    const request = { ...form(), customerId: CUSTOMER_B };
    await placeOrder().execute({ customerId: null, lines, request });
    expect(orders.orders[0]?.customerId).toBeNull();
  });

  it("refuses the same form replayed by another customer or a guest, placing nothing more", async () => {
    const original = await placeOrder().execute({ customerId: CUSTOMER_A, lines, request: form() });
    for (const customerId of [CUSTOMER_B, null]) {
      const error = await rejection(placeOrder().execute({ customerId, lines, request: form() }));
      expectFormReused(error, original);
    }
    expect(orders.orders).toHaveLength(1);
    expect(orders.stock.get(PULSE_ID)).toBe(0);
    expect(orders.stock.get(VORTEX_ID)).toBe(23);
    // The placer itself still gets its order back.
    expect(
      await placeOrder().execute({ customerId: CUSTOMER_A, lines, request: form() }),
    ).toMatchObject({ reference: original.reference, replayed: true });
  });

  it("refuses a guest's form replayed by a customer", async () => {
    const original = await placeOrder().execute({ customerId: null, lines, request: form() });
    const error = await rejection(
      placeOrder().execute({ customerId: CUSTOMER_A, lines, request: form() }),
    );
    expectFormReused(error, original);
  });

  it("refuses another principal on the post-failure lookup too", async () => {
    const original = await placeOrder().execute({ customerId: CUSTOMER_A, lines, request: form() });
    // The fast-path lookup misses (a concurrent submit); the placement then fails because A's
    // order took the last Pulse unit, and the post-failure lookup finds A's order.
    vi.spyOn(orders, "findByIdempotencyKey").mockResolvedValueOnce(null);
    const error = await rejection(
      placeOrder().execute({ customerId: CUSTOMER_B, lines, request: form() }),
    );
    expectFormReused(error, original);
    expect(orders.orders).toHaveLength(1);
  });

  it("compares the stored customer even when the fingerprint matches", async () => {
    const original = await placeOrder().execute({ customerId: null, lines, request: form() });
    // As if the fingerprint inputs ever stopped covering the principal.
    Object.assign(orders.orders[0] ?? {}, { customerId: CUSTOMER_A });
    const error = await rejection(
      placeOrder().execute({ customerId: null, lines, request: form() }),
    );
    expectFormReused(error, original);
  });
});

describe("GetOrderByReferenceUseCase and ConfirmDemoPaymentUseCase", () => {
  const authorize = vi.fn(async (request: { idempotencyKey: string }) => ({
    providerReference: `DEMO-PAY-${request.idempotencyKey}`,
  }));
  const gateway: PaymentGateway = { provider: "demo", isLive: false, authorize };
  const confirm = () =>
    new ConfirmDemoPaymentUseCase({ orderRepository: orders, paymentGateway: gateway });
  const get = () => new GetOrderByReferenceUseCase({ orderRepository: orders });

  beforeEach(() => {
    authorize.mockClear();
  });

  async function placed(): Promise<string> {
    return (await placeOrder().execute({ customerId: null, lines, request: form() })).reference;
  }

  it("reads an order without personal data, by any spelling of its reference", async () => {
    const reference = await placed();
    const view = await get().execute({
      viewer: GUEST,
      reference: reference.toLowerCase().replace(/-/g, " "),
    });
    expect(view).toEqual({
      reference,
      status: "pending_payment",
      createdAt: expect.any(Date),
      paidAt: null,
      items: [
        {
          name: "Vortex Wireless Mouse",
          unitPrice: money(24900, "PLN"),
          quantity: 2,
          lineTotal: money(49800, "PLN"),
        },
        {
          name: "Pulse Ultralight Mouse",
          unitPrice: money(18900, "PLN"),
          quantity: 1,
          lineTotal: money(18900, "PLN"),
        },
      ],
      subtotal: money(68700, "PLN"),
      shipping: money(0, "PLN"),
      total: money(68700, "PLN"),
      paymentProvider: null,
    });
    expect(JSON.stringify(view)).not.toContain("Ada");
  });

  it("answers the same 'not found' for a malformed and an unknown reference", async () => {
    for (const reference of ["nope", "CO-00000-00000-00000-00000"]) {
      const error = await rejection(get().execute({ viewer: GUEST, reference }));
      expect(isNotFoundError(error)).toBe(true);
      expect(error).toMatchObject({ message: ORDER_NOT_FOUND_MESSAGE });
    }
  });

  it("marks a pending order paid with the order id as the gateway's idempotency key", async () => {
    const reference = await placed();
    expect(await confirm().execute({ viewer: GUEST, reference })).toMatchObject({
      reference,
      outcome: "paid",
    });
    const order = orders.orders[0];
    expect(authorize).toHaveBeenCalledWith({
      idempotencyKey: order?.id,
      amount: money(68700, "PLN"),
    });
    expect(order).toMatchObject({
      status: "paid",
      paymentProvider: "demo",
      paymentReference: `DEMO-PAY-${order?.id}`,
    });
  });

  it("is idempotent: a second confirmation succeeds without a second authorize", async () => {
    const reference = await placed();
    await confirm().execute({ viewer: GUEST, reference });
    expect(await confirm().execute({ viewer: GUEST, reference })).toMatchObject({
      reference,
      outcome: "already_paid",
    });
    expect(authorize).toHaveBeenCalledTimes(1);
  });

  it("reports a concurrent winner as already paid", async () => {
    const reference = await placed();
    const markPaid = vi.spyOn(orders, "markPaid").mockResolvedValueOnce("already_paid");
    expect(await confirm().execute({ viewer: GUEST, reference })).toMatchObject({
      reference,
      outcome: "already_paid",
    });
    expect(markPaid).toHaveBeenCalledOnce();
  });

  it("refuses a cancelled order and reports a vanished one as not found", async () => {
    const reference = await placed();
    Object.assign(orders.orders[0] ?? {}, { status: "cancelled" });
    let error = await rejection(confirm().execute({ viewer: GUEST, reference }));
    expect(isOrderConflict(error, "not_payable")).toBe(true);
    expect(authorize).not.toHaveBeenCalled();

    Object.assign(orders.orders[0] ?? {}, { status: "pending_payment" });
    vi.spyOn(orders, "markPaid").mockResolvedValueOnce("not_payable");
    error = await rejection(confirm().execute({ viewer: GUEST, reference }));
    expect(isOrderConflict(error, "not_payable")).toBe(true);

    vi.spyOn(orders, "markPaid").mockResolvedValueOnce("not_found");
    error = await rejection(confirm().execute({ viewer: GUEST, reference }));
    expect(isNotFoundError(error)).toBe(true);

    error = await rejection(
      confirm().execute({ viewer: GUEST, reference: "CO-00000-00000-00000-00000" }),
    );
    expect(isNotFoundError(error)).toBe(true);
  });

  describe("ownership by viewer (E07 A2)", () => {
    const CUSTOMER_A = "c0000000-0000-4000-8000-00000000000a";
    const CUSTOMER_B = "c0000000-0000-4000-8000-00000000000b";

    async function placedBy(customerId: string | null): Promise<string> {
      return (await placeOrder().execute({ customerId, lines, request: form() })).reference;
    }

    async function expectUnknownReference(promise: Promise<unknown>) {
      const error = await rejection(promise);
      expect(isNotFoundError(error)).toBe(true);
      expect(error).toMatchObject({ message: ORDER_NOT_FOUND_MESSAGE });
    }

    it("serves a guest order to any viewer (bearer reference)", async () => {
      const reference = await placedBy(null);
      for (const viewer of [GUEST, { customerId: CUSTOMER_A }]) {
        expect(await get().execute({ viewer, reference })).toMatchObject({ reference });
      }
    });

    it("serves an account order only to its own customer", async () => {
      const reference = await placedBy(CUSTOMER_A);
      expect(await get().execute({ viewer: { customerId: CUSTOMER_A }, reference })).toMatchObject({
        reference,
      });
      await expectUnknownReference(
        get().execute({ viewer: { customerId: CUSTOMER_B }, reference }),
      );
      await expectUnknownReference(get().execute({ viewer: GUEST, reference }));
    });

    it.each([
      ["pending", {}],
      ["already paid", { status: "paid", paidAt: new Date("2026-10-16T10:05:00.000Z") }],
      ["cancelled", { status: "cancelled" }],
    ])(
      "answers a foreign viewer's payment of a %s account order as an unknown reference",
      async (_state, patch) => {
        const reference = await placedBy(CUSTOMER_A);
        Object.assign(orders.orders[0] ?? {}, patch);
        const markPaid = vi.spyOn(orders, "markPaid");
        for (const viewer of [{ customerId: CUSTOMER_B }, GUEST]) {
          await expectUnknownReference(confirm().execute({ viewer, reference }));
        }
        expect(authorize).not.toHaveBeenCalled();
        expect(markPaid).not.toHaveBeenCalled();
        expect(orders.orders[0]).toMatchObject({ customerId: CUSTOMER_A });
      },
    );

    it("lets the owning customer pay their account order", async () => {
      const reference = await placedBy(CUSTOMER_A);
      expect(
        await confirm().execute({ viewer: { customerId: CUSTOMER_A }, reference }),
      ).toMatchObject({ reference, outcome: "paid" });
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { money } from "../../domain/money";
import { isNotFoundError } from "../../errors/app-error";
import type { CustomerOrderSummaryRecord } from "../../ports/order-repository.port";
import { InMemoryCatalog, productRecord } from "../catalog/in-memory-catalog.fixture";
import { CUSTOMER_ORDERS_LIMIT, CUSTOMER_ORDER_NOT_FOUND_MESSAGE } from "./customer-order.dto";
import { GetCustomerOrderUseCase } from "./get-customer-order.use-case";
import { InMemoryOrderRepository } from "./in-memory-order-repository.fixture";
import { ListCustomerOrdersUseCase } from "./list-customer-orders.use-case";
import { PlaceOrderUseCase } from "./place-order.use-case";

const VORTEX_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const CUSTOMER_A = "c0000000-0000-4000-8000-00000000000a";
const CUSTOMER_B = "c0000000-0000-4000-8000-00000000000b";
const products = [productRecord({ id: VORTEX_ID, stockQuantity: 100 })];
const lines = [{ productId: VORTEX_ID, quantity: 1 }];

let orders: InMemoryOrderRepository;
let keyCounter = 0;

beforeEach(() => {
  orders = new InMemoryOrderRepository(products);
});

/** Places one order through the real use case; returns its id. */
async function place(customerId: string | null): Promise<string> {
  keyCounter += 1;
  const key = `0b7e6a9c-1d2f-4a3b-8c4d-${String(keyCounter).padStart(12, "0")}`;
  const result = await new PlaceOrderUseCase({
    orderRepository: orders,
    catalogRepository: new InMemoryCatalog([], products),
    randomBytes: (length) => Uint8Array.from({ length }, (_, index) => (index + keyCounter) % 256),
    sha256Hex: async (text) => `sha:${text}`,
  }).execute({
    customerId,
    lines,
    request: {
      idempotencyKey: key,
      customerName: "Ada Lovelace",
      customerEmail: "ada@example.test",
      shippingLine1: "ul. Marszałkowska 1",
      shippingLine2: "",
      shippingCity: "Warszawa",
      shippingPostalCode: "00-950",
      shippingCountry: "PL",
      expectedTotalMinor: "24900",
      cartFingerprint: `${VORTEX_ID}:1`,
    },
  });
  return result.orderId;
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("expected a rejection");
    },
    (error: unknown) => error,
  );
}

describe("ListCustomerOrdersUseCase (E07 A12, A13)", () => {
  const list = () => new ListCustomerOrdersUseCase({ orderRepository: orders });

  it("lists only the customer's own orders, never a guest's or another customer's", async () => {
    const mine = await place(CUSTOMER_A);
    await place(CUSTOMER_B);
    await place(null);
    const result = await list().execute({ customerId: CUSTOMER_A });
    expect(result).toEqual({
      capped: false,
      orders: [
        {
          id: mine,
          reference: expect.stringMatching(/^CO-/),
          createdAt: expect.any(Date),
          status: "pending_payment",
          total: money(24900, "PLN"),
        },
      ],
    });
    expect(await list().execute({ customerId: CUSTOMER_B })).toMatchObject({
      orders: [expect.not.objectContaining({ id: mine })],
    });
  });

  it("is empty for a customer without orders", async () => {
    await place(CUSTOMER_B);
    expect(await list().execute({ customerId: CUSTOMER_A })).toEqual({ orders: [], capped: false });
  });

  it("asks for one row more than it shows, and reports a capped list", async () => {
    const row = (index: number): CustomerOrderSummaryRecord => ({
      id: `order-${index}`,
      reference: `CO-${index}`,
      status: "paid",
      currency: "PLN",
      totalMinor: 100,
      createdAt: new Date(2026, 9, 1),
    });
    const listForCustomer = vi
      .spyOn(orders, "listForCustomer")
      .mockResolvedValueOnce(Array.from({ length: CUSTOMER_ORDERS_LIMIT + 1 }, (_, i) => row(i)));
    const result = await list().execute({ customerId: CUSTOMER_A });
    expect(listForCustomer).toHaveBeenCalledWith(CUSTOMER_A, CUSTOMER_ORDERS_LIMIT + 1);
    expect(result.capped).toBe(true);
    expect(result.orders).toHaveLength(CUSTOMER_ORDERS_LIMIT);
    expect(result.orders.at(-1)?.id).toBe(`order-${CUSTOMER_ORDERS_LIMIT - 1}`);
  });
});

describe("GetCustomerOrderUseCase (E07 A11, A12, A14)", () => {
  const get = () => new GetCustomerOrderUseCase({ orderRepository: orders });

  it("returns the customer's own order with items, totals, contact and address", async () => {
    const id = await place(CUSTOMER_A);
    expect(await get().execute({ customerId: CUSTOMER_A, orderId: id })).toEqual({
      id,
      reference: expect.stringMatching(/^CO-/),
      createdAt: expect.any(Date),
      status: "pending_payment",
      total: money(24900, "PLN"),
      items: [
        {
          name: "Vortex Wireless Mouse",
          unitPrice: money(24900, "PLN"),
          quantity: 1,
          lineTotal: money(24900, "PLN"),
        },
      ],
      subtotal: money(24900, "PLN"),
      shipping: money(0, "PLN"),
      paidAt: null,
      paymentProvider: null,
      contact: { name: "Ada Lovelace", email: "ada@example.test" },
      shippingAddress: {
        line1: "ul. Marszałkowska 1",
        line2: null,
        city: "Warszawa",
        postalCode: "00-950",
        country: "PL",
      },
    });
  });

  it("answers a malformed, an unknown and a foreign id with the same not found", async () => {
    const foreign = await place(CUSTOMER_B);
    const guest = await place(null);
    const findForCustomer = vi.spyOn(orders, "findForCustomer");
    const errors = [];
    for (const orderId of ["not-a-uuid", "d0000000-0000-4000-8000-000000000000", foreign, guest]) {
      errors.push(await rejection(get().execute({ customerId: CUSTOMER_A, orderId })));
    }
    for (const error of errors) {
      expect(isNotFoundError(error)).toBe(true);
      expect(error).toMatchObject({ message: CUSTOMER_ORDER_NOT_FOUND_MESSAGE });
    }
    // The malformed id never reaches the repository.
    expect(findForCustomer.mock.calls.map(([, orderId]) => orderId)).not.toContain("not-a-uuid");
    expect(findForCustomer).toHaveBeenCalledWith(CUSTOMER_A, foreign);
  });
});

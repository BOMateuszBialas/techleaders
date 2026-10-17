import { describe, expect, it, vi } from "vitest";
import { ORDER_STATUSES, type OrderStatus } from "../../domain/orders/order";
import { StaleOrderStatusError, isStaleOrderStatusError } from "../../domain/orders/order-status";
import { hasAppErrorCode, isNotFoundError } from "../../errors/app-error";
import type {
  AdminOrderListRecord,
  AdminOrderRecord,
  ChangeOrderStatusOutcome,
  OrderAdminPort,
} from "../../ports/order-admin.port";
import {
  ADMIN_ORDERS_PAGE_SIZE,
  TRANSITION_NOT_ALLOWED_MESSAGE,
  parseAdminOrderPage,
} from "../../validators/orders/order-status-change.schema";
import { ADMIN_ORDER_NOT_FOUND_MESSAGE } from "./admin-order.dto";
import { ChangeOrderStatusUseCase } from "./change-order-status.use-case";
import { GetAdminOrderUseCase } from "./get-admin-order.use-case";
import { ListAdminOrdersUseCase } from "./list-admin-orders.use-case";

const ORDER_ID = "0d2f1d6e-5b1c-4a55-9e2a-3f1b6c0d9a01";
const PRODUCT_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const createdAt = new Date("2026-10-16T10:00:00.000Z");

function record(overrides: Partial<AdminOrderRecord> = {}): AdminOrderRecord {
  return {
    id: ORDER_ID,
    reference: "CO-7K3MQ-9XZ2A-H4TPC-W8R1N",
    status: "pending_payment",
    currency: "PLN",
    subtotalMinor: 54700,
    shippingMinor: 0,
    totalMinor: 54700,
    customerName: "Ada Lovelace",
    customerEmail: "ada@example.test",
    shippingLine1: "ul. Marszałkowska 1",
    shippingLine2: null,
    shippingCity: "Warszawa",
    shippingPostalCode: "00-950",
    shippingCountry: "PL",
    paymentProvider: null,
    paymentReference: null,
    paidAt: null,
    createdAt,
    updatedAt: createdAt,
    items: [
      {
        id: "i-1",
        productId: PRODUCT_ID,
        name: "Vortex Wireless Mouse",
        sku: "DEMO-MOU-001",
        unitPriceMinor: 24900,
        quantity: 2,
        lineTotalMinor: 49800,
      },
      {
        id: "i-2",
        productId: null,
        name: "Old Pad",
        sku: null,
        unitPriceMinor: 4900,
        quantity: 1,
        lineTotalMinor: 4900,
      },
    ],
    ...overrides,
  };
}

function fakePort(overrides: Partial<OrderAdminPort> = {}): OrderAdminPort {
  return {
    listOrders: vi.fn(async () => ({ rows: [], total: 0 })),
    findOrderById: vi.fn(async () => null),
    changeStatus: vi.fn(async (): Promise<ChangeOrderStatusOutcome> => ({ kind: "not_found" })),
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

describe("parseAdminOrderPage", () => {
  it.each([
    [undefined, 1],
    ["2", 2],
    [3, 3],
    ["-1", 1],
    ["0", 1],
    ["abc", 1],
    ["1.5", 1],
    ["", 1],
    ["99999999", 1],
  ])("reads %j as page %d", (value, page) => {
    expect(parseAdminOrderPage(value)).toBe(page);
  });
});

describe("ListAdminOrdersUseCase", () => {
  const row = (reference: string, status: OrderStatus = "paid"): AdminOrderListRecord => ({
    id: ORDER_ID,
    reference,
    status,
    currency: "PLN",
    totalMinor: 24900,
    itemCount: 2,
    createdAt,
  });

  it("asks for one page of 25 and labels each row, marking demo orders", async () => {
    const listOrders = vi.fn(async () => ({
      rows: [row("CO-7K3MQ-9XZ2A-H4TPC-W8R1N", "processing"), row("DEMO-0001", "shipped")],
      total: 51,
    }));
    const result = await new ListAdminOrdersUseCase({
      orderAdminRepository: fakePort({ listOrders }),
    }).execute({ page: "2" });

    expect(listOrders).toHaveBeenCalledWith({ offset: 25, limit: ADMIN_ORDERS_PAGE_SIZE });
    expect(result).toEqual({
      page: 2,
      pageCount: 3,
      total: 51,
      rows: [
        {
          id: ORDER_ID,
          reference: "CO-7K3MQ-9XZ2A-H4TPC-W8R1N",
          createdAt,
          status: "processing",
          statusLabel: "Processing",
          total: { amountMinor: 24900, currency: "PLN" },
          itemCount: 2,
          isDemo: false,
        },
        expect.objectContaining({ reference: "DEMO-0001", statusLabel: "Shipped", isDemo: true }),
      ],
    });
  });

  it("falls back to page 1 and reports one page for an empty store", async () => {
    const port = fakePort();
    const result = await new ListAdminOrdersUseCase({ orderAdminRepository: port }).execute();
    expect(result).toEqual({ rows: [], page: 1, pageCount: 1, total: 0 });
    expect(port.listOrders).toHaveBeenCalledWith({ offset: 0, limit: 25 });
  });
});

describe("GetAdminOrderUseCase", () => {
  it("returns the order with labels, money, customer data and its allowed transitions", async () => {
    const port = fakePort({ findOrderById: vi.fn(async () => record()) });
    const view = await new GetAdminOrderUseCase({ orderAdminRepository: port }).execute({
      id: ORDER_ID,
    });

    expect(view).toMatchObject({
      id: ORDER_ID,
      statusLabel: "Awaiting payment",
      isDemo: false,
      subtotal: { amountMinor: 54700, currency: "PLN" },
      shipping: { amountMinor: 0, currency: "PLN" },
      total: { amountMinor: 54700, currency: "PLN" },
      customer: { name: "Ada Lovelace", email: "ada@example.test" },
      shippingAddress: {
        line1: "ul. Marszałkowska 1",
        line2: null,
        city: "Warszawa",
        postalCode: "00-950",
        country: "PL",
      },
      payment: null,
      // The deleted product's line cannot be restocked.
      restockableUnits: 2,
      allowedTransitions: [
        { to: "cancelled", toLabel: "Cancelled", restocks: true, isRecordOnly: false },
      ],
    });
    expect(view.items[0]).toEqual({
      id: "i-1",
      productId: PRODUCT_ID,
      name: "Vortex Wireless Mouse",
      sku: "DEMO-MOU-001",
      unitPrice: { amountMinor: 24900, currency: "PLN" },
      quantity: 2,
      lineTotal: { amountMinor: 49800, currency: "PLN" },
    });
    expect(port.findOrderById).toHaveBeenCalledWith(ORDER_ID);
  });

  it("describes a paid demo order's payment and its record-only refund", async () => {
    const port = fakePort({
      findOrderById: vi.fn(async () =>
        record({
          reference: "DEMO-0007",
          status: "shipped",
          paymentProvider: "demo",
          paymentReference: "DEMO-PAY-1",
          paidAt: createdAt,
        }),
      ),
    });
    const view = await new GetAdminOrderUseCase({ orderAdminRepository: port }).execute({
      id: ORDER_ID,
    });
    expect(view).toMatchObject({
      isDemo: true,
      payment: { provider: "demo", reference: "DEMO-PAY-1" },
      allowedTransitions: [
        { to: "refunded", toLabel: "Refunded", restocks: false, isRecordOnly: true },
      ],
    });
  });

  it.each([
    ["a malformed id", "not-a-uuid"],
    ["an unknown id", ORDER_ID],
  ])("treats %s as not found", async (_label, id) => {
    const port = fakePort();
    const error = await rejection(
      new GetAdminOrderUseCase({ orderAdminRepository: port }).execute({ id }),
    );
    expect(isNotFoundError(error)).toBe(true);
    expect((error as Error).message).toBe(ADMIN_ORDER_NOT_FOUND_MESSAGE);
    expect(port.findOrderById).toHaveBeenCalledTimes(id === ORDER_ID ? 1 : 0);
  });
});

describe("ChangeOrderStatusUseCase", () => {
  const changed = (status: OrderStatus, restockedUnits = 0): ChangeOrderStatusOutcome => ({
    kind: "changed",
    order: record({ status, paidAt: status === "cancelled" ? null : createdAt }),
    restockedUnits,
  });

  it("cancels an unpaid order and asks the port to restock", async () => {
    const changeStatus = vi.fn(async () => changed("cancelled", 2));
    const result = await new ChangeOrderStatusUseCase({
      orderAdminRepository: fakePort({ changeStatus }),
    }).execute({ orderId: ` ${ORDER_ID} `, from: "pending_payment", to: "cancelled" });

    expect(changeStatus).toHaveBeenCalledWith({
      orderId: ORDER_ID,
      from: "pending_payment",
      to: "cancelled",
      restock: true,
    });
    expect(result).toMatchObject({
      from: "pending_payment",
      to: "cancelled",
      restockedUnits: 2,
      order: { status: "cancelled", allowedTransitions: [] },
    });
  });

  it.each([
    ["paid", "processing"],
    ["processing", "shipped"],
    ["shipped", "refunded"],
    ["paid", "refunded"],
  ] as const)("moves %s → %s without a restock", async (from, to) => {
    const changeStatus = vi.fn(async () => changed(to));
    await new ChangeOrderStatusUseCase({
      orderAdminRepository: fakePort({ changeStatus }),
    }).execute({ orderId: ORDER_ID, from, to });
    expect(changeStatus).toHaveBeenCalledWith({ orderId: ORDER_ID, from, to, restock: false });
  });

  const disallowed = ORDER_STATUSES.flatMap((from) =>
    ORDER_STATUSES.map((to) => [from, to] as const),
  ).filter(
    ([from, to]) =>
      !(
        (from === "pending_payment" && to === "cancelled") ||
        (from === "paid" && (to === "processing" || to === "refunded")) ||
        (from === "processing" && (to === "shipped" || to === "refunded")) ||
        (from === "shipped" && to === "refunded")
      ),
  );

  it.each(disallowed)("refuses %s → %s before the port is called", async (from, to) => {
    const port = fakePort();
    const error = await rejection(
      new ChangeOrderStatusUseCase({ orderAdminRepository: port }).execute({
        orderId: ORDER_ID,
        from,
        to,
      }),
    );
    expect(hasAppErrorCode(error, "VALIDATION_FAILED")).toBe(true);
    expect((error as Error).message).toBe(TRANSITION_NOT_ALLOWED_MESSAGE);
    expect(port.changeStatus).not.toHaveBeenCalled();
  });

  it.each([
    { orderId: ORDER_ID, from: "paid", to: "teleported" },
    { orderId: ORDER_ID, from: "PAID", to: "processing" },
    { orderId: ORDER_ID, from: "", to: "" },
  ])("refuses unknown statuses %j with the same message", async (request) => {
    const port = fakePort();
    const error = await rejection(
      new ChangeOrderStatusUseCase({ orderAdminRepository: port }).execute(request as never),
    );
    expect(error).toMatchObject({ message: TRANSITION_NOT_ALLOWED_MESSAGE, fieldErrors: {} });
    expect(port.changeStatus).not.toHaveBeenCalled();
  });

  it("treats a malformed or unknown order as not found", async () => {
    const port = fakePort();
    const useCase = new ChangeOrderStatusUseCase({ orderAdminRepository: port });
    const malformed = await rejection(
      useCase.execute({ orderId: "x", from: "paid", to: "processing" }),
    );
    expect(isNotFoundError(malformed)).toBe(true);
    expect(port.changeStatus).not.toHaveBeenCalled();

    const unknown = await rejection(
      useCase.execute({ orderId: ORDER_ID, from: "paid", to: "processing" }),
    );
    expect(isNotFoundError(unknown)).toBe(true);
  });

  it("refuses a stale change with the status the order has now", async () => {
    const port = fakePort({
      changeStatus: vi.fn(async () => ({ kind: "stale", currentStatus: "paid" }) as const),
    });
    const error = await rejection(
      new ChangeOrderStatusUseCase({ orderAdminRepository: port }).execute({
        orderId: ORDER_ID,
        from: "pending_payment",
        to: "cancelled",
      }),
    );
    expect(error).toBeInstanceOf(StaleOrderStatusError);
    expect(isStaleOrderStatusError(error) && error.currentStatus).toBe("paid");
    expect((error as Error).message).toBe(
      "This order changed to Paid in the meantime. Review it and try again.",
    );
  });

  it("tells a stale-status conflict from other conflicts", () => {
    expect(isStaleOrderStatusError(new StaleOrderStatusError("shipped"))).toBe(true);
    expect(
      isStaleOrderStatusError(
        Object.assign(new Error("x"), { code: "CONFLICT", currentStatus: 3 }),
      ),
    ).toBe(false);
    expect(isStaleOrderStatusError(new Error("x"))).toBe(false);
  });
});

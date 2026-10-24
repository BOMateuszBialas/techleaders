import { afterAll, describe, expect, it, vi } from "vitest";
import { hasAppErrorCode, isOrderConflict, type PlaceOrderCommand } from "@commerceos/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { createUnitTestOrm } from "../testing/unit-orm";
import { DUPLICATE_SUBMIT_MESSAGE, DatabaseOrderRepository } from "./database-order-repository";

const orm = createUnitTestOrm();

afterAll(async () => {
  await orm.close();
});

const A = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const B = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e02";
const createdAt = new Date("2026-10-16T10:00:00.000Z");

function command(overrides: Partial<PlaceOrderCommand> = {}): PlaceOrderCommand {
  return {
    idempotencyKey: "key-1",
    requestFingerprint: "fp",
    customerId: null,
    customer: {
      customerName: "Ada",
      customerEmail: "ada@example.test",
      shippingLine1: "ul. 1",
      shippingLine2: null,
      shippingCity: "Warszawa",
      shippingPostalCode: "00-950",
      shippingCountry: "PL",
    },
    lines: [
      { productId: B, quantity: 1 },
      { productId: A, quantity: 2 },
    ],
    newReference: () => "CO-AAAAA-AAAAA-AAAAA-AAAAA",
    buildDraft: (reserved) => ({
      currency: "PLN",
      items: reserved.map((line) => ({
        productId: line.productId,
        name: line.name,
        sku: line.sku,
        unitPriceMinor: line.unitPriceMinor,
        quantity: line.quantity,
        lineTotalMinor: line.unitPriceMinor * line.quantity,
      })),
      subtotalMinor: 100,
      shippingMinor: 0,
      totalMinor: 100,
    }),
    ...overrides,
  };
}

function uniqueViolation(constraint: string): Error {
  return Object.assign(new Error("duplicate key"), { code: "23505", constraint });
}

const orderRow = {
  id: "order-1",
  publicReference: "CO-AAAAA-AAAAA-AAAAA-AAAAA",
  requestFingerprint: "fp",
  status: "paid",
  currency: "PLN",
  subtotalMinor: 100,
  shippingMinor: 0,
  totalMinor: 100,
  paymentProvider: "demo",
  paymentReference: "DEMO-PAY-order-1",
  paidAt: createdAt,
  createdAt,
};

// The stubs return plain rows shaped like the entities; the ORM's generic signatures
// cannot be satisfied by plain objects, so their results are typed loosely on purpose.
function setup() {
  const em = orm.em.fork();
  const tx = orm.em.fork();
  vi.spyOn(em, "transactional").mockImplementation(((
    callback: (em: EntityManager) => Promise<unknown>,
  ) => callback(tx)) as never);
  const create = vi.spyOn(tx, "create").mockImplementation(((_schema: unknown, data: object) => ({
    id: "order-1",
    createdAt,
    ...data,
  })) as never);
  return {
    em,
    tx,
    txExecute: vi.spyOn(tx, "execute"),
    create,
    flush: vi.spyOn(tx, "flush").mockResolvedValue(undefined),
    execute: vi.spyOn(em, "execute"),
    findOne: vi.spyOn(em, "findOne"),
    find: vi.spyOn(em, "find"),
    repository: new DatabaseOrderRepository({ em }),
  };
}

const reservedRow = (id: string, name: string) => [
  { id, name, sku: null, price_minor: 50, currency: "PLN" },
];

describe("DatabaseOrderRepository.placeOrder", () => {
  it("reserves lines in product-id order, then inserts the order and its items", async () => {
    const { txExecute, create, flush, repository } = setup();
    txExecute
      .mockResolvedValueOnce(reservedRow(A, "Alpha") as never)
      .mockResolvedValueOnce(reservedRow(B, "Beta") as never);

    const order = await repository.placeOrder(command());

    expect(txExecute.mock.calls.map((call) => call[1])).toEqual([
      [2, A, 2],
      [1, B, 1],
    ]);
    expect(String(txExecute.mock.calls[0]?.[0])).toContain("stock_quantity >= ?");
    expect(create).toHaveBeenCalledTimes(3);
    expect(flush).toHaveBeenCalledOnce();
    expect(order).toMatchObject({
      id: "order-1",
      reference: "CO-AAAAA-AAAAA-AAAAA-AAAAA",
      status: "pending_payment",
      paymentProvider: null,
      paymentReference: null,
      paidAt: null,
      items: [
        { productId: null, name: "Alpha", unitPriceMinor: 50, quantity: 2, lineTotalMinor: 100 },
        { productId: null, name: "Beta", unitPriceMinor: 50, quantity: 1, lineTotalMinor: 50 },
      ],
    });
  });

  it("throws InsufficientStockError with the short products' names, before any insert", async () => {
    const { txExecute, create, repository } = setup();
    txExecute
      .mockResolvedValueOnce(reservedRow(A, "Alpha") as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ name: "Beta" }] as never);

    const error = await repository.placeOrder(command()).catch((caught: unknown) => caught);
    expect(isOrderConflict(error, "insufficient_stock")).toBe(true);
    expect(error).toMatchObject({ productNames: ["Beta"] });
    expect(txExecute.mock.calls[2]?.[1]).toEqual([B]);
    expect(create).not.toHaveBeenCalled();
  });

  it("re-runs once on a reference collision, then gives up", async () => {
    const { em, txExecute, repository } = setup();
    txExecute.mockResolvedValue(reservedRow(A, "Alpha") as never);
    const transactional = vi.mocked(em.transactional);
    transactional.mockRejectedValueOnce(uniqueViolation("orders_public_reference_unique"));
    expect((await repository.placeOrder(command())).id).toBe("order-1");
    expect(transactional).toHaveBeenCalledTimes(2);

    const collision = uniqueViolation("orders_public_reference_unique");
    transactional.mockRejectedValueOnce(collision).mockRejectedValueOnce(collision);
    await expect(repository.placeOrder(command())).rejects.toBe(collision);
  });

  it("maps a duplicate idempotency key to a conflict and rethrows anything else", async () => {
    const { em, repository } = setup();
    const transactional = vi.mocked(em.transactional);
    transactional.mockRejectedValueOnce(uniqueViolation("orders_idempotency_key_unique"));
    const duplicate = await repository.placeOrder(command()).catch((caught: unknown) => caught);
    expect(hasAppErrorCode(duplicate, "CONFLICT")).toBe(true);
    expect(duplicate).toMatchObject({ message: DUPLICATE_SUBMIT_MESSAGE });

    const other = new Error("connection reset");
    transactional.mockRejectedValueOnce(other);
    await expect(repository.placeOrder(command())).rejects.toBe(other);

    const driver = Object.assign(new Error("insert … values ('ada@example.test')"), {
      name: "DriverException",
    });
    transactional.mockRejectedValueOnce(driver);
    const sanitized = await repository.placeOrder(command()).catch((caught: unknown) => caught);
    expect((sanitized as Error).message).toBe("Order placement failed: DriverException");
  });
});

describe("DatabaseOrderRepository reads and markPaid", () => {
  it("loads an order with its items, or null", async () => {
    const { findOne, find, repository } = setup();
    findOne.mockResolvedValueOnce({ ...orderRow, customer: { id: "c-1" } } as never);
    find.mockResolvedValueOnce([
      {
        product: { id: A },
        productName: "Alpha",
        unitPriceMinor: 50,
        quantity: 2,
        lineTotalMinor: 100,
      },
    ] as never);

    expect(await repository.findByReference("CO-AAAAA-AAAAA-AAAAA-AAAAA")).toMatchObject({
      customerId: "c-1",
      paymentProvider: "demo",
      paymentReference: "DEMO-PAY-order-1",
      paidAt: createdAt,
      items: [{ productId: A, name: "Alpha" }],
    });
    expect(findOne.mock.calls[0]?.[1]).toEqual({ publicReference: "CO-AAAAA-AAAAA-AAAAA-AAAAA" });
    expect(find.mock.calls[0]?.[1]).toEqual({ order: "order-1" });

    findOne.mockResolvedValueOnce(null);
    expect(await repository.findByIdempotencyKey("key-1")).toBeNull();
    expect(findOne.mock.calls[1]?.[1]).toEqual({ idempotencyKey: "key-1" });
  });

  it("marks a pending order paid, or reports what it found", async () => {
    const { execute, repository } = setup();
    const payment = { provider: "demo" as const, reference: "DEMO-PAY-order-1" };

    execute.mockResolvedValueOnce({ affectedRows: 1 } as never);
    expect(await repository.markPaid("order-1", payment)).toBe("paid");
    expect(execute.mock.calls[0]?.[1]).toEqual(["demo", "DEMO-PAY-order-1", "order-1"]);

    execute.mockResolvedValueOnce({ affectedRows: 0 } as never);
    execute.mockResolvedValueOnce([{ paid_at: "2026-10-16 10:05:00+00" }] as never);
    expect(await repository.markPaid("order-1", payment)).toBe("already_paid");

    execute.mockResolvedValueOnce({ affectedRows: 0 } as never);
    execute.mockResolvedValueOnce([{ paid_at: null }] as never);
    expect(await repository.markPaid("order-1", payment)).toBe("not_payable");

    execute.mockResolvedValueOnce({ affectedRows: 0 } as never);
    execute.mockResolvedValueOnce([] as never);
    expect(await repository.markPaid("order-1", payment)).toBe("not_found");
  });
});

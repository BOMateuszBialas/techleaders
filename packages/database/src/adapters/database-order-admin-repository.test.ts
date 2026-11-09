import { afterAll, describe, expect, it, vi } from "vitest";
import type { EntityManager } from "@mikro-orm/postgresql";
import { createUnitTestOrm } from "../testing/unit-orm";
import { DatabaseOrderAdminRepository } from "./database-order-admin-repository";

const orm = createUnitTestOrm();

afterAll(async () => {
  await orm.close();
});

const ORDER_ID = "0d2f1d6e-5b1c-4a55-9e2a-3f1b6c0d9a01";
const P1 = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const P2 = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e02";
const createdAt = new Date("2026-10-16T10:00:00.000Z");
const updatedAt = new Date("2026-10-16T11:00:00.000Z");

const orderRow = {
  id: ORDER_ID,
  publicReference: "CO-AAAAA-AAAAA-AAAAA-AAAAA",
  status: "cancelled",
  currency: "PLN",
  subtotalMinor: 150,
  shippingMinor: 0,
  totalMinor: 150,
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
  updatedAt,
};

const itemRows = [
  {
    id: "item-1",
    product: { id: P1 },
    productName: "Alpha",
    productSku: "DEMO-A",
    unitPriceMinor: 50,
    quantity: 2,
    lineTotalMinor: 100,
  },
  {
    id: "item-2",
    product: null,
    productName: "Deleted",
    productSku: null,
    unitPriceMinor: 50,
    quantity: 1,
    lineTotalMinor: 50,
  },
];

// The stubs return plain rows shaped like the entities; the ORM's generic signatures
// cannot be satisfied by plain objects, so their results are typed loosely on purpose.
function setup() {
  const em = orm.em.fork();
  const tx = orm.em.fork();
  vi.spyOn(em, "transactional").mockImplementation(((
    callback: (em: EntityManager) => Promise<unknown>,
  ) => callback(tx)) as never);
  return {
    em,
    tx,
    execute: vi.spyOn(em, "execute"),
    findAndCount: vi.spyOn(em, "findAndCount"),
    findOne: vi.spyOn(em, "findOne"),
    find: vi.spyOn(em, "find"),
    txExecute: vi.spyOn(tx, "execute"),
    txFindOne: vi.spyOn(tx, "findOne"),
    txFind: vi.spyOn(tx, "find"),
    repository: new DatabaseOrderAdminRepository({ em }),
  };
}

describe("DatabaseOrderAdminRepository.listOrders", () => {
  it("lists a page newest first with the units of each order, in one grouped query", async () => {
    const { findAndCount, execute, repository } = setup();
    findAndCount.mockResolvedValueOnce([
      [
        {
          ...orderRow,
          id: "o-2",
          publicReference: "CO-B",
          status: "paid",
          totalMinor: 900,
          customer: { id: "c-1" },
        },
        { ...orderRow, id: "o-1", publicReference: "DEMO-0001" },
      ],
      27,
    ] as never);
    execute.mockResolvedValueOnce([{ order_id: "o-2", units: 3 }] as never);

    const page = await repository.listOrders({ offset: 25, limit: 25 });

    expect(page).toEqual({
      total: 27,
      rows: [
        {
          id: "o-2",
          reference: "CO-B",
          status: "paid",
          currency: "PLN",
          totalMinor: 900,
          itemCount: 3,
          createdAt,
          placedWithAccount: true,
        },
        {
          id: "o-1",
          reference: "DEMO-0001",
          status: "cancelled",
          currency: "PLN",
          totalMinor: 150,
          itemCount: 0,
          createdAt,
          placedWithAccount: false,
        },
      ],
    });
    expect(findAndCount.mock.calls[0]?.[2]).toEqual({
      orderBy: { createdAt: "desc", id: "desc" },
      limit: 25,
      offset: 25,
    });
    expect(String(execute.mock.calls[0]?.[0])).toContain("in (?, ?) group by order_id");
    expect(execute.mock.calls[0]?.[1]).toEqual(["o-2", "o-1"]);
  });

  it("runs no unit query for an empty page", async () => {
    const { findAndCount, execute, repository } = setup();
    findAndCount.mockResolvedValueOnce([[], 0] as never);
    expect(await repository.listOrders({ offset: 0, limit: 25 })).toEqual({ rows: [], total: 0 });
    expect(execute).not.toHaveBeenCalled();
  });

  it("sanitizes a driver failure", async () => {
    const { findAndCount, repository } = setup();
    findAndCount.mockRejectedValueOnce(
      Object.assign(new Error("select … 'ada@example.test'"), { name: "DriverException" }),
    );
    await expect(repository.listOrders({ offset: 0, limit: 25 })).rejects.toThrow(
      /^Order list failed: DriverException$/,
    );
  });
});

describe("DatabaseOrderAdminRepository.listOrders (unpaid view)", () => {
  it("filters by status and sorts oldest first when asked", async () => {
    const { findAndCount, execute, repository } = setup();
    findAndCount.mockResolvedValueOnce([[], 0] as never);
    await repository.listOrders({
      offset: 0,
      limit: 25,
      status: "pending_payment",
      oldestFirst: true,
    });
    expect(findAndCount.mock.calls[0]?.[1]).toEqual({ status: "pending_payment" });
    expect(findAndCount.mock.calls[0]?.[2]).toEqual({
      orderBy: { createdAt: "asc", id: "asc" },
      limit: 25,
      offset: 0,
    });
    expect(execute).not.toHaveBeenCalled();
  });
});

describe("DatabaseOrderAdminRepository.summarizeUnpaid", () => {
  const staleBefore = new Date("2026-11-08T12:00:00.000Z");

  it("counts the unpaid orders and the stale ones in one query, with the oldest creation time", async () => {
    const { execute, repository } = setup();
    execute.mockResolvedValueOnce([
      { count: 4, stale_count: 2, oldest: "2026-11-07T08:00:00.000Z" },
    ] as never);

    expect(await repository.summarizeUnpaid(staleBefore)).toEqual({
      count: 4,
      staleCount: 2,
      oldestCreatedAt: new Date("2026-11-07T08:00:00.000Z"),
    });
    expect(execute).toHaveBeenCalledTimes(1);
    const sql = String(execute.mock.calls[0]?.[0]);
    expect(sql).toContain("where status = 'pending_payment'");
    expect(sql).toContain("created_at < ?");
    expect(execute.mock.calls[0]?.[1]).toEqual([staleBefore]);
  });

  it("accepts a Date from the driver and reports an empty summary when there are no unpaid orders", async () => {
    const { execute, repository } = setup();
    execute.mockResolvedValueOnce([
      { count: 1, stale_count: 0, oldest: new Date("2026-11-09T09:00:00.000Z") },
    ] as never);
    expect(await repository.summarizeUnpaid(staleBefore)).toMatchObject({
      oldestCreatedAt: new Date("2026-11-09T09:00:00.000Z"),
    });

    execute.mockResolvedValueOnce([{ count: 0, stale_count: 0, oldest: null }] as never);
    expect(await repository.summarizeUnpaid(staleBefore)).toEqual({
      count: 0,
      staleCount: 0,
      oldestCreatedAt: null,
    });

    execute.mockResolvedValueOnce([] as never);
    expect(await repository.summarizeUnpaid(staleBefore)).toEqual({
      count: 0,
      staleCount: 0,
      oldestCreatedAt: null,
    });
  });

  it("sanitizes a driver failure", async () => {
    const { execute, repository } = setup();
    execute.mockRejectedValueOnce(
      Object.assign(new Error("select … ada@example.test"), { name: "DriverException" }),
    );
    await expect(repository.summarizeUnpaid(staleBefore)).rejects.toThrow(
      /^Unpaid order summary failed: DriverException$/,
    );
  });
});

describe("DatabaseOrderAdminRepository.findOrderById", () => {
  it("loads the order with its customer data and item snapshots, fresh from the database", async () => {
    const { findOne, find, repository } = setup();
    findOne.mockResolvedValueOnce(orderRow as never);
    find.mockResolvedValueOnce(itemRows as never);

    expect(await repository.findOrderById(ORDER_ID)).toEqual({
      id: ORDER_ID,
      reference: "CO-AAAAA-AAAAA-AAAAA-AAAAA",
      status: "cancelled",
      currency: "PLN",
      subtotalMinor: 150,
      shippingMinor: 0,
      totalMinor: 150,
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
      updatedAt,
      placedWithAccount: false,
      items: [
        {
          id: "item-1",
          productId: P1,
          name: "Alpha",
          sku: "DEMO-A",
          unitPriceMinor: 50,
          quantity: 2,
          lineTotalMinor: 100,
        },
        {
          id: "item-2",
          productId: null,
          name: "Deleted",
          sku: null,
          unitPriceMinor: 50,
          quantity: 1,
          lineTotalMinor: 50,
        },
      ],
    });
    expect(findOne.mock.calls[0]?.slice(1)).toEqual([{ id: ORDER_ID }, { refresh: true }]);
    expect(find.mock.calls[0]?.[1]).toEqual({ order: ORDER_ID });
  });

  it("keeps optional values that are set", async () => {
    const { findOne, find, repository } = setup();
    findOne.mockResolvedValueOnce({
      ...orderRow,
      status: "paid",
      shippingLine2: "m. 4",
      paymentProvider: "demo",
      paymentReference: `DEMO-PAY-${ORDER_ID}`,
      paidAt: updatedAt,
      customer: { id: "c-1" },
    } as never);
    find.mockResolvedValueOnce([] as never);
    expect(await repository.findOrderById(ORDER_ID)).toMatchObject({
      placedWithAccount: true,
      shippingLine2: "m. 4",
      paymentProvider: "demo",
      paymentReference: `DEMO-PAY-${ORDER_ID}`,
      paidAt: updatedAt,
      items: [],
    });
  });

  it("returns null for an unknown order", async () => {
    const { findOne, find, repository } = setup();
    findOne.mockResolvedValueOnce(null);
    expect(await repository.findOrderById(ORDER_ID)).toBeNull();
    expect(find).not.toHaveBeenCalled();
  });
});

describe("DatabaseOrderAdminRepository.changeStatus", () => {
  it("changes the status conditionally and restocks nothing unless asked", async () => {
    const { txExecute, txFindOne, txFind, repository } = setup();
    txExecute
      .mockResolvedValueOnce({ affectedRows: 1 } as never)
      .mockResolvedValueOnce({ affectedRows: 1 } as never);
    txFindOne.mockResolvedValueOnce({ ...orderRow, status: "shipped", paidAt: createdAt } as never);
    txFind.mockResolvedValueOnce([] as never);

    const result = await repository.changeStatus({
      orderId: ORDER_ID,
      from: "processing",
      to: "shipped",
      restock: false,
      actorId: "u-1",
    });

    expect(result).toMatchObject({
      kind: "changed",
      restockedUnits: 0,
      order: { status: "shipped" },
    });
    expect(txExecute).toHaveBeenCalledTimes(2);
    expect(String(txExecute.mock.calls[0]?.[0])).toContain("where id = ? and status = ?");
    expect(txExecute.mock.calls[0]?.[1]).toEqual(["shipped", ORDER_ID, "processing"]);
    // Audit trail: the status change is recorded with its actor, in the same transaction.
    expect(String(txExecute.mock.calls[1]?.[0])).toContain("insert into order_status_history");
    expect(txExecute.mock.calls[1]?.[1]).toEqual([ORDER_ID, "processing", "shipped", "u-1"]);
  });

  it("restocks every line of a cancelled order in product-id order, skipping a vanished product", async () => {
    const { txExecute, txFindOne, txFind, repository } = setup();
    txExecute
      .mockResolvedValueOnce({ affectedRows: 1 } as never)
      .mockResolvedValueOnce({ affectedRows: 1 } as never)
      .mockResolvedValueOnce([
        { product_id: P1, quantity: 2 },
        { product_id: P2, quantity: 4 },
      ] as never)
      .mockResolvedValueOnce([{ stock_quantity: 10 }] as never)
      .mockResolvedValueOnce({ affectedRows: 1 } as never)
      .mockResolvedValueOnce([] as never);
    txFindOne.mockResolvedValueOnce(orderRow as never);
    txFind.mockResolvedValueOnce(itemRows as never);

    const result = await repository.changeStatus({
      orderId: ORDER_ID,
      from: "pending_payment",
      to: "cancelled",
      restock: true,
      actorId: "u-1",
    });

    expect(result).toMatchObject({ kind: "changed", restockedUnits: 2 });
    expect(String(txExecute.mock.calls[2]?.[0])).toContain(
      "product_id is not null order by product_id",
    );
    // P1: the stock goes 8 → 10, and the movement is recorded as an order cancellation.
    expect(txExecute.mock.calls[3]?.[1]).toEqual([2, P1]);
    expect(String(txExecute.mock.calls[3]?.[0])).toContain("stock_quantity = stock_quantity + ?");
    expect(String(txExecute.mock.calls[4]?.[0])).toContain("insert into stock_adjustments");
    expect(String(txExecute.mock.calls[4]?.[0])).toContain("'order_cancellation'");
    expect(txExecute.mock.calls[4]?.[1]).toEqual([P1, 8, 10, ORDER_ID]);
    // P2 was deleted meanwhile: its update matches nothing, so no movement is written for it.
    expect(txExecute.mock.calls[5]?.[1]).toEqual([4, P2]);
    expect(txExecute).toHaveBeenCalledTimes(6);
  });

  it("reports a stale status or a missing order without writing", async () => {
    const { txExecute, repository } = setup();
    const command = {
      orderId: ORDER_ID,
      from: "pending_payment",
      to: "cancelled",
      restock: true,
      actorId: "u-1",
    } as const;

    txExecute
      .mockResolvedValueOnce({ affectedRows: 0 } as never)
      .mockResolvedValueOnce([{ status: "paid" }] as never);
    expect(await repository.changeStatus(command)).toEqual({
      kind: "stale",
      currentStatus: "paid",
    });

    txExecute
      .mockResolvedValueOnce({ affectedRows: 0 } as never)
      .mockResolvedValueOnce([] as never);
    expect(await repository.changeStatus(command)).toEqual({ kind: "not_found" });
    expect(txExecute).toHaveBeenCalledTimes(4);
  });

  it("fails loudly if the changed order cannot be read back, and sanitizes driver errors", async () => {
    const { txExecute, txFindOne, em, repository } = setup();
    const command = {
      orderId: ORDER_ID,
      from: "paid",
      to: "processing",
      restock: false,
      actorId: "u-1",
    } as const;
    txExecute
      .mockResolvedValueOnce({ affectedRows: 1 } as never)
      .mockResolvedValueOnce({ affectedRows: 1 } as never);
    txFindOne.mockResolvedValueOnce(null);
    await expect(repository.changeStatus(command)).rejects.toThrow(
      "A changed order could not be read back",
    );

    vi.mocked(em.transactional).mockRejectedValueOnce(
      Object.assign(new Error("update … 'ada@example.test'"), { name: "DriverException" }),
    );
    await expect(repository.changeStatus(command)).rejects.toThrow(
      /^Order status change failed: DriverException$/,
    );
  });
});

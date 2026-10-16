import { afterAll, describe, expect, it, vi } from "vitest";
import { hasAppErrorCode } from "@commerceos/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { createUnitTestOrm } from "../testing/unit-orm";
import { DatabaseStockRepository } from "./database-stock-repository";

const orm = createUnitTestOrm();

afterAll(async () => {
  await orm.close();
});

const PRODUCT_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";
const createdAt = new Date("2026-10-16T09:30:00.000Z");
const command = { productId: PRODUCT_ID, expectedQuantity: 8, newQuantity: 0 };

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
    execute: vi.spyOn(tx, "execute"),
    create: vi.spyOn(tx, "create"),
    flush: vi.spyOn(tx, "flush").mockResolvedValue(undefined),
    find: vi.spyOn(em, "find"),
    repository: new DatabaseStockRepository({ em }),
  };
}

describe("DatabaseStockRepository.setStock", () => {
  it("updates the product conditionally and records the change in the same transaction", async () => {
    const { execute, create, flush, repository } = setup();
    execute.mockResolvedValue({ affectedRows: 1 } as never);
    create.mockReturnValue({
      id: "adj-1",
      product: { id: PRODUCT_ID },
      previousQuantity: 8,
      newQuantity: 0,
      createdAt,
    } as never);

    expect(await repository.setStock(command)).toEqual({
      kind: "updated",
      adjustment: {
        id: "adj-1",
        productId: PRODUCT_ID,
        previousQuantity: 8,
        newQuantity: 0,
        createdAt,
      },
    });
    expect(execute).toHaveBeenCalledWith(
      "update products set stock_quantity = ?, updated_at = now() where id = ? and stock_quantity = ?",
      [0, PRODUCT_ID, 8],
      "run",
    );
    expect(create.mock.calls[0]?.[1]).toEqual({
      product: PRODUCT_ID,
      previousQuantity: 8,
      newQuantity: 0,
    });
    expect(flush).toHaveBeenCalledOnce();
  });

  it("reports the current quantity when the expected one no longer matches", async () => {
    const { execute, create, repository } = setup();
    execute
      .mockResolvedValueOnce({ affectedRows: 0 } as never)
      .mockResolvedValueOnce([{ stock_quantity: 5 }] as never);

    expect(await repository.setStock(command)).toEqual({ kind: "stale", currentQuantity: 5 });
    expect(execute.mock.calls[1]?.[0]).toBe("select stock_quantity from products where id = ?");
    expect(create).not.toHaveBeenCalled();
  });

  it("reports a missing product", async () => {
    const { execute, repository } = setup();
    execute.mockResolvedValueOnce({ affectedRows: 0 } as never).mockResolvedValueOnce([] as never);

    expect(await repository.setStock(command)).toEqual({ kind: "not_found" });
  });

  it("maps a stock check violation to a field error", async () => {
    const { execute, repository } = setup();
    execute.mockRejectedValue(
      Object.assign(new Error("check"), {
        code: "23514",
        constraint: "products_stock_quantity_check",
      }),
    );

    const error = await repository.setStock(command).catch((caught: unknown) => caught);
    expect(hasAppErrorCode(error, "VALIDATION_FAILED")).toBe(true);
    expect(error).toMatchObject({ fieldErrors: { newQuantity: [expect.any(String)] } });
  });

  it("rethrows any other failure unchanged", async () => {
    const { execute, repository } = setup();
    const failure = new Error("connection refused");
    execute.mockRejectedValue(failure);

    await expect(repository.setStock(command)).rejects.toBe(failure);
  });
});

describe("DatabaseStockRepository.listAdjustments", () => {
  it("lists a product's changes newest first, up to the limit, as plain records", async () => {
    const { find, repository } = setup();
    find.mockResolvedValue([
      { id: "adj-2", product: { id: PRODUCT_ID }, previousQuantity: 0, newQuantity: 4, createdAt },
    ] as never);

    expect(await repository.listAdjustments(PRODUCT_ID, 20)).toEqual([
      { id: "adj-2", productId: PRODUCT_ID, previousQuantity: 0, newQuantity: 4, createdAt },
    ]);
    expect(find.mock.calls[0]?.[1]).toEqual({ product: PRODUCT_ID });
    expect(find.mock.calls[0]?.[2]).toEqual({
      orderBy: { createdAt: "desc", id: "desc" },
      limit: 20,
    });
  });
});

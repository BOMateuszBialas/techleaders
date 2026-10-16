import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  hasAppErrorCode,
  isNotFoundError,
  isStaleStockError,
  StaleStockError,
} from "../../errors/app-error";
import type { StockRepositoryPort } from "../../ports/inventory.port";
import { INVALID_FIELDS_MESSAGE } from "../../validators/parse-input";
import { STOCK_QUANTITY_MESSAGE } from "../../validators/inventory/stock-quantity.schema";
import {
  InMemoryProductRepository,
  MISSING_PRODUCT_ID,
  TITAN_ID,
  VORTEX,
  VORTEX_ID,
} from "../products/in-memory-product-repository.fixture";
import { AdjustStockUseCase } from "./adjust-stock.use-case";
import { InMemoryStockRepository } from "./in-memory-stock-repository.fixture";
import { ListStockAdjustmentsUseCase } from "./list-stock-adjustments.use-case";
import { STOCK_HISTORY_LIMIT } from "./stock-adjustment.dto";

let productRepository: InMemoryProductRepository;
let stockRepository: InMemoryStockRepository;

beforeEach(() => {
  productRepository = new InMemoryProductRepository();
  stockRepository = new InMemoryStockRepository(productRepository);
});

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("expected a rejection");
    },
    (error: unknown) => error,
  );
}

const adjust = () => new AdjustStockUseCase({ stockRepository, productRepository });

describe("AdjustStockUseCase", () => {
  it("sets the new quantity, records the change and returns the new availability", async () => {
    // Vortex is published with 8 in stock.
    const result = await adjust().execute({
      productId: VORTEX_ID,
      expectedQuantity: "8",
      newQuantity: " 0 ",
    });

    expect(result.outcome).toBe("updated");
    expect(result.product).toMatchObject({ id: VORTEX_ID, stockQuantity: 0 });
    expect(result.product.availability).toBe("out_of_stock");
    expect(result.adjustment).toEqual({
      id: expect.any(String),
      productId: VORTEX_ID,
      previousQuantity: 8,
      newQuantity: 0,
      delta: -8,
      createdAt: new Date("2026-10-16T09:30:00.000Z"),
    });
    expect(stockRepository.adjustments).toHaveLength(1);
  });

  it("accepts numbers as well as form text", async () => {
    const result = await adjust().execute({
      productId: TITAN_ID,
      expectedQuantity: 0,
      newQuantity: 12,
    });
    // Titan is a draft: more stock does not make it visible.
    expect(result.product.availability).toBe("hidden");
    expect(result.adjustment?.delta).toBe(12);
  });

  it("answers an unchanged quantity without writing or recording anything", async () => {
    const setStock = vi.spyOn(stockRepository, "setStock");
    const result = await adjust().execute({
      productId: VORTEX_ID,
      expectedQuantity: "8",
      newQuantity: "8",
    });

    expect(result).toEqual({
      outcome: "unchanged",
      product: { ...VORTEX, availability: "available" },
      adjustment: null,
    });
    expect(setStock).not.toHaveBeenCalled();
    expect(stockRepository.adjustments).toEqual([]);
  });

  it("refuses an unchanged quantity that no longer matches the stored one as stale", async () => {
    const error = await rejection(
      adjust().execute({ productId: VORTEX_ID, expectedQuantity: "5", newQuantity: "5" }),
    );
    expect(isStaleStockError(error) && error.currentQuantity).toBe(8);
  });

  it("refuses a stale expected quantity with the current one, and writes nothing", async () => {
    const error = await rejection(
      adjust().execute({ productId: VORTEX_ID, expectedQuantity: "10", newQuantity: "0" }),
    );

    expect(error).toBeInstanceOf(StaleStockError);
    expect(isStaleStockError(error) && error.currentQuantity).toBe(8);
    expect(error instanceof Error && error.message).toBe(
      "Stock changed to 8 since this page loaded. Check it and try again.",
    );
    expect(productRepository.products.get(VORTEX_ID)?.stockQuantity).toBe(8);
    expect(stockRepository.adjustments).toEqual([]);
  });

  it.each(["-1", "1.5", "abc", "", "1e3", "1000001"])(
    "rejects the new quantity %j before the port is called",
    async (newQuantity) => {
      const setStock = vi.spyOn(stockRepository, "setStock");
      const error = await rejection(
        adjust().execute({ productId: VORTEX_ID, expectedQuantity: "8", newQuantity }),
      );

      expect(hasAppErrorCode(error, "VALIDATION_FAILED")).toBe(true);
      expect(error instanceof Error && error.message).toBe(INVALID_FIELDS_MESSAGE);
      expect(error).toMatchObject({ fieldErrors: { newQuantity: [STOCK_QUANTITY_MESSAGE] } });
      expect(setStock).not.toHaveBeenCalled();
    },
  );

  it("rejects a non-integer number too", async () => {
    const error = await rejection(
      adjust().execute({ productId: VORTEX_ID, expectedQuantity: 8, newQuantity: 2.5 }),
    );
    expect(error).toMatchObject({ fieldErrors: { newQuantity: [STOCK_QUANTITY_MESSAGE] } });
  });

  it.each([
    ["a malformed id", "not-a-uuid", "3"],
    ["an unknown id", MISSING_PRODUCT_ID, "3"],
    ["an unknown id with an unchanged quantity", MISSING_PRODUCT_ID, "8"],
  ])("treats %s as not found", async (_label, productId, newQuantity) => {
    const error = await rejection(
      adjust().execute({ productId, expectedQuantity: "8", newQuantity }),
    );
    expect(isNotFoundError(error)).toBe(true);
  });

  it("treats a product deleted right after the update as not found", async () => {
    vi.spyOn(productRepository, "findById").mockResolvedValue(null);
    const error = await rejection(
      adjust().execute({ productId: VORTEX_ID, expectedQuantity: "8", newQuantity: "3" }),
    );
    expect(isNotFoundError(error)).toBe(true);
  });
});

describe("ListStockAdjustmentsUseCase", () => {
  const list = () => new ListStockAdjustmentsUseCase({ stockRepository });

  it("lists a product's changes newest first, with their deltas", async () => {
    await adjust().execute({ productId: VORTEX_ID, expectedQuantity: "8", newQuantity: "3" });
    await adjust().execute({ productId: VORTEX_ID, expectedQuantity: "3", newQuantity: "10" });
    await adjust().execute({ productId: TITAN_ID, expectedQuantity: "0", newQuantity: "1" });

    const history = await list().execute({ productId: VORTEX_ID });
    expect(
      history.map(({ previousQuantity, newQuantity, delta }) => [
        previousQuantity,
        newQuantity,
        delta,
      ]),
    ).toEqual([
      [3, 10, 7],
      [8, 3, -5],
    ]);
  });

  it(`asks the port for at most ${STOCK_HISTORY_LIMIT} changes`, async () => {
    const port: StockRepositoryPort = {
      setStock: vi.fn(),
      listAdjustments: vi.fn(async () => []),
    };
    expect(
      await new ListStockAdjustmentsUseCase({ stockRepository: port }).execute({
        productId: VORTEX_ID,
      }),
    ).toEqual([]);
    expect(port.listAdjustments).toHaveBeenCalledWith(VORTEX_ID, 20);
  });

  it("treats a malformed id as not found", async () => {
    expect(isNotFoundError(await rejection(list().execute({ productId: "x" })))).toBe(true);
  });
});

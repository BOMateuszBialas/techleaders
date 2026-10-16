import { describe, expect, it } from "vitest";
import { setStockSchema } from "./set-stock.schema";
import {
  MAX_STOCK_QUANTITY,
  STOCK_QUANTITY_MESSAGE,
  stockQuantitySchema,
} from "./stock-quantity.schema";

describe("stockQuantitySchema", () => {
  it.each([
    ["0", 0],
    [" 8 ", 8],
    ["1000000", MAX_STOCK_QUANTITY],
    [0, 0],
    [42, 42],
  ])("accepts %j", (value, expected) => {
    expect(stockQuantitySchema.parse(value)).toBe(expected);
  });

  it.each(["", "-1", "1.5", "1,5", "1e3", "abc", "1000001", "99999999", -1, 1.5, 1_000_001, null])(
    "refuses %j with one message",
    (value) => {
      const result = stockQuantitySchema.safeParse(value);
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.message)).toEqual([STOCK_QUANTITY_MESSAGE]);
    },
  );
});

describe("setStockSchema", () => {
  it("parses the posted form values", () => {
    expect(
      setStockSchema.parse({ productId: " p-1 ", expectedQuantity: "8", newQuantity: "0" }),
    ).toEqual({ productId: "p-1", expectedQuantity: 8, newQuantity: 0 });
  });

  it("reports each invalid quantity under its field", () => {
    const result = setStockSchema.safeParse({
      productId: "p-1",
      expectedQuantity: "x",
      newQuantity: "-1",
    });
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ["expectedQuantity"],
      ["newQuantity"],
    ]);
  });
});

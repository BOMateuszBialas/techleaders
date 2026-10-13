import { describe, expect, it } from "vitest";
import { isLowStock, isPurchasable } from "./product";

describe("product rules", () => {
  it("is purchasable only when published and in stock", () => {
    expect(isPurchasable({ status: "published", stockQuantity: 1 })).toBe(true);
    expect(isPurchasable({ status: "published", stockQuantity: 0 })).toBe(false);
    expect(isPurchasable({ status: "draft", stockQuantity: 10 })).toBe(false);
  });

  it("flags low stock only for published products at or below the threshold", () => {
    expect(isLowStock({ status: "published", stockQuantity: 5 }, 5)).toBe(true);
    expect(isLowStock({ status: "published", stockQuantity: 6 }, 5)).toBe(false);
    expect(isLowStock({ status: "draft", stockQuantity: 0 }, 5)).toBe(false);
  });
});

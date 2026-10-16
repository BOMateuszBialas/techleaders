import { describe, expect, it } from "vitest";
import { describeStoreAvailability, getStoreAvailability, normalizeSku } from "./product";

describe("store availability (admin)", () => {
  it.each([
    [{ status: "draft", stockQuantity: 5 }, "hidden", "Hidden: shoppers cannot see or buy it."],
    [{ status: "draft", stockQuantity: 0 }, "hidden", "Hidden: shoppers cannot see or buy it."],
    [
      { status: "published", stockQuantity: 0 },
      "out_of_stock",
      "Visible in the store, shown as out of stock.",
    ],
    [
      { status: "published", stockQuantity: 3 },
      "available",
      "Visible in the store and can be bought.",
    ],
  ] as const)("%j is %s", (product, state, sentence) => {
    expect(getStoreAvailability(product)).toBe(state);
    expect(describeStoreAvailability(state)).toBe(sentence);
  });
});

describe("normalizeSku", () => {
  it("trims and upper-cases a SKU, and treats a blank one as none", () => {
    expect(normalizeSku("  demo-mou-001 ")).toBe("DEMO-MOU-001");
    expect(normalizeSku("DEMO-KEY-002")).toBe("DEMO-KEY-002");
    expect(normalizeSku("   ")).toBeNull();
    expect(normalizeSku("")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { firstQueryValue } from "./first-query-value";

describe("firstQueryValue", () => {
  it("reads the first value of a query parameter", () => {
    expect(firstQueryValue("4")).toBe("4");
    expect(firstQueryValue(["5", "6"])).toBe("5");
    expect(firstQueryValue(undefined)).toBeUndefined();
  });
});

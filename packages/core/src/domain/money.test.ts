import { describe, expect, it } from "vitest";
import { InvalidMoneyError, addMoney, formatMoney, money, multiplyMoney, sumMoney } from "./money";

describe("money", () => {
  it("rejects non-integer minor amounts", () => {
    expect(() => money(10.5, "PLN")).toThrow(InvalidMoneyError);
  });

  it("adds amounts in the same currency", () => {
    expect(addMoney(money(1999, "PLN"), money(1, "PLN"))).toEqual(money(2000, "PLN"));
  });

  it("refuses to add different currencies", () => {
    expect(() => addMoney(money(100, "PLN"), money(100, "EUR"))).toThrow(InvalidMoneyError);
  });

  it("multiplies by a non-negative integer quantity only", () => {
    expect(multiplyMoney(money(1250, "PLN"), 3)).toEqual(money(3750, "PLN"));
    expect(() => multiplyMoney(money(1250, "PLN"), -1)).toThrow(InvalidMoneyError);
    expect(() => multiplyMoney(money(1250, "PLN"), 1.5)).toThrow(InvalidMoneyError);
  });

  it("sums an empty list to zero", () => {
    expect(sumMoney([], "PLN")).toEqual(money(0, "PLN"));
  });

  it("formats minor units for display", () => {
    expect(formatMoney(money(123456, "PLN"))).toMatch(/1\s?234,56\s?zł/);
  });
});

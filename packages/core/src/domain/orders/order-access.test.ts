import { describe, expect, it } from "vitest";
import { GUEST_ORDER_VIEWER, canViewOrder, orderPrincipal } from "./order-access";

const A = "c0000000-0000-4000-8000-00000000000a";
const B = "c0000000-0000-4000-8000-00000000000b";

describe("canViewOrder (E07 A2)", () => {
  it("lets any viewer read a guest order", () => {
    expect(canViewOrder({ customerId: null }, GUEST_ORDER_VIEWER)).toBe(true);
    expect(canViewOrder({ customerId: null }, { customerId: A })).toBe(true);
  });

  it("lets only the owning customer read an account order", () => {
    expect(canViewOrder({ customerId: A }, { customerId: A })).toBe(true);
    expect(canViewOrder({ customerId: A }, { customerId: B })).toBe(false);
    expect(canViewOrder({ customerId: A }, GUEST_ORDER_VIEWER)).toBe(false);
  });
});

describe("orderPrincipal (E07 A15)", () => {
  it("names a guest and a customer differently", () => {
    expect(orderPrincipal(null)).toBe("guest");
    expect(orderPrincipal(A)).toBe(`customer:${A}`);
  });
});

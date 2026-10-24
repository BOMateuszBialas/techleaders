import { describe, expect, it } from "vitest";
import { isAdminRole } from "../auth/admin";
import { CUSTOMER_ROLES, isCustomerRole } from "./customer-role";

describe("isCustomerRole", () => {
  it("accepts only the customer role", () => {
    expect(isCustomerRole("customer")).toBe(true);
    expect(isCustomerRole("owner")).toBe(false);
    expect(isCustomerRole(undefined)).toBe(false);
  });

  it("shares no role with the admin roles", () => {
    expect(CUSTOMER_ROLES.some((role) => isAdminRole(role))).toBe(false);
  });
});

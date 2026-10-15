import { describe, expect, it } from "vitest";
import { isAdminRole } from "./admin";

describe("isAdminRole", () => {
  it("accepts only the known admin roles", () => {
    expect(isAdminRole("owner")).toBe(true);
    expect(isAdminRole("staff")).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
});

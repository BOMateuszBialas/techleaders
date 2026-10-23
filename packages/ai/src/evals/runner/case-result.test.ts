import { describe, expect, it } from "vitest";
import { check, quoted, statusOf } from "./case-result";

describe("case results", () => {
  it("keeps a detail only on a failed property", () => {
    expect(check("contract", true, "why")).toEqual({ property: "contract", passed: true });
    expect(check("contract", false, "why")).toEqual({
      property: "contract",
      passed: false,
      detail: "why",
    });
    expect(check("contract", false)).toEqual({ property: "contract", passed: false });
  });

  it("fails on any failed property, else is unavailable when the provider was", () => {
    const ok = check("a", true);
    const bad = check("b", false);
    expect(statusOf([ok, bad], true)).toBe("failed");
    expect(statusOf([ok], true)).toBe("unavailable");
    expect(statusOf([ok], false)).toBe("passed");
  });

  it("quotes text as JSON", () => {
    expect(quoted('say "hi"')).toBe('"say \\"hi\\""');
  });
});

import { describe, expect, it } from "vitest";
import { SIGN_IN_ERRORS, signInErrorMessage } from "./sign-in-errors";

describe("signInErrorMessage", () => {
  it("maps each known code to its fixed message", () => {
    expect(signInErrorMessage("invalid")).toBe(SIGN_IN_ERRORS.invalid);
    expect(signInErrorMessage("rate_limited")).toBe(SIGN_IN_ERRORS.rate_limited);
    expect(signInErrorMessage("unavailable")).toBe(SIGN_IN_ERRORS.unavailable);
  });

  it("ignores missing, repeated and unknown values, including inherited keys", () => {
    expect(signInErrorMessage(undefined)).toBeNull();
    expect(signInErrorMessage(["invalid", "invalid"])).toBeNull();
    expect(signInErrorMessage("<script>")).toBeNull();
    expect(signInErrorMessage("toString")).toBeNull();
  });

  it("never reveals whether the account exists", () => {
    expect(SIGN_IN_ERRORS.invalid).toBe("Invalid email or password.");
  });
});

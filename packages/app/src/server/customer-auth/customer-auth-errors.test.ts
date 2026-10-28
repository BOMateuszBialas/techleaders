import { describe, expect, it } from "vitest";
import { SIGN_IN_ERRORS } from "../auth/sign-in-errors";
import {
  CUSTOMER_SIGN_UP_ERRORS,
  customerAuthPageHref,
  customerReturnPath,
  customerSignInErrorMessage,
  customerSignUpErrorMessage,
  isCheckoutReturn,
} from "./customer-auth-errors";

describe("customer auth error messages", () => {
  it("maps only the fixed sign-in codes to the owner's texts", () => {
    expect(customerSignInErrorMessage("invalid")).toBe(SIGN_IN_ERRORS.invalid);
    expect(customerSignInErrorMessage("rate_limited")).toBe(SIGN_IN_ERRORS.rate_limited);
    // P10 changes only the owner's wording; the customer page keeps its own unavailable text.
    expect(customerSignInErrorMessage("unavailable")).toBe("Sign-in is unavailable. Try again.");
    expect(customerSignInErrorMessage("unavailable")).not.toBe(SIGN_IN_ERRORS.unavailable);
    expect(customerSignInErrorMessage("refused")).toBeNull();
    expect(customerSignInErrorMessage("<script>")).toBeNull();
    expect(customerSignInErrorMessage("toString")).toBeNull();
    expect(customerSignInErrorMessage(["invalid"])).toBeNull();
    expect(customerSignInErrorMessage(undefined)).toBeNull();
  });

  it("gives every sign-up refusal one generic message that names no cause (A9)", () => {
    expect(customerSignUpErrorMessage("refused")).toBe(
      "We could not create an account with these details. If you already have an account, sign in.",
    );
    expect(customerSignUpErrorMessage("rate_limited")).toBe(
      "Too many attempts. Try again in a minute.",
    );
    expect(customerSignUpErrorMessage("unavailable")).toBe("Sign-in is unavailable. Try again.");
    expect(customerSignUpErrorMessage("invalid")).toBeNull();
    expect(customerSignUpErrorMessage("__proto__")).toBeNull();
    expect(Object.values(CUSTOMER_SIGN_UP_ERRORS).join(" ")).not.toMatch(
      /exists|taken|already registered/i,
    );
  });
});

describe("customer return paths (A17)", () => {
  it("returns to checkout only for the fixed code, otherwise to My orders", () => {
    expect(isCheckoutReturn("checkout")).toBe(true);
    expect(customerReturnPath("checkout")).toBe("/checkout");
    for (const from of [
      null,
      undefined,
      "",
      "https://evil.example",
      "/admin",
      ["checkout"],
      "Checkout",
    ]) {
      expect(isCheckoutReturn(from)).toBe(false);
      expect(customerReturnPath(from)).toBe("/account/orders");
    }
  });

  it("builds the auth page link with an error and only the fixed from code", () => {
    expect(customerAuthPageHref("/account/sign-in")).toBe("/account/sign-in");
    expect(customerAuthPageHref("/account/sign-in", { error: "invalid" })).toBe(
      "/account/sign-in?error=invalid",
    );
    expect(customerAuthPageHref("/account/sign-up", { error: "refused", from: "checkout" })).toBe(
      "/account/sign-up?error=refused&from=checkout",
    );
    expect(customerAuthPageHref("/account/sign-up", { from: "https://evil.example" })).toBe(
      "/account/sign-up",
    );
    expect(customerAuthPageHref("/account/sign-in", { from: "checkout" })).toBe(
      "/account/sign-in?from=checkout",
    );
  });
});

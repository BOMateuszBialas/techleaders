import { describe, expect, it } from "vitest";
import { IDLE_ACTION_STATE } from "@/lib/action-state";
import {
  CHECKOUT_ACCOUNT_SWITCHED,
  CHECKOUT_SESSION_LOST,
  checkoutModeFor,
  parseCheckoutAs,
  shownCheckoutMode,
} from "./checkout-mode";

describe("checkout modes (E07 A24)", () => {
  it("renders account mode only for a confirmed customer session", () => {
    expect(checkoutModeFor({ status: "customer", customerId: "c-a", email: "a@x.test" })).toEqual({
      kind: "account",
      customerId: "c-a",
      email: "a@x.test",
    });
    expect(checkoutModeFor({ status: "none" })).toEqual({ kind: "guest", sessionError: false });
    expect(checkoutModeFor({ status: "error" })).toEqual({ kind: "guest", sessionError: true });
  });

  it("shows guest mode with the banner after a lost session, whatever the page read", () => {
    const account = { kind: "account", customerId: "c-a", email: "a@x.test" } as const;
    expect(shownCheckoutMode(account, IDLE_ACTION_STATE)).toBe(account);
    expect(shownCheckoutMode(account, { status: "error", message: "Sold out." })).toBe(account);
    expect(shownCheckoutMode(account, { status: "error", code: CHECKOUT_SESSION_LOST })).toEqual({
      kind: "guest",
      sessionError: true,
    });
  });

  it("shows the switched-to account after an account switch (E07 issue 105)", () => {
    const page = { kind: "account", customerId: "c-a", email: "a@x.test" } as const;
    expect(
      shownCheckoutMode(page, {
        status: "error",
        code: CHECKOUT_ACCOUNT_SWITCHED,
        account: { id: "c-b", email: "b@x.test" },
      }),
    ).toEqual({ kind: "account", customerId: "c-b", email: "b@x.test" });
    // A switch state without its account keeps the page's mode rather than inventing one.
    expect(shownCheckoutMode(page, { status: "error", code: CHECKOUT_ACCOUNT_SWITCHED })).toBe(
      page,
    );
  });

  it("accepts only account and guest", () => {
    expect(parseCheckoutAs("account")).toBe("account");
    expect(parseCheckoutAs("guest")).toBe("guest");
    for (const value of ["", "Account", "owner", undefined]) {
      expect(parseCheckoutAs(value)).toBeNull();
    }
  });
});

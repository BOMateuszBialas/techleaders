import { describe, expect, it } from "vitest";
import { decideCheckoutAccount } from "./checkout-account";

const A = "c0000000-0000-4000-8000-00000000000a";
const B = "c0000000-0000-4000-8000-00000000000b";
const sessionA = { status: "customer", customerId: A, email: "a@x.test" } as const;
const sessionB = { status: "customer", customerId: B, email: "b@x.test" } as const;

describe("decideCheckoutAccount (E07 issue 105)", () => {
  it("places the order for the same account the form was rendered for", () => {
    expect(decideCheckoutAccount({ kind: "account", customerId: A }, sessionA)).toEqual({
      outcome: "account",
      customerId: A,
    });
  });

  it("stops and reports the new account when the session is a different account", () => {
    expect(decideCheckoutAccount({ kind: "account", customerId: A }, sessionB)).toEqual({
      outcome: "switched",
      account: { id: B, email: "b@x.test" },
    });
  });

  it("stops an account form whose session is gone, as a lost session", () => {
    expect(decideCheckoutAccount({ kind: "account", customerId: A }, { status: "none" })).toEqual({
      outcome: "session_lost",
    });
    expect(decideCheckoutAccount({ kind: "account", customerId: A }, { status: "error" })).toEqual({
      outcome: "session_lost",
    });
  });

  it("keeps a guest form a guest order, even when a customer session exists now", () => {
    expect(decideCheckoutAccount({ kind: "guest" }, { status: "none" })).toEqual({
      outcome: "guest",
    });
    expect(decideCheckoutAccount({ kind: "guest" }, sessionA)).toEqual({ outcome: "guest" });
    expect(decideCheckoutAccount({ kind: "guest" }, { status: "error" })).toEqual({
      outcome: "guest",
    });
  });

  it("treats an account form without the id it was rendered for as stale, whatever the session", () => {
    expect(decideCheckoutAccount({ kind: "account", customerId: null }, sessionA)).toEqual({
      outcome: "stale",
    });
    expect(
      decideCheckoutAccount({ kind: "account", customerId: null }, { status: "none" }),
    ).toEqual({ outcome: "stale" });
  });
});

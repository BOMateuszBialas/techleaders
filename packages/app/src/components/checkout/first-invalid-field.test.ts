import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActionState } from "@/lib/action-state";
import {
  checkoutFieldId,
  firstInvalidFieldId,
  focusFirstInvalidEffect,
} from "./first-invalid-field";

const NAMES = ["customerName", "customerEmail", "shippingLine1", "shippingCity"] as const;

describe("firstInvalidFieldId", () => {
  it("returns the first field in the form's order that has a message", () => {
    expect(
      firstInvalidFieldId(NAMES, {
        shippingCity: ["Enter a city."],
        customerEmail: ["Enter a valid email address."],
      }),
    ).toBe("checkout-customerEmail");
  });

  it("returns null without field errors", () => {
    expect(firstInvalidFieldId(NAMES, undefined)).toBeNull();
    expect(firstInvalidFieldId(NAMES, {})).toBeNull();
  });

  it("ignores names that are not form fields and empty message lists", () => {
    expect(
      firstInvalidFieldId(NAMES, {
        idempotencyKey: ["not a field"],
        customerName: [],
        shippingCity: ["Enter a city."],
      }),
    ).toBe("checkout-shippingCity");
  });

  it("builds the input id the view renders", () => {
    expect(checkoutFieldId("customerName")).toBe("checkout-customerName");
  });
});

describe("focusFirstInvalidEffect", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubDocument(elements: Record<string, { focus: () => void }>) {
    const getElementById = vi.fn((id: string) => elements[id] ?? null);
    vi.stubGlobal("document", { getElementById });
    return getElementById;
  }

  it("focuses the first invalid field after a failed submit", () => {
    const focus = vi.fn();
    const getElementById = stubDocument({ "checkout-customerName": { focus } });
    const state: ActionState = {
      status: "error",
      fieldErrors: { customerName: ["Enter your full name."] },
    };
    focusFirstInvalidEffect(state, NAMES)();
    expect(getElementById).toHaveBeenCalledWith("checkout-customerName");
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("leaves the focus alone without field errors (a conflict or a server error)", () => {
    const getElementById = stubDocument({});
    focusFirstInvalidEffect({ status: "error", message: "Sold out." }, NAMES)();
    focusFirstInvalidEffect({ status: "idle" }, NAMES)();
    expect(getElementById).not.toHaveBeenCalled();
  });

  it("does nothing when the invalid field is not rendered", () => {
    const getElementById = stubDocument({});
    focusFirstInvalidEffect(
      { status: "error", fieldErrors: { shippingCity: ["Enter a city."] } },
      NAMES,
    )();
    expect(getElementById).toHaveBeenCalledWith("checkout-shippingCity");
  });
});

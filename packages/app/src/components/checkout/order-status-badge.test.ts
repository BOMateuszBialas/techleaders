import { ORDER_STATUSES } from "@commerceos/core";
import { describe, expect, it } from "vitest";
import { orderStatusBadgeVariant } from "./order-status-badge";

describe("orderStatusBadgeVariant (checkout spec C7, OA-4)", () => {
  it("maps each status to its approved variant", () => {
    expect(orderStatusBadgeVariant("pending_payment")).toBe("warning");
    expect(orderStatusBadgeVariant("paid")).toBe("success");
    expect(orderStatusBadgeVariant("processing")).toBe("secondary");
    expect(orderStatusBadgeVariant("shipped")).toBe("outline");
    expect(orderStatusBadgeVariant("cancelled")).toBe("destructive");
    expect(orderStatusBadgeVariant("refunded")).toBe("outline");
  });

  it("gives every order status a variant (the Record is exhaustive)", () => {
    for (const status of ORDER_STATUSES) {
      expect(orderStatusBadgeVariant(status)).toEqual(expect.any(String));
    }
    expect(ORDER_STATUSES).toHaveLength(6);
  });

  it("keeps paid and processing apart (audit: they shared a variant)", () => {
    expect(orderStatusBadgeVariant("paid")).not.toBe(orderStatusBadgeVariant("processing"));
  });
});

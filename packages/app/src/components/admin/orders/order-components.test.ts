import type {
  AdminOrderTransition,
  AdminOrderView,
  ChangeOrderStatusResult,
} from "@commerceos/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { IDLE_ACTION_STATE, type ActionState } from "@/lib/action-state";
import { DemoBadge, OrderStatusBadge } from "./order-badges";
import {
  confirmationLabel,
  formatOrderDateTime,
  itemsLabel,
  needsConfirmation,
  orderPath,
  ordersPageHref,
  pageLabel,
  statusChangedMessage,
  transitionButtonLabel,
} from "./order-copy";
import { OrderStatusForm } from "./order-status-form";
import { OrderStatusFormView, type OrderStatusPanelOrder } from "./order-status-form-view";

const ORDER_ID = "0d2f1d6e-5b1c-4a55-9e2a-3f1b6c0d9a01";
const action = vi.fn();

const cancel: AdminOrderTransition = {
  to: "cancelled",
  toLabel: "Cancelled",
  restocks: true,
  isRecordOnly: false,
};
const refund: AdminOrderTransition = {
  to: "refunded",
  toLabel: "Refunded",
  restocks: false,
  isRecordOnly: true,
};
const processing: AdminOrderTransition = {
  to: "processing",
  toLabel: "Processing",
  restocks: false,
  isRecordOnly: false,
};
const shipped: AdminOrderTransition = { ...processing, to: "shipped", toLabel: "Shipped" };

const pending: OrderStatusPanelOrder = {
  id: ORDER_ID,
  status: "pending_payment",
  restockableUnits: 3,
  allowedTransitions: [cancel],
};
const paid: OrderStatusPanelOrder = {
  id: ORDER_ID,
  status: "paid",
  restockableUnits: 3,
  allowedTransitions: [processing, refund],
};

function render(
  order: OrderStatusPanelOrder,
  state: ActionState = IDLE_ACTION_STATE,
  pendingState = false,
) {
  return renderToStaticMarkup(
    createElement(OrderStatusFormView, { action, state, pending: pendingState, order }),
  );
}

describe("order copy", () => {
  it("builds the admin order URLs", () => {
    expect(orderPath(ORDER_ID)).toBe(`/admin/orders/${ORDER_ID}`);
    expect(ordersPageHref(1)).toBe("/admin/orders");
    expect(ordersPageHref(3)).toBe("/admin/orders?page=3");
    expect(pageLabel(2, 5)).toBe("Page 2 of 5");
  });

  it("counts items in words", () => {
    expect(itemsLabel(1)).toBe("1 item");
    expect(itemsLabel(0)).toBe("0 items");
    expect(itemsLabel(4)).toBe("4 items");
  });

  it("names the button of each transition", () => {
    expect([processing, shipped, cancel, refund].map(transitionButtonLabel)).toEqual([
      "Mark as processing",
      "Mark as shipped",
      "Cancel order",
      "Mark as refunded (record only)",
    ]);
    // A status without its own wording falls back to its label.
    expect(transitionButtonLabel({ ...processing, to: "paid", toLabel: "Paid" })).toBe(
      "Mark as paid",
    );
  });

  it("asks for a confirmation only for a cancel or a refund", () => {
    expect(needsConfirmation(cancel)).toBe(true);
    expect(needsConfirmation(refund)).toBe(true);
    expect(needsConfirmation(processing)).toBe(false);
    expect(confirmationLabel(cancel, 1)).toBe(
      "Cancel this unpaid order and return 1 item to stock",
    );
    expect(confirmationLabel(refund, 3)).toBe(
      "Record this order as refunded. No money is moved; refunds are not processed in this demo store.",
    );
    expect(confirmationLabel(shipped, 3)).toBeNull();
  });

  it("describes the effect of each change", () => {
    const changed = (to: ChangeOrderStatusResult["to"], statusLabel: string, units = 0) =>
      statusChangedMessage({
        order: { statusLabel } as AdminOrderView,
        from: "paid",
        to,
        restockedUnits: units,
      });
    expect(changed("processing", "Processing")).toBe("Order marked as processing.");
    expect(changed("shipped", "Shipped")).toBe("Order marked as shipped.");
    expect(changed("cancelled", "Cancelled", 1)).toBe(
      "Order cancelled. Stock was returned for 1 item.",
    );
    expect(changed("refunded", "Refunded")).toBe(
      "Order marked as refunded. This is a record only; no money was moved.",
    );
  });

  it("formats times in the store's time zone", () => {
    // 22:30 UTC is already the next day in Warsaw (UTC+2 in October).
    expect(formatOrderDateTime(new Date("2026-10-16T22:30:00.000Z"), "en-GB")).toBe(
      "17 Oct 2026, 00:30",
    );
  });
});

describe("order badges", () => {
  it("shows the status as text and marks demo orders", () => {
    expect(
      renderToStaticMarkup(createElement(OrderStatusBadge, { status: "pending_payment" })),
    ).toContain("Awaiting payment");
    expect(
      renderToStaticMarkup(createElement(OrderStatusBadge, { status: "cancelled" })),
    ).toContain("Cancelled");
    expect(renderToStaticMarkup(createElement(DemoBadge))).toContain("Demo");
  });
});

describe("OrderStatusFormView", () => {
  it("offers a pending order only the cancel, behind a required confirmation", () => {
    const html = render(pending);
    expect(html).toContain("Change status");
    expect(html).toContain("Payment is set only by the payment flow");
    expect(html.match(/<form/g)).toHaveLength(1);
    expect(html).toContain('name="orderId" value="0d2f1d6e-5b1c-4a55-9e2a-3f1b6c0d9a01"');
    expect(html).toContain('name="from" value="pending_payment"');
    expect(html).toContain('name="to" value="cancelled"');
    expect(html).toMatch(
      /<input id="confirm-cancelled" type="checkbox" required=""[^>]*name="confirm" value="yes"/,
    );
    expect(html).toContain('for="confirm-cancelled"');
    expect(html).toContain("Cancel this unpaid order and return 3 items to stock");
    expect(html).toContain("Cancel order");
    expect(html).not.toContain("Mark as");
    expect(html).not.toContain(' disabled=""');
  });

  it("offers a paid order processing and a record-only refund, one form each", () => {
    const html = render(paid);
    expect(html.match(/<form/g)).toHaveLength(2);
    expect(html).toContain("Mark as processing");
    expect(html).toContain("Mark as refunded (record only)");
    expect(html).toContain("Record this order as refunded. No money is moved");
    // Only the refund needs the tick.
    expect(html.match(/type="checkbox"/g)).toHaveLength(1);
    expect(html).not.toContain("Cancel order");
  });

  it.each(["cancelled", "refunded"] as const)("shows no action for a %s order", (status) => {
    const html = render({ ...pending, status, allowedTransitions: [] });
    expect(html).toContain("No further status changes.");
    expect(html).not.toContain("<form");
  });

  it("disables every button while a change is pending, keeping the labels", () => {
    const html = render(paid, IDLE_ACTION_STATE, true);
    expect(html.match(/ disabled=""/g)).toHaveLength(2);
    expect(html).toContain("Mark as processing");
  });

  it("shows the result as a status message, and an error as an alert", () => {
    expect(render(paid, { status: "success", message: "Order marked as processing." })).toMatch(
      /role="status"[^>]*>Order marked as processing\./,
    );
    expect(
      render(pending, {
        status: "error",
        message: "This order changed to Paid in the meantime. Review it and try again.",
      }),
    ).toMatch(/role="alert"[^>]*>This order changed to Paid/);
  });
});

describe("OrderStatusForm", () => {
  it("renders the view in its idle state", () => {
    const serverAction = vi.fn(async (state: ActionState) => state);
    const html = renderToStaticMarkup(
      createElement(OrderStatusForm, { action: serverAction, order: pending }),
    );
    expect(html).toContain("Cancel order");
    expect(html).not.toContain('role="status"');
  });
});

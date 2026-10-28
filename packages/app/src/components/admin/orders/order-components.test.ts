import {
  ORDER_STATUS_LABELS,
  type AdminOrderTransition,
  type AdminOrderView,
  type ChangeOrderStatusResult,
} from "@commerceos/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Badge } from "@/components/ui/badge";
import { IDLE_ACTION_STATE, type ActionState } from "@/lib/action-state";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { DemoBadge, OrderOriginBadge, OrderStatusBadge } from "./order-badges";
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
import {
  OrderStatusDialogBody,
  OrderStatusFormView,
  type OrderStatusPanelOrder,
} from "./order-status-form-view";

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
  it.each([
    ["pending_payment", "warning"],
    ["paid", "success"],
    ["processing", "secondary"],
    ["shipped", "outline"],
    ["cancelled", "destructive"],
    ["refunded", "outline"],
  ] as const)("renders %s with the %s variant (D5) and its text", (status, variant) => {
    // The shipped text class is the only extra class; no border override (P21).
    const extra = status === "shipped" ? "text-foreground" : undefined;
    const html = renderToStaticMarkup(createElement(OrderStatusBadge, { status }));
    // The same markup as a `Badge` of that variant: no class is added or overridden (P21).
    expect(html).toBe(
      renderToStaticMarkup(
        createElement(Badge, { variant, className: extra }, ORDER_STATUS_LABELS[status]),
      ),
    );
    expect(html).toContain(ORDER_STATUS_LABELS[status]);
  });

  it("marks demo orders with the demo variant, text unchanged (D8)", () => {
    const html = renderToStaticMarkup(createElement(DemoBadge));
    expect(html).toBe(renderToStaticMarkup(createElement(Badge, { variant: "demo" }, "Demo")));
    expect(html).toContain("Demo");
  });

  it("says whether an account or a guest placed the order (E07 A18)", () => {
    expect(
      renderToStaticMarkup(createElement(OrderOriginBadge, { placedWithAccount: true })),
    ).toContain("Account order");
    expect(
      renderToStaticMarkup(createElement(OrderOriginBadge, { placedWithAccount: false })),
    ).toContain("Guest order");
  });
});

describe("OrderStatusFormView", () => {
  it("offers a pending order only the cancel, as a closed dialog trigger", () => {
    const html = render(pending);
    expect(html).toContain("Change status");
    expect(html).toContain("Payment is set only by the payment flow");
    // The dialog content mounts only while open: no form and no confirmation copy yet.
    expect(html).not.toContain("<form");
    expect(html).not.toContain("Cancel this order?");
    expect(html).toMatch(/<button[^>]*>Cancel order…<\/button>/);
    expect(html).not.toMatch(/<button[^>]*type="submit"[^>]*>Cancel order…/);
    expect(html).not.toContain("Mark as");
    expect(html).not.toContain(' disabled=""');
  });

  it("offers a paid order processing as a form, and a record-only refund as a dialog", () => {
    const html = render(paid);
    expect(html.match(/<form/g)).toHaveLength(1);
    expect(html).toContain('name="from" value="paid"');
    expect(html).toContain('name="to" value="processing"');
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Mark as processing<\/button>/);
    expect(html).toMatch(/<button[^>]*>Record refund…<\/button>/);
    expect(html).not.toContain('name="to" value="refunded"');
    expect(html).not.toContain("Cancel order");
  });

  it("offers a processing order shipping as a form, and the refund as a dialog", () => {
    const html = render({
      ...paid,
      status: "processing",
      allowedTransitions: [shipped, refund],
    });
    expect(html.match(/<form/g)).toHaveLength(1);
    expect(html).toContain("Mark as shipped");
    expect(html).toContain("Record refund…");
  });

  it("offers a shipped order only the refund dialog", () => {
    const html = render({ ...paid, status: "shipped", allowedTransitions: [refund] });
    expect(html).not.toContain("<form");
    expect(html).toContain("Record refund…");
    expect(html).not.toContain("Mark as");
  });

  it.each(["cancelled", "refunded"] as const)("shows no action for a %s order", (status) => {
    const html = render({ ...pending, status, allowedTransitions: [] });
    expect(html).toContain("No further status changes.");
    expect(html).not.toContain("<form");
  });

  it("disables the forward button while a change is pending, keeping the labels", () => {
    const html = render(paid, IDLE_ACTION_STATE, true);
    expect(html.match(/ disabled=""/g)).toHaveLength(1);
    expect(html).toContain("Mark as processing");
    expect(html).toContain("Record refund…");
  });

  it("shows the result as a success status and an error as an alert, outside the dialogs", () => {
    const success = render(paid, { status: "success", message: "Order marked as processing." });
    expect(success).toContain('role="status"');
    expect(success).toContain("Order marked as processing.");
    expect(success).not.toContain('role="alert"');

    const error = render(pending, {
      status: "error",
      message: "This order changed to Paid in the meantime. Review it and try again.",
    });
    expect(error).toContain('role="alert"');
    expect(error).toContain("This order changed to Paid in the meantime.");
    expect(error).not.toContain('role="status"');
  });

  it("shows no result before the first submit", () => {
    const html = render(paid);
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('role="alert"');
  });
});

describe("OrderStatusDialogBody (open confirmation)", () => {
  function renderDialog(
    order: OrderStatusPanelOrder,
    transition: AdminOrderTransition,
    pendingState = false,
  ) {
    return renderToStaticMarkup(
      createElement(
        AlertDialog,
        { open: true },
        createElement(OrderStatusDialogBody, { action, pending: pendingState, order, transition }),
      ),
    );
  }

  it("shows a failed result inside the open dialog, where the overlay does not hide it", () => {
    const html = renderToStaticMarkup(
      createElement(
        AlertDialog,
        { open: true },
        createElement(OrderStatusDialogBody, {
          action,
          pending: false,
          order: pending,
          transition: cancel,
          state: { status: "error", message: "This order can no longer be cancelled." },
        }),
      ),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("This order can no longer be cancelled.");
  });

  it("names the cancel, explains the restock and posts the hidden fields with confirm", () => {
    const html = renderDialog(pending, cancel);
    expect(html).toContain("Cancel this order?");
    expect(html).toContain("Cancel this unpaid order and return 3 items to stock");
    expect(html).toMatch(/<button[^>]*>Keep order<\/button>/);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Cancel order<\/button>/);
    expect(html).toContain(`name="orderId" value="${ORDER_ID}"`);
    expect(html).toContain('name="from" value="pending_payment"');
    expect(html).toContain('name="to" value="cancelled"');
    expect(html).toContain('name="confirm" value="yes"');
    expect(html).not.toContain('type="checkbox"');
    expect(html).not.toContain(' disabled=""');
  });

  it("names the refund as a record only and disables its action while pending", () => {
    const html = renderDialog(paid, refund, true);
    expect(html).toContain("Record this order as refunded?");
    expect(html).toContain("No money is moved");
    expect(html).toMatch(/<button[^>]*>Keep order<\/button>/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Record refund<\/button>/);
    expect(html).toContain('name="to" value="refunded"');
    expect(html).toContain('name="confirm" value="yes"');
  });
});

describe("OrderStatusForm", () => {
  it("renders the view in its idle state", () => {
    const serverAction = vi.fn(async (state: ActionState) => state);
    const html = renderToStaticMarkup(
      createElement(OrderStatusForm, { action: serverAction, order: pending }),
    );
    expect(html).toContain("Cancel order…");
    expect(html).not.toContain('role="status"');
  });
});

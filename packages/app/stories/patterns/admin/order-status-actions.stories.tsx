import type { AdminOrderTransition } from "@commerceos/core";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen } from "storybook/test";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { IDLE_ACTION_STATE, type ActionState } from "@/lib/action-state";
import {
  OrderStatusDialogBody,
  OrderStatusFormView,
  type OrderStatusPanelOrder,
} from "@/components/admin/orders/order-status-form-view";

/**
 * Patterns / Admin / Order status actions. Real view (`OrderStatusFormView`) with fixed orders:
 * no server action, no database. A forward transition is a plain form; a cancel or a refund is
 * an `AlertDialog`. The open-dialog stories render the dialog body in an open root, because the
 * trigger's own state is internal to the view. The popup renders in a portal, so play functions
 * query `screen`.
 */

const ORDER_ID = "0d2f1d6e-5b1c-4a55-9e2a-3f1b6c0d9a01";

const CANCEL: AdminOrderTransition = {
  to: "cancelled",
  toLabel: "Cancelled",
  restocks: true,
  isRecordOnly: false,
};
const REFUND: AdminOrderTransition = {
  to: "refunded",
  toLabel: "Refunded",
  restocks: false,
  isRecordOnly: true,
};
const PROCESSING: AdminOrderTransition = {
  to: "processing",
  toLabel: "Processing",
  restocks: false,
  isRecordOnly: false,
};

const PAID: OrderStatusPanelOrder = {
  id: ORDER_ID,
  status: "paid",
  restockableUnits: 3,
  allowedTransitions: [PROCESSING, REFUND],
};
const PENDING: OrderStatusPanelOrder = {
  id: ORDER_ID,
  status: "pending_payment",
  restockableUnits: 3,
  allowedTransitions: [CANCEL],
};

const RESULT_ERROR: ActionState = {
  status: "error",
  message: "This order changed since you opened it. Review the new status.",
};

const meta = {
  title: "Patterns/Admin/Order status actions",
  component: OrderStatusFormView,
  parameters: { layout: "padded", a11y: { test: "error" } },
  decorators: [
    (Story) => (
      <div data-density="admin" className="max-w-4xl p-4 md:p-6">
        <Story />
      </div>
    ),
  ],
  args: { action: () => undefined, state: IDLE_ACTION_STATE, pending: false, order: PAID },
} satisfies Meta<typeof OrderStatusFormView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A paid order: "Processing" is a plain button; "Record refund…" is a destructive trigger. */
export const Forward: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Record refund…" })).toBeVisible();
    await expect(canvas.queryByRole("alertdialog")).toBeNull();
  },
};

/** A pending order: cancelling restocks its items, so the dialog says how many units return. */
export const CancelDialogOpen: StoryObj = {
  render: () => (
    <div data-density="admin" className="max-w-4xl p-4 md:p-6">
      <AlertDialog open>
        <AlertDialogContent>
          <OrderStatusDialogBody
            action={() => undefined}
            pending={false}
            order={PENDING}
            transition={CANCEL}
            state={IDLE_ACTION_STATE}
          />
        </AlertDialogContent>
      </AlertDialog>
    </div>
  ),
  play: async () => {
    const dialog = await screen.findByRole("alertdialog", { name: "Cancel this order?" });
    await expect(dialog).toBeVisible();
    await expect(screen.getByRole("button", { name: "Keep order" })).toBeVisible();
    await expect(screen.getByRole("button", { name: "Cancel order" })).toBeVisible();
  },
};

/** A paid order: the refund is recorded only; no money moves and no stock returns. */
export const RefundDialogOpen: StoryObj = {
  render: () => (
    <div data-density="admin" className="max-w-4xl p-4 md:p-6">
      <AlertDialog open>
        <AlertDialogContent>
          <OrderStatusDialogBody
            action={() => undefined}
            pending={false}
            order={PAID}
            transition={REFUND}
            state={RESULT_ERROR}
          />
        </AlertDialogContent>
      </AlertDialog>
    </div>
  ),
  play: async () => {
    await expect(
      await screen.findByRole("alertdialog", { name: "Record this order as refunded?" }),
    ).toBeVisible();
    await expect(screen.getByRole("alert")).toHaveTextContent(
      "This order changed since you opened it.",
    );
    await expect(screen.getByRole("button", { name: "Keep order" })).toBeVisible();
  },
};

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { money, ORDER_STATUSES, type OrderStatus, type OrderView } from "@commerceos/core";
import { expect, fn, within } from "storybook/test";
import { OrderDetails } from "@/components/checkout/order-details";
import {
  OrderStatusBadge,
  PayFormView,
  PaymentTestNote,
} from "@/components/checkout/order-forms-view";
import { OrderSummary } from "@/components/checkout/order-summary";
import { IDLE_ACTION_STATE, type ActionState } from "@/lib/action-state";
import OrderNotFound from "@/app/(storefront)/orders/[reference]/not-found";

/**
 * Storefront / Payment (retrofit Phase 3). The payment step (one note, the summary, one purchase
 * button), the order page after the test payment and while pending, every order status as a
 * badge, and the order not-found page. The submit is a `fn()` mock; the server action runs only
 * in the app.
 */

const REFERENCE = "CO-0DT7M-1EV8N-2FW9P-3GXAQ";

const order: OrderView = {
  reference: REFERENCE,
  status: "pending_payment",
  createdAt: new Date("2026-10-16T10:00:00.000Z"),
  paidAt: null,
  items: [
    {
      name: "Vortex Wireless Mouse",
      unitPrice: money(24900, "PLN"),
      quantity: 2,
      lineTotal: money(49800, "PLN"),
    },
  ],
  subtotal: money(49800, "PLN"),
  shipping: money(0, "PLN"),
  total: money(49800, "PLN"),
  paymentProvider: null,
};

const paid: OrderView = {
  ...order,
  status: "paid",
  paidAt: new Date("2026-10-16T10:05:00.000Z"),
  paymentProvider: "demo",
};

const meta = {
  title: "Storefront/Payment",
  component: PayFormView,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
  args: {
    action: fn(),
    state: IDLE_ACTION_STATE,
    pending: false,
    reference: REFERENCE,
  },
} satisfies Meta<typeof PayFormView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The payment step: the note, the order summary and one purchase button; no card field. */
export const PaymentStep: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <PaymentTestNote />
      <OrderSummary
        items={order.items}
        subtotal={order.subtotal}
        shipping={order.shipping}
        total={order.total}
      />
      <PayFormView {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Test payment. No money is taken.")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Confirm test payment" }).className).toContain(
      "bg-action",
    );
    await expect(canvas.queryByRole("textbox")).toBeNull();
  },
};

/** While the test payment is confirmed: the button keeps its colour and stays disabled. */
export const Pending: Story = {
  args: { pending: true },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Confirming…" });
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(button).toBeDisabled();
    await expect(button.className).toContain("bg-action");
  },
};

/** A server error after the button: the message in a destructive alert with role alert. */
export const ServerError: Story = {
  args: {
    state: {
      status: "error",
      message: "Too many lookups. Try again in a minute.",
    } satisfies ActionState,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("Too many lookups.");
  },
};

/** The order page right after the test payment: the thank-you heading and the paid status. */
export const OrderPaid: StoryObj<typeof OrderDetails> = {
  render: () => <OrderDetails order={paid} justPaid />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Thank you — test payment received",
    );
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Paid with: test payment (no money taken)",
    );
  },
};

/** A pending order: the status is text, and the link goes back to the payment step. */
export const OrderPending: StoryObj<typeof OrderDetails> = {
  render: () => <OrderDetails order={order} justPaid={false} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Awaiting payment")).toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "Complete test payment" })).toHaveAttribute(
      "href",
      `/checkout/pay/${REFERENCE}`,
    );
    await expect(canvas.queryByRole("status")).toBeNull();
  },
};

/** Every order status: a text label and its approved badge variant (never colour alone). */
export const StatusBadges: StoryObj = {
  render: () => (
    <ul className="flex flex-wrap gap-3">
      {ORDER_STATUSES.map((status: OrderStatus) => (
        <li key={status}>
          <OrderStatusBadge status={status} />
        </li>
      ))}
    </ul>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Awaiting payment")).toBeInTheDocument();
    await expect(canvas.getByText("Paid")).toBeInTheDocument();
    await expect(canvas.getAllByRole("listitem")).toHaveLength(ORDER_STATUSES.length);
  },
};

/** A malformed, unknown or foreign reference: the same empty state with one page heading. */
export const OrderNotFoundPage: StoryObj = {
  render: () => <OrderNotFound />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    await expect(canvas.getByRole("link", { name: "Look up an order" })).toHaveAttribute(
      "href",
      "/orders/lookup",
    );
  },
};

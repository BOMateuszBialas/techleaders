import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { money } from "@commerceos/core";
import { expect, fn, waitFor, within } from "storybook/test";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { CheckoutFormView } from "@/components/checkout/checkout-form-view";
import {
  CheckoutPageSkeleton,
  CheckoutPageUnavailable,
} from "@/components/checkout/checkout-page-states";
import { OrderSummary } from "@/components/checkout/order-summary";
import { CHECKOUT_SESSION_LOST, type CheckoutMode } from "@/components/checkout/checkout-mode";
import { IDLE_ACTION_STATE, type ActionState } from "@/lib/action-state";

/**
 * Storefront / Checkout (retrofit Phase 2). The checkout form in each state (guest, field errors,
 * a server error, a conflict, the session lost, pending), the order summary as a card, and the
 * loading and unavailable states. The submit is a `fn()` mock; the server action runs only in the
 * app. The focus story runs the real `CheckoutForm` wrapper.
 */

const KEY = "0b7e6a9c-1d2f-4a3b-8c4d-5e6f7a8b9c0d";
const GUEST: CheckoutMode = { kind: "guest", sessionError: false };
const ACCOUNT: CheckoutMode = { kind: "account", email: "ada@shop.example" };

const baseArgs = {
  idempotencyKey: KEY,
  cartFingerprint: "a:1",
  expectedTotalMinor: 49800,
  mode: GUEST,
  pending: false,
  state: IDLE_ACTION_STATE,
};

const meta = {
  title: "Storefront/Checkout",
  component: CheckoutFormView,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
  args: { ...baseArgs, action: fn() },
} satisfies Meta<typeof CheckoutFormView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A guest's first view: every field empty, "Place order" in the purchase colour. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Place order" }).className).toContain(
      "bg-action",
    );
    await expect(canvas.getByLabelText(/Address line 2/)).toBeInTheDocument();
    await expect(canvas.getByText("(optional)")).toBeInTheDocument();
  },
};

/** After an empty or invalid submit: each message under its field, and the typed values kept. */
export const FieldErrors: Story = {
  args: {
    state: {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: {
        customerEmail: ["Enter a valid email address."],
        shippingPostalCode: ["Enter a postal code like 00-950."],
      },
      values: { customerName: "Ada Lovelace", customerEmail: "not-an-email" },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("Check the highlighted fields.");
    await expect(canvas.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByText("Enter a valid email address.")).toBeInTheDocument();
    await expect(canvas.getByLabelText("Full name")).toHaveValue("Ada Lovelace");
  },
};

/** A conflict (stock or price changed): the alert and the link back to the cart, no field error. */
export const Conflict: Story = {
  args: { state: { status: "error", message: "Sorry, Vortex Wireless Mouse just sold out." } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("just sold out");
    await expect(canvas.getByRole("link", { name: "Review your cart" })).toHaveAttribute(
      "href",
      "/cart",
    );
  },
};

/** The sign-in could not be confirmed on submit: one banner, no conflict link, the values kept. */
export const SessionLost: Story = {
  args: {
    mode: ACCOUNT,
    state: {
      status: "error",
      code: CHECKOUT_SESSION_LOST,
      message: "We could not confirm your sign-in, so you are checking out as a guest.",
      values: { customerName: "Ada Lovelace" },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("alert")).toHaveLength(1);
    await expect(canvas.getByText("Buying as a guest.")).toBeInTheDocument();
    await expect(canvas.queryByRole("link", { name: "Review your cart" })).toBeNull();
  },
};

/** Pending: the label changes and the button stays in the purchase colour, disabled. */
export const Pending: Story = {
  args: { pending: true },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Placing order…" });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(button.className).toContain("bg-action");
  },
};

const failingSubmit = fn(async (): Promise<ActionState> => ({
  status: "error",
  fieldErrors: { customerName: ["Enter your name."] },
}));

/**
 * The real wrapper: a submit with an empty name moves the focus to the name field (retrofit
 * Phase 2, A11). The unit tests cover the logic; this checks it in a browser.
 */
export const FocusAfterSubmit: StoryObj<typeof CheckoutForm> = {
  render: () => (
    <CheckoutForm
      action={failingSubmit}
      idempotencyKey={KEY}
      cartFingerprint="a:1"
      expectedTotalMinor={49800}
      mode={GUEST}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Place order" }));
    // The result arrives asynchronously from useActionState, and the focus moves after it.
    await waitFor(() => expect(canvas.getByLabelText("Full name")).toHaveFocus());
    await waitFor(() => expect(failingSubmit).toHaveBeenCalled());
  },
};

const items = [
  {
    name: "Vortex Wireless Mouse",
    unitPrice: money(24900, "PLN"),
    quantity: 2,
    lineTotal: money(49800, "PLN"),
  },
];

/** The order summary as a card: items, subtotal, free shipping and the total. */
export const Summary: StoryObj<typeof OrderSummary> = {
  render: () => (
    <div className="max-w-sm">
      <OrderSummary
        items={items}
        subtotal={money(49800, "PLN")}
        shipping={money(0, "PLN")}
        total={money(49800, "PLN")}
      />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(
      within(canvas.getByRole("region", { name: "Order summary" })).getByTestId("order-total"),
    ).toHaveTextContent("498,00");
  },
};

/** The page while the checkout loads: one status group with input-sized blocks. */
export const Loading: StoryObj<typeof CheckoutPageSkeleton> = {
  render: () => <CheckoutPageSkeleton />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Loading checkout");
  },
};

/** The checkout cannot be read: an error state with a retry link (no JavaScript needed). */
export const Unavailable: StoryObj<typeof CheckoutPageUnavailable> = {
  render: () => <CheckoutPageUnavailable />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("Checkout unavailable");
    await expect(canvas.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/checkout",
    );
  },
};

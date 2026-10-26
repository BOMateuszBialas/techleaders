import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { priceCart, money, type PricedCartLine } from "@commerceos/core";
import { expect, fn, within } from "storybook/test";
import { CartChanges } from "@/components/cart/cart-changes";
import { CartLineView } from "@/components/cart/cart-line-view";
import { CartPageSkeleton, CartPageUnavailable } from "@/components/cart/cart-page-states";
import { CartSummary } from "@/components/cart/cart-summary";
import { IDLE_ACTION_STATE } from "@/lib/action-state";

/**
 * Storefront / Cart (retrofit Phase 1). The cart page's content with its states: the lines and
 * subtotal, the empty state, the cart-changed block, the loading and unreadable states. The
 * actions are `fn()` mocks; the server actions run only in the app.
 */

const VORTEX_ID = "7a2d3b63-7e1f-4b9c-8b62-4a4b2c2c3e01";

const vortex = {
  id: VORTEX_ID,
  slug: "vortex-wireless-mouse",
  name: "Vortex Wireless Mouse",
  priceMinor: 24900,
  currency: "PLN" as const,
  stockQuantity: 3,
  status: "published" as const,
  imageUrl: null,
};

const cartOneLine = priceCart([{ productId: VORTEX_ID, quantity: 2 }], [vortex]);
// Five in the cookie but three in stock: the server corrects it and the checkout waits.
const cartChanged = priceCart([{ productId: VORTEX_ID, quantity: 5 }], [vortex]);

const actions = {
  updateAction: fn(async () => IDLE_ACTION_STATE),
  removeAction: fn(async () => IDLE_ACTION_STATE),
  acceptAction: fn(async () => {}),
};

const meta = {
  title: "Storefront/Cart",
  component: CartSummary,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
  args: { cart: cartOneLine, ...actions },
} satisfies Meta<typeof CartSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One line: the action colour on Checkout only; Update outline; Remove a link. */
export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByTestId("cart-subtotal")).toHaveTextContent("498,00");
    const checkout = canvas.getByRole("link", { name: "Checkout" });
    await expect(checkout.className).toContain("bg-action");
    await expect(canvas.getByRole("button", { name: "Update" }).className).toContain(
      "border-input",
    );
    await expect(
      canvas.getByRole("button", { name: "Remove Vortex Wireless Mouse" }).className,
    ).toContain("text-link");
    await userEvent.click(canvas.getByRole("button", { name: "Remove Vortex Wireless Mouse" }));
    await expect(actions.removeAction).toHaveBeenCalled();
  },
};

/** An empty cart: an empty state with an outline link, no checkout. */
export const Empty: Story = {
  args: { cart: priceCart([], []) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Your cart is empty.")).toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "Browse all products" }).className).toContain(
      "border-input",
    );
    await expect(canvas.queryByRole("link", { name: "Checkout" })).toBeNull();
  },
};

/** The stored cart needs correcting: a warning status block, and the checkout is closed. */
export const Changed: Story = {
  args: { cart: cartChanged },
  play: async ({ canvas }) => {
    const status = canvas.getByRole("status");
    await expect(within(status).getByRole("heading", { level: 2 })).toHaveTextContent(
      "Your cart changed",
    );
    await expect(status.getAttribute("data-variant")).toBe("warning");
    await expect(canvas.getByRole("button", { name: "Update my cart" })).toBeInTheDocument();
    await expect(canvas.queryByRole("link", { name: "Checkout" })).toBeNull();
  },
};

/** The cart-changed block on its own, as the drawer shows it. */
export const ChangesBlock: Story = {
  render: () => (
    <CartChanges
      notices={["Only 3 left of Vortex Wireless Mouse; we updated the quantity."]}
      acceptAction={actions.acceptAction}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Your cart changed");
  },
};

/** The cart could not be read: an error state with a retry link (no JavaScript needed). */
export const Unavailable: Story = {
  render: () => <CartPageUnavailable />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("Cart unavailable");
    await expect(canvas.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/cart");
  },
};

/** The page while the cart loads: one status group, two rows the size of a line. */
export const Loading: Story = {
  render: () => <CartPageSkeleton />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Loading cart");
  },
};

const line: PricedCartLine = {
  productId: VORTEX_ID,
  slug: "vortex-wireless-mouse",
  name: "Vortex Wireless Mouse",
  imageUrl: null,
  unitPrice: money(24900, "PLN"),
  quantity: 2,
  lineTotal: money(49800, "PLN"),
};

/** One cart line on its own: the price is never in the action colour. */
export const Line: StoryObj<typeof CartLineView> = {
  render: () => (
    <ul className="max-w-xl">
      <CartLineView
        line={line}
        update={{ action: actions.updateAction, state: IDLE_ACTION_STATE, pending: false }}
        remove={{ action: actions.removeAction, state: IDLE_ACTION_STATE, pending: false }}
      />
    </ul>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("line-total")).toHaveTextContent("498,00");
    await expect(canvas.getByTestId("line-total").className).not.toContain("bg-action");
  },
};

/** A quantity refused above the stock: the error sits under the input, once. */
export const LineRefused: StoryObj<typeof CartLineView> = {
  render: () => (
    <ul className="max-w-xl">
      <CartLineView
        line={line}
        update={{
          action: actions.updateAction,
          pending: false,
          state: {
            status: "error",
            message: "Only 3 left in stock.",
            fieldErrors: { quantity: ["Only 3 left in stock."] },
            values: { productId: VORTEX_ID, quantity: "4" },
          },
        }}
        remove={{ action: actions.removeAction, state: IDLE_ACTION_STATE, pending: false }}
      />
    </ul>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("spinbutton")).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getAllByText("Only 3 left in stock.")).toHaveLength(1);
  },
};

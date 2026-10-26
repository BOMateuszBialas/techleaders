import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, waitFor } from "storybook/test";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

/**
 * Primitives / Drawer. Real component from `@/components/ui/drawer` (Base UI `Dialog`, modal, on
 * the right side). The storefront uses it for the cart (storefront v2, Phase 2). The examples show
 * the cart's anatomy with fixed lines. The popup renders in a portal, so play functions query
 * `screen`.
 */
const meta = {
  title: "Primitives/Drawer",
  component: Drawer,
  argTypes: {
    defaultOpen: { control: "boolean", description: "Open on first render (uncontrolled)." },
    open: { control: "boolean", description: "Controlled open state, with `onOpenChange`." },
  },
  render: (args) => <CartDrawerExample {...args} />,
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

const LINES = [
  { name: "Vortex Wireless Mouse", price: "249,00 zł", quantity: 2 },
  { name: "Pulse Ultralight Mouse", price: "189,00 zł", quantity: 1 },
];

function CartDrawerExample({
  showCloseButton = true,
  lines = LINES,
  ...props
}: React.ComponentProps<typeof Drawer> & { showCloseButton?: boolean; lines?: typeof LINES }) {
  return (
    <Drawer {...props}>
      <DrawerTrigger render={<Button variant="outline" />}>Open cart</DrawerTrigger>
      <DrawerContent showCloseButton={showCloseButton}>
        <DrawerHeader>
          <DrawerTitle>Your cart ({lines.length})</DrawerTitle>
          <DrawerDescription>Prices are confirmed at checkout.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <ul aria-label="Cart items" className="flex flex-col divide-y">
            {lines.map((line) => (
              <li key={line.name} className="flex flex-col gap-2 py-3">
                <span className="font-medium">{line.name}</span>
                <span className="text-sm text-muted-foreground">
                  {line.price} × {line.quantity}
                </span>
              </li>
            ))}
          </ul>
        </DrawerBody>
        <DrawerFooter>
          <Button variant="action" size="lg">
            Checkout
          </Button>
          <DrawerClose render={<Button variant="outline" />}>Keep shopping</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

async function closed() {
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

export const Playground: Story = {};

/**
 * Opening moves focus into the drawer (to the X, the first control); the page under it cannot
 * scroll; Escape closes it and focus returns to the trigger.
 */
export const FocusAndEscape: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Open cart" });
    await userEvent.click(trigger);
    const drawer = await screen.findByRole("dialog", { name: "Your cart (2)" });
    await expect(drawer).toBeVisible();
    await waitFor(() => expect(screen.getByRole("button", { name: "Close" })).toHaveFocus());
    const locked = [document.documentElement, document.body].some(
      (element) => getComputedStyle(element).overflow === "hidden",
    );
    await expect(locked).toBe(true);
    await userEvent.keyboard("{Escape}");
    await closed();
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/** Tab and Shift+Tab stay inside the open drawer; the page behind it is inert. */
export const FocusStaysInside: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open cart" }));
    const drawer = await screen.findByRole("dialog", { name: "Your cart (2)" });
    for (let index = 0; index < 8; index += 1) {
      await userEvent.tab();
      // Base UI moves focus back in after its focus guards; wait for the settled focus.
      await waitFor(() => expect(drawer.contains(document.activeElement)).toBe(true));
    }
    await userEvent.keyboard("{Escape}");
    await closed();
  },
};

/** A click on the backdrop closes the drawer; so do the X and "Keep shopping". */
export const BackdropXAndKeepShopping: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Open cart" });
    await userEvent.click(trigger);
    await screen.findByRole("dialog");
    const backdrop = document.querySelector("[data-slot=drawer-overlay]");
    if (backdrop) await userEvent.click(backdrop);
    await closed();

    await userEvent.click(trigger);
    await screen.findByRole("dialog");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await closed();

    await userEvent.click(trigger);
    await screen.findByRole("dialog");
    await userEvent.click(screen.getByRole("button", { name: "Keep shopping" }));
    await closed();
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/** Without the X the footer's "Keep shopping" and Escape still close it. */
export const WithoutCloseButton: Story = {
  render: () => <CartDrawerExample showCloseButton={false} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open cart" }));
    await screen.findByRole("dialog");
    await expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    await userEvent.keyboard("{Escape}");
    await closed();
  },
};

/** Many lines: the body scrolls while the title and the footer stay visible. */
const MANY_LINES = Array.from({ length: 16 }, (_, index) => ({
  name: `Item ${index + 1}`,
  price: "99,00 zł",
  quantity: 1,
}));

export const ManyLines: Story = {
  render: () => <CartDrawerExample defaultOpen lines={MANY_LINES} />,
};

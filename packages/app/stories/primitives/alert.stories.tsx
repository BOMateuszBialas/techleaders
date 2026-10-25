import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";
import { Narrow } from "./blocks/state-grid";

/**
 * Primitives / Alert. Real component from `@/components/ui/alert`. No default role (owner decision
 * Q4): each story sets the role the screen would.
 */
const meta = {
  title: "Primitives/Alert",
  component: Alert,
  args: { variant: "warning" },
  argTypes: {
    variant: {
      control: "select",
      options: ["info", "success", "warning", "destructive", "demo"],
      description: "The meaning of the message; each has its own icon.",
      table: { defaultValue: { summary: "info" } },
    },
    role: {
      control: "select",
      options: [undefined, "alert", "status", "note"],
      description:
        "Set by the caller: `alert` for an error after an action, `status` for a success.",
    },
  },
  render: (args) => (
    <Alert {...args} className="max-w-xl">
      <AlertTitle>The slug changed</AlertTitle>
      <AlertDescription>
        Links to the old address /categories/mice stop working after you save.
      </AlertDescription>
    </Alert>
  ),
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Every variant with a message from the product. */
export const Variants: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-group-item">
      <Alert>
        <AlertTitle>Prices include VAT</AlertTitle>
        <AlertDescription>Shipping is not charged in this demo store.</AlertDescription>
      </Alert>
      <Alert variant="success" role="status">
        <AlertDescription>Category saved.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <AlertTitle>Check the draft before you save it</AlertTitle>
        <AlertDescription>
          The description was written by AI from the product data. Nothing is saved until you press
          Save.
        </AlertDescription>
      </Alert>
      <Alert variant="destructive" role="alert">
        <AlertTitle>The catalog is temporarily unavailable</AlertTitle>
        <AlertDescription>Try again in a moment.</AlertDescription>
      </Alert>
      <Alert variant="demo" role="note">
        <AlertDescription>
          Demo payment: no money moves and no card data is collected.
        </AlertDescription>
      </Alert>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "The catalog is temporarily unavailable",
    );
    await expect(canvas.getByRole("status")).toHaveTextContent("Category saved.");
    // Every variant shows an icon (never color alone).
    const alerts = canvasElementAlerts(canvas.getByRole("alert").parentElement);
    for (const alert of alerts) await expect(alert.querySelector("svg")).not.toBeNull();
  },
};

function canvasElementAlerts(root: HTMLElement | null): HTMLElement[] {
  return root ? Array.from(root.querySelectorAll<HTMLElement>("[data-slot=alert]")) : [];
}

/** Without a role prop the alert is not a live region (Q4): a standing note is not announced. */
export const NoDefaultRole: Story = {
  render: () => (
    <Alert variant="demo" className="max-w-xl">
      <AlertDescription>This order is demo data: it was created by the seed.</AlertDescription>
    </Alert>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("alert")).toBeNull();
    await expect(canvas.queryByRole("status")).toBeNull();
  },
};

/** An error that needs action: the action is a normal button inside, never a dismiss button. */
export const WithAction: Story = {
  render: () => (
    <Alert variant="destructive" role="alert" className="max-w-xl">
      <AlertTitle>Copilot is temporarily unavailable</AlertTitle>
      <AlertDescription>
        <p>The rule-based insights below still use your store data.</p>
        <div className="flex flex-wrap items-center gap-related">
          <Button size="sm" variant="outline">
            Try again
          </Button>
          <TextLink href="/admin">Back to the dashboard</TextLink>
        </div>
      </AlertDescription>
    </Alert>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Try again" })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "Back to the dashboard" })).toHaveFocus();
  },
};

/** Admin scope: 12 px padding, 14 px text. */
export const AdminDensity: Story = {
  globals: { density: "admin" },
  render: () => (
    <Alert variant="warning" className="max-w-xl">
      <AlertDescription>Low stock: 3 products have 5 or fewer units.</AlertDescription>
    </Alert>
  ),
  play: async ({ canvas }) => {
    const text = canvas.getByText("Low stock: 3 products have 5 or fewer units.");
    await expect(getComputedStyle(text).fontSize).toBe("14px");
    const alert = text.closest<HTMLElement>("[data-slot=alert]");
    await expect(alert && getComputedStyle(alert).paddingTop).toBe("12px");
  },
};

/** Long text at 320 px wraps; the icon stays on the first line. */
export const LongTextNarrow: Story = {
  render: () => (
    <Narrow>
      <Alert variant="demo">
        <AlertTitle>Demo store</AlertTitle>
        <AlertDescription>
          Products, prices, orders and traffic numbers are demo data. Payments are simulated: no
          money moves, no card data is collected and nothing is shipped.
        </AlertDescription>
      </Alert>
    </Narrow>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByTestId("narrow-frame");
    await expect(frame.scrollWidth).toBe(frame.clientWidth);
  },
};

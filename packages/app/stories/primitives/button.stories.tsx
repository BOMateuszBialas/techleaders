import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IconPlus, IconSearch, IconShoppingCart } from "@tabler/icons-react";
import { expect, fn } from "storybook/test";
import { Button } from "@/components/ui/button";
import { Narrow, StateGrid } from "./blocks/state-grid";

/**
 * Primitives / Button. Real component from `@/components/ui/button`; examples use the store's
 * own copy (cart, checkout and admin texts in `src/components/**\/*-copy.ts`).
 */
const meta = {
  title: "Primitives/Button",
  component: Button,
  args: { children: "Find order", onClick: fn() },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "action", "secondary", "outline", "ghost", "destructive", "link"],
      description: "Visual weight and meaning. `action` is for purchase steps only.",
      table: { defaultValue: { summary: "default" } },
    },
    size: {
      control: "select",
      options: ["sm", "default", "lg", "icon-sm", "icon", "icon-lg"],
      description: "Height from the density tokens (`--control-h-sm|md|lg`).",
      table: { defaultValue: { summary: "default" } },
    },
    disabled: {
      control: "boolean",
      description: "Unavailable. Say why next to the button (rule 14).",
    },
    focusableWhenDisabled: {
      control: "boolean",
      description: "Keeps a disabled button in the tab order, so its reason can be read.",
    },
    type: {
      control: "select",
      options: ["button", "submit", "reset"],
      description: "Native button type. Inside a form, `submit` sends it.",
    },
    "aria-busy": {
      control: "boolean",
      description: "Loading: keeps the variant's colors while a submit is pending.",
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

const VARIANTS = [
  ["default", "Find order"],
  ["action", "Add to cart"],
  ["secondary", "Draft with AI"],
  ["outline", "Update"],
  ["ghost", "Remove"],
  ["destructive", "Delete category"],
  ["link", "Clear search"],
] as const;

/** Every prop as a control. The click calls `onClick` once. */
export const Playground: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Find order" }));
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

/** Seven variants. Only `action` is red, and only on a purchase step. */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-related">
      {VARIANTS.map(([variant, label]) => (
        <Button key={variant} variant={variant}>
          {label}
        </Button>
      ))}
    </div>
  ),
};

/** Three heights and three square icon buttons. Icon-only buttons always have `aria-label`. */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-related">
      <Button size="sm" variant="outline">
        Update
      </Button>
      <Button>Find order</Button>
      <Button size="lg" variant="action">
        <IconShoppingCart aria-hidden="true" data-icon="inline-start" />
        Add to cart
      </Button>
      <Button size="icon-sm" variant="outline" aria-label="Add category">
        <IconPlus aria-hidden="true" />
      </Button>
      <Button size="icon" variant="outline" aria-label="Search">
        <IconSearch aria-hidden="true" />
      </Button>
      <Button size="icon-lg" variant="outline" aria-label="Open cart">
        <IconShoppingCart aria-hidden="true" />
      </Button>
    </div>
  ),
  play: async ({ canvas }) => {
    // Store density at a desktop width: 40 / 44 / 48 px (tokeny.md §3).
    const heights = ["Update", "Find order", "Add to cart"].map(
      (name) => canvas.getByRole("button", { name }).getBoundingClientRect().height,
    );
    await expect(heights).toEqual([40, 44, 48]);
    await expect(canvas.getByRole("button", { name: "Search" }).getBoundingClientRect().width).toBe(
      44,
    );
  },
};

/** The same buttons in the admin scope (`data-density="admin"`): 28 / 32 / 36 px, 14 px text. */
export const AdminDensity: Story = {
  globals: { density: "admin" },
  render: () => (
    <div className="flex flex-wrap items-center gap-related">
      <Button size="sm" variant="outline">
        Sign out
      </Button>
      <Button>Save product</Button>
      <Button size="lg" variant="secondary">
        Draft with AI
      </Button>
    </div>
  ),
  play: async ({ canvas }) => {
    const heights = ["Sign out", "Save product", "Draft with AI"].map(
      (name) => canvas.getByRole("button", { name }).getBoundingClientRect().height,
    );
    await expect(heights).toEqual([28, 32, 36]);
    await expect(
      getComputedStyle(canvas.getByRole("button", { name: "Save product" })).fontSize,
    ).toBe("14px");
  },
};

const STATE_COLUMNS = ["Default", "Hover", "Focus", "Pressed", "Disabled", "Loading"];

/**
 * State matrix. Hover, focus and pressed are frozen previews (`data-preview-state`, the same
 * declarations as `:hover`, `:focus-visible` and `:active`). Disabled is grey for every filled
 * variant; loading (`aria-busy`) keeps the variant's color.
 */
export const States: Story = {
  render: () => (
    <StateGrid
      columns={STATE_COLUMNS}
      rows={VARIANTS.map(([variant, label]) => ({
        label: variant,
        cells: [
          <Button key="default" variant={variant}>
            {label}
          </Button>,
          <Button key="hover" variant={variant} data-preview-state="hover">
            {label}
          </Button>,
          <Button key="focus" variant={variant} data-preview-state="focus">
            {label}
          </Button>,
          <Button key="pressed" variant={variant} data-preview-state="active hover">
            {label}
          </Button>,
          <Button key="disabled" variant={variant} disabled>
            {label}
          </Button>,
          <Button key="loading" variant={variant} disabled aria-busy="true">
            {label}…
          </Button>,
        ],
      }))}
    />
  ),
  play: async ({ canvas }) => {
    // The frozen previews really carry the hover and focus declarations.
    const [idle, hover, focus, , disabled] = canvas.getAllByRole("button", { name: "Find order" });
    if (!idle || !hover || !focus || !disabled) throw new Error("State matrix row is incomplete");
    await expect(getComputedStyle(hover).backgroundColor).not.toBe(
      getComputedStyle(idle).backgroundColor,
    );
    await expect(getComputedStyle(focus).outlineStyle).toBe("solid");
    await expect(getComputedStyle(disabled).opacity).toBe("1");
  },
};

/**
 * Disabled with a reason: the button stays focusable and points at the sentence that explains it
 * (the "Draft with AI" button without an AI key).
 */
export const DisabledWithReason: Story = {
  render: (args) => (
    <div className="flex max-w-(--measure-prose) flex-col gap-related">
      <Button
        variant="secondary"
        disabled
        focusableWhenDisabled
        aria-describedby="draft-hint"
        onClick={args.onClick}
      >
        Draft with AI
      </Button>
      <p id="draft-hint" className="type-small text-muted-foreground">
        AI drafting is not set up on this store (no AI key). Write the description yourself.
      </p>
    </div>
  ),
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole("button", { name: "Draft with AI" });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(button).toHaveAccessibleDescription(
      "AI drafting is not set up on this store (no AI key). Write the description yourself.",
    );
    await userEvent.keyboard("{Enter}");
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

/** Keyboard: Tab reaches the button, Enter and Space press it, the ring is a 2 px outline. */
export const Keyboard: Story = {
  args: { children: "Place order", variant: "action" },
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole("button", { name: "Place order" });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    const style = getComputedStyle(button);
    await expect([style.outlineStyle, style.outlineWidth, style.outlineOffset]).toEqual([
      "solid",
      "2px",
      "2px",
    ]);
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
};

/** Loading keeps the color of the variant, so the button does not flash grey while it submits. */
export const Loading: Story = {
  render: () => (
    <div className="flex gap-related">
      <Button variant="action">Add to cart</Button>
      <Button variant="action" disabled aria-busy="true">
        Adding…
      </Button>
    </div>
  ),
  play: async ({ canvas }) => {
    const idle = getComputedStyle(canvas.getByRole("button", { name: "Add to cart" }));
    const busy = canvas.getByRole("button", { name: "Adding…" });
    await expect(busy).toBeDisabled();
    await expect(getComputedStyle(busy).backgroundColor).toBe(idle.backgroundColor);
  },
};

/**
 * Long labels at 320 px. Labels never wrap; a long one takes the full width on a phone
 * (`className="w-full"`), which is how the demo payment button fits.
 */
export const LongLabelNarrow: Story = {
  render: () => (
    <Narrow>
      <Button variant="action" className="w-full">
        Confirm demo payment (no charge)
      </Button>
      <Button variant="outline" className="w-full">
        OK, update my cart
      </Button>
    </Narrow>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByTestId("narrow-frame");
    const button = canvas.getByRole("button", { name: "Confirm demo payment (no charge)" });
    await expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth);
    await expect(frame.scrollWidth).toBe(frame.clientWidth);
  },
};

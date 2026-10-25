import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Badge } from "@/components/ui/badge";
import { Narrow, StateGrid } from "./blocks/state-grid";

/**
 * Primitives / Badge. Real component from `@/components/ui/badge`. A status in words; never
 * interactive, never color alone (tokeny.md §7 rule 10).
 */
const meta = {
  title: "Primitives/Badge",
  component: Badge,
  args: { children: "Paid", variant: "success" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "success", "warning", "destructive", "demo"],
      description: "The meaning of the status; see the mapping table on the docs page.",
      table: { defaultValue: { summary: "default" } },
    },
    children: { control: "text", description: "The status in words, 1–3 words." },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const VARIANTS = [
  ["default", "Featured"],
  ["secondary", "Processing"],
  ["outline", "Shipped"],
  ["success", "Paid"],
  ["warning", "Pending payment"],
  ["destructive", "Cancelled"],
  ["demo", "Demo"],
] as const;

/** Every variant with a status from the product. */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-related">
      {VARIANTS.map(([variant, label]) => (
        <Badge key={variant} variant={variant}>
          {label}
        </Badge>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    // Store density: the `small` style, 14 px text, 24 px tall, 4 px radius.
    const badge = canvas.getByText("Paid");
    await expect(getComputedStyle(badge).fontSize).toBe("14px");
    await expect(badge.getBoundingClientRect().height).toBe(24);
    await expect(getComputedStyle(badge).borderTopLeftRadius).toBe("4px");
  },
};

/** The order statuses, mapped as P2 (applied to the screens in the retrofit). */
export const OrderStatuses: Story = {
  render: () => (
    <StateGrid
      columns={["Badge"]}
      rows={[
        {
          label: "pending_payment",
          cells: [
            <Badge key="b" variant="warning">
              Pending payment
            </Badge>,
          ],
        },
        {
          label: "paid",
          cells: [
            <Badge key="b" variant="success">
              Paid
            </Badge>,
          ],
        },
        {
          label: "processing",
          cells: [
            <Badge key="b" variant="secondary">
              Processing
            </Badge>,
          ],
        },
        {
          label: "shipped",
          cells: [
            <Badge key="b" variant="outline">
              Shipped
            </Badge>,
          ],
        },
        {
          label: "cancelled",
          cells: [
            <Badge key="b" variant="destructive">
              Cancelled
            </Badge>,
          ],
        },
        {
          label: "refunded",
          cells: [
            <Badge key="b" variant="outline">
              Refunded
            </Badge>,
          ],
        },
      ]}
    />
  ),
};

/** On the surfaces where badges stand: page, card, product tile (B2.17). */
export const OnSurfaces: Story = {
  render: () => (
    <div className="flex flex-col gap-related">
      {(
        [
          ["bg-background", "Page"],
          ["bg-card border border-border", "Card"],
          ["bg-surface-product", "Product tile"],
        ] as const
      ).map(([surface, name]) => (
        <div
          key={name}
          className={`flex flex-wrap items-center gap-related rounded-card p-4 ${surface}`}
        >
          <span className="type-small w-24 text-muted-foreground">{name}</span>
          <Badge variant="success">In stock</Badge>
          <Badge variant="outline">Out of stock</Badge>
          <Badge variant="warning">Low stock</Badge>
          <Badge variant="demo">Demo</Badge>
        </div>
      ))}
    </div>
  ),
};

/** Admin scope: 12 px text, 20 px tall, in a dense table row. */
export const AdminDensity: Story = {
  globals: { density: "admin" },
  render: () => (
    <div className="flex flex-wrap items-center gap-related type-body">
      <span className="font-mono">CO-GWP9H-XS4PQ</span>
      <Badge variant="success">Paid</Badge>
      <Badge variant="demo">Demo</Badge>
    </div>
  ),
  play: async ({ canvas }) => {
    const badge = canvas.getByText("Paid");
    await expect(getComputedStyle(badge).fontSize).toBe("12px");
    await expect(badge.getBoundingClientRect().height).toBe(20);
  },
};

/** Badges keep one line; at 320 px a row of them wraps as a whole, never the text inside. */
export const Narrow320: Story = {
  render: () => (
    <Narrow>
      <div className="flex flex-wrap gap-related">
        <Badge variant="warning">Pending payment</Badge>
        <Badge variant="demo">Demo</Badge>
        <Badge variant="secondary">Created from CSV</Badge>
        <Badge variant="outline">Out of stock</Badge>
      </div>
    </Narrow>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByTestId("narrow-frame");
    await expect(frame.scrollWidth).toBe(frame.clientWidth);
    const badge = canvas.getByText("Pending payment");
    await expect(badge.getBoundingClientRect().height).toBe(24);
  },
};

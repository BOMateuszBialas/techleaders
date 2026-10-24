import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { TextLink } from "@/components/ui/text-link";
import { Narrow, StateGrid } from "./blocks/state-grid";

/** Primitives / Text link. Real component from `@/components/ui/text-link` (wraps `next/link`). */
const meta = {
  title: "Primitives/Text link",
  component: TextLink,
  args: { href: "/orders/lookup", children: "Find your order" },
  argTypes: {
    variant: {
      control: "select",
      options: ["inline", "standalone", "resource"],
      description: "Where the link sits: in a sentence, on its own line, or as a name in a table.",
      table: { defaultValue: { summary: "inline" } },
    },
    href: { control: "text", description: "Destination (a `next/link` href)." },
  },
} satisfies Meta<typeof TextLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Three variants, each in the place it is meant for. */
export const Variants: Story = {
  render: () => (
    <div className="flex max-w-(--measure-prose) flex-col gap-group-item type-body">
      <p>
        No email is sent. Keep the reference, or{" "}
        <TextLink href="/orders/lookup">find your order</TextLink> later with it.
      </p>
      <TextLink variant="standalone" href="/products" className="type-small">
        Back to products
      </TextLink>
      <table className="type-body">
        <tbody>
          <tr>
            <td className="pr-4">
              <TextLink variant="resource" href="/admin/products/1">
                Vortex Wireless Mouse
              </TextLink>
            </td>
            <td className="font-mono type-small text-muted-foreground">DEMO-MOU-001</td>
          </tr>
        </tbody>
      </table>
    </div>
  ),
  play: async ({ canvas }) => {
    const back = canvas.getByRole("link", { name: "Back to products" });
    // A standalone link is a 24 px target (WCAG 2.5.8).
    await expect(back.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    await expect(getComputedStyle(back).textDecorationLine).toBe("underline");
  },
};

/** Hover thickens the underline (resource: shows it); focus is the 2 px outline with an offset. */
export const States: Story = {
  render: () => (
    <StateGrid
      columns={["Default", "Hover", "Focus"]}
      rows={(["inline", "standalone", "resource"] as const).map((variant) => ({
        label: variant,
        cells: [
          <TextLink key="default" variant={variant} href="/products">
            Continue shopping
          </TextLink>,
          <TextLink key="hover" variant={variant} href="/products" data-preview-state="hover">
            Continue shopping
          </TextLink>,
          <TextLink key="focus" variant={variant} href="/products" data-preview-state="focus">
            Continue shopping
          </TextLink>,
        ],
      }))}
    />
  ),
};

/** Keyboard: Tab reaches the link; the ring is a 2 px outline with a 2 px offset. */
export const Keyboard: Story = {
  play: async ({ canvas, userEvent }) => {
    const link = canvas.getByRole("link", { name: "Find your order" });
    await userEvent.tab();
    await expect(link).toHaveFocus();
    await expect(link).toHaveAttribute("href", "/orders/lookup");
    const style = getComputedStyle(link);
    await expect([style.outlineStyle, style.outlineWidth, style.outlineOffset]).toEqual([
      "solid",
      "2px",
      "2px",
    ]);
  },
};

/** Long link text wraps inside a sentence at 320 px; nothing scrolls sideways. */
export const LongTextNarrow: Story = {
  render: () => (
    <Narrow>
      <p className="type-body">
        Prices are confirmed at checkout.{" "}
        <TextLink href="/products?category=mousepads">
          See every cloth, speed and glass mousepad in the catalog
        </TextLink>
        .
      </p>
    </Narrow>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByTestId("narrow-frame");
    await expect(frame.scrollWidth).toBe(frame.clientWidth);
  },
};

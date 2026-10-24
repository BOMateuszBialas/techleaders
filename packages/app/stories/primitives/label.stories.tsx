import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Narrow } from "./blocks/state-grid";

/** Primitives / Label. Real component from `@/components/ui/label`. */
const meta = {
  title: "Primitives/Label",
  component: Label,
  args: { htmlFor: "label-email", children: "Email" },
  argTypes: {
    htmlFor: { control: "text", description: "The `id` of the control it names." },
    children: { control: "text", description: "The field's name, in sentence case." },
  },
  render: (args) => (
    <div className="flex max-w-sm flex-col gap-related">
      <Label {...args} />
      <Input id="label-email" type="email" autoComplete="email" />
    </div>
  ),
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Clicking the label focuses its field. */
export const Playground: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByText("Email"));
    await expect(canvas.getByRole("textbox", { name: "Email" })).toHaveFocus();
  },
};

/** A disabled field greys its label too (`peer-disabled`), without transparency. */
export const Disabled: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col-reverse gap-related">
      <Input id="label-sku" disabled defaultValue="DEMO-MOU-001" className="peer" />
      <Label htmlFor="label-sku">SKU</Label>
    </div>
  ),
};

/** Admin scope: still 14/20 px, 500 (owner decision Q3), not the 12 px small style. */
export const AdminDensity: Story = {
  globals: { density: "admin" },
  play: async ({ canvas }) => {
    const style = getComputedStyle(canvas.getByText("Email"));
    await expect([style.fontSize, style.lineHeight, style.fontWeight]).toEqual([
      "14px",
      "20px",
      "500",
    ]);
  },
};

/** A long label wraps at 320 px; lines do not overlap (20 px line height). */
export const LongLabelNarrow: Story = {
  args: { children: "Address line 2 (optional): apartment, floor or company name" },
  render: (args) => (
    <Narrow>
      <div className="flex flex-col gap-related">
        <Label {...args} htmlFor="label-line2" />
        <Input id="label-line2" autoComplete="address-line2" />
      </div>
    </Narrow>
  ),
  play: async ({ canvas }) => {
    const label = canvas.getByText(/Address line 2/);
    await expect(label.getBoundingClientRect().height).toBeGreaterThanOrEqual(40);
  },
};

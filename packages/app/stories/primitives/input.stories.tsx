import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Narrow, StateGrid } from "./blocks/state-grid";

/**
 * Primitives / Input. Real component from `@/components/ui/input` (Base UI `Input`). Inputs in
 * these stories always have a label: a field without one fails the accessibility check.
 */
const meta = {
  title: "Primitives/Input",
  component: Input,
  args: { "aria-label": "Order reference", placeholder: "CO-XXXXX-XXXXX-XXXXX-XXXXX" },
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "number", "search", "file"],
      description: "Native input type; pick the one that gives the right phone keyboard.",
      table: { defaultValue: { summary: "text" } },
    },
    placeholder: { control: "text", description: "An example of the format, never the label." },
    disabled: { control: "boolean", description: "Not editable; greyed. Say why nearby." },
    "aria-invalid": { control: "boolean", description: "Marks an error: red outline." },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Types the product uses: name, email, quantity, search and the CSV file in the import. */
export const Types: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-group-item">
      <div className="flex flex-col gap-related">
        <Label htmlFor="t-name">Full name</Label>
        <Input id="t-name" autoComplete="name" defaultValue="Jan Kowalski" />
      </div>
      <div className="flex flex-col gap-related">
        <Label htmlFor="t-email">Email</Label>
        <Input id="t-email" type="email" autoComplete="email" placeholder="jan@example.com" />
      </div>
      <div className="flex flex-col gap-related">
        <Label htmlFor="t-qty">Quantity</Label>
        <Input
          id="t-qty"
          type="number"
          inputMode="numeric"
          min={1}
          defaultValue={1}
          className="w-24"
        />
      </div>
      <div className="flex flex-col gap-related">
        <Label htmlFor="t-search">Search products</Label>
        <Input id="t-search" type="search" placeholder="e.g. wireless mouse" />
      </div>
      <div className="flex flex-col gap-related">
        <Label htmlFor="t-file">CSV file</Label>
        <Input id="t-file" type="file" accept=".csv,text/csv" />
      </div>
    </div>
  ),
};

/**
 * State matrix. Hover does not change the field (B1.19). Focus: `--ring` outline plus the 2 px
 * ring. Error: `--destructive` outline, also in focus, with the neutral ring.
 */
export const States: Story = {
  render: () => (
    <StateGrid
      columns={["Default", "Hover", "Focus", "Error", "Error + focus", "Disabled"]}
      rows={[
        {
          label: "empty",
          cells: [
            <Input key="d" aria-label="Postal code, default" placeholder="00-950" />,
            <Input
              key="h"
              aria-label="Postal code, hover"
              placeholder="00-950"
              data-preview-state="hover"
            />,
            <Input
              key="f"
              aria-label="Postal code, focus"
              placeholder="00-950"
              data-preview-state="focus"
            />,
            <Input key="e" aria-label="Postal code, error" placeholder="00-950" aria-invalid />,
            <Input
              key="ef"
              aria-label="Postal code, error and focus"
              placeholder="00-950"
              aria-invalid
              data-preview-state="focus"
            />,
            <Input key="x" aria-label="Postal code, disabled" placeholder="00-950" disabled />,
          ],
        },
        {
          label: "filled",
          cells: [
            <Input key="d" aria-label="City, default" defaultValue="Warszawa" />,
            <Input
              key="h"
              aria-label="City, hover"
              defaultValue="Warszawa"
              data-preview-state="hover"
            />,
            <Input
              key="f"
              aria-label="City, focus"
              defaultValue="Warszawa"
              data-preview-state="focus"
            />,
            <Input key="e" aria-label="City, error" defaultValue="W" aria-invalid />,
            <Input
              key="ef"
              aria-label="City, error and focus"
              defaultValue="W"
              aria-invalid
              data-preview-state="focus"
            />,
            <Input key="x" aria-label="City, disabled" defaultValue="Warszawa" disabled />,
          ],
        },
      ]}
    />
  ),
  play: async ({ canvas }) => {
    const errorFocus = canvas.getByRole("textbox", { name: "City, error and focus" });
    const error = canvas.getByRole("textbox", { name: "City, error" });
    const focus = canvas.getByRole("textbox", { name: "City, focus" });
    // The error outline stays red in focus; the focus ring stays neutral (tokeny.md §5).
    await expect(getComputedStyle(errorFocus).borderTopColor).toBe(
      getComputedStyle(error).borderTopColor,
    );
    await expect(getComputedStyle(errorFocus).outlineColor).toBe(
      getComputedStyle(focus).outlineColor,
    );
  },
};

/** Typing and keyboard focus: the value is kept and the ring appears. */
export const Typing: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-related">
      <Label htmlFor="lookup">Order reference</Label>
      <Input id="lookup" className="font-mono" placeholder="CO-XXXXX-XXXXX-XXXXX-XXXXX" />
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole("textbox", { name: "Order reference" });
    await userEvent.tab();
    await expect(input).toHaveFocus();
    await userEvent.keyboard("CO-GWP9H-XS4PQ-YMB0S-181M8");
    await expect(input).toHaveValue("CO-GWP9H-XS4PQ-YMB0S-181M8");
    await expect(getComputedStyle(input).outlineStyle).toBe("solid");
    // Store density: 44 px tall, 16 px text (no iOS zoom).
    await expect(input.getBoundingClientRect().height).toBe(44);
    await expect(getComputedStyle(input).fontSize).toBe("16px");
  },
};

/** Admin scope: 32 px tall, 14 px text on a desktop. */
export const AdminDensity: Story = {
  globals: { density: "admin" },
  render: () => (
    <div className="flex max-w-sm flex-col gap-related">
      <Label htmlFor="stock">Stock quantity</Label>
      <Input id="stock" type="number" inputMode="numeric" defaultValue={24} className="w-24" />
    </div>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("spinbutton", { name: "Stock quantity" });
    await expect(input.getBoundingClientRect().height).toBe(32);
    await expect(getComputedStyle(input).fontSize).toBe("14px");
  },
};

/** A long value at 320 px scrolls inside the field, never the page. */
export const LongValueNarrow: Story = {
  render: () => (
    <Narrow>
      <div className="flex flex-col gap-related">
        <Label htmlFor="url">Image URL</Label>
        <Input
          id="url"
          inputMode="url"
          defaultValue="https://images.example.com/products/vortex-wireless-mouse/front-view-large.png"
        />
      </div>
    </Narrow>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByTestId("narrow-frame");
    await expect(frame.scrollWidth).toBe(frame.clientWidth);
  },
};

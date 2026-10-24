import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Narrow, StateGrid } from "./blocks/state-grid";

/** Primitives / Textarea. Real component from `@/components/ui/textarea`. */
const meta = {
  title: "Primitives/Textarea",
  component: Textarea,
  args: { "aria-label": "Description", placeholder: "What the shopper should know" },
  argTypes: {
    rows: { control: "number", description: "Ignored where the field grows with content." },
    maxLength: { control: "number", description: "Hard limit; show the limit in the hint." },
    disabled: { control: "boolean", description: "Not editable; greyed." },
    "aria-invalid": { control: "boolean", description: "Marks an error: red outline." },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const DESCRIPTION =
  "[DEMO] Lightweight wireless mouse with a 26K DPI sensor, 70-hour battery and a 2.4 GHz dongle.";

/** Same states as Input: hover unchanged, focus ring, red outline for an error, grey disabled. */
export const States: Story = {
  render: () => (
    <StateGrid
      columns={["Default", "Focus", "Error", "Disabled"]}
      rows={[
        {
          label: "filled",
          cells: [
            <Textarea key="d" aria-label="Description, default" defaultValue={DESCRIPTION} />,
            <Textarea
              key="f"
              aria-label="Description, focus"
              defaultValue={DESCRIPTION}
              data-preview-state="focus"
            />,
            <Textarea key="e" aria-label="Description, error" defaultValue="" aria-invalid />,
            <Textarea
              key="x"
              aria-label="Description, disabled"
              defaultValue={DESCRIPTION}
              disabled
            />,
          ],
        },
      ]}
    />
  ),
};

/** About three lines high when empty (96 px); grows with the text where `field-sizing` exists. */
export const GrowsWithContent: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-related">
      <Label htmlFor="copilot-question">Question</Label>
      <Textarea id="copilot-question" placeholder="Which products are low on stock?" />
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole("textbox", { name: "Question" });
    const empty = field.getBoundingClientRect().height;
    await expect(empty).toBe(96);
    await userEvent.click(field);
    await userEvent.keyboard(
      "Which products sold best last month?{Shift>}{Enter}{/Shift}Which of them are low on stock?{Shift>}{Enter}{/Shift}What should I restock first?{Shift>}{Enter}{/Shift}And why?",
    );
    await expect(field.getBoundingClientRect().height).toBeGreaterThan(empty);
  },
};

/** Admin scope: 14 px text, same minimum height. */
export const AdminDensity: Story = {
  globals: { density: "admin" },
  render: () => (
    <div className="flex max-w-md flex-col gap-related">
      <Label htmlFor="cat-desc">Description</Label>
      <Textarea id="cat-desc" defaultValue="[DEMO] Gaming mice: wired, wireless and MMO." />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(getComputedStyle(canvas.getByRole("textbox")).fontSize).toBe("14px");
  },
};

/** Long text at 320 px wraps inside the field. */
export const LongTextNarrow: Story = {
  render: () => (
    <Narrow>
      <div className="flex flex-col gap-related">
        <Label htmlFor="long">Description</Label>
        <Textarea id="long" defaultValue={`${DESCRIPTION} ${DESCRIPTION}`} />
      </div>
    </Narrow>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByTestId("narrow-frame");
    await expect(frame.scrollWidth).toBe(frame.clientWidth);
  },
};

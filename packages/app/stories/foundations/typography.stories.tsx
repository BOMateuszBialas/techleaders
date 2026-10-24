import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TypeStyles } from "./blocks/foundation-blocks";

/** Foundations: typography. Rendered as stories so the accessibility test checks them in both themes. */
const meta = {
  title: "Foundations/Typography",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextStyles: Story = { render: () => <TypeStyles /> };

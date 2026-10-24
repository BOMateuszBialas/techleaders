import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SpacingScale, LayoutWidths } from "./blocks/foundation-blocks";

/** Foundations: spacing and layout. Rendered as stories so the accessibility test checks them in both themes. */
const meta = {
  title: "Foundations/Spacing and layout",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Spacing: Story = { render: () => <SpacingScale /> };
export const Widths: Story = { render: () => <LayoutWidths /> };

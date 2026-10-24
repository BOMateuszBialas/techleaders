import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ShapeAndDepth } from "./blocks/foundation-blocks";

/** Foundations: shape and depth. Rendered as stories so the accessibility test checks them in both themes. */
const meta = {
  title: "Foundations/Shape and depth",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Shapes: Story = { render: () => <ShapeAndDepth /> };

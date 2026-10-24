import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MotionTokens } from "./blocks/foundation-blocks";

/** Foundations: motion. Rendered as stories so the accessibility test checks them in both themes. */
const meta = { title: "Foundations/Motion", parameters: { layout: "fullscreen" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Durations: Story = { render: () => <MotionTokens /> };

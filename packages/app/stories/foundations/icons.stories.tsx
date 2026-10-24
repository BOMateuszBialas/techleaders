import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IconSet } from "./blocks/foundation-blocks";

/** Foundations: icons. Rendered as stories so the accessibility test checks them in both themes. */
const meta = { title: "Foundations/Icons", parameters: { layout: "fullscreen" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const InUse: Story = { render: () => <IconSet /> };

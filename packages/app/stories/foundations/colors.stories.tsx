import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ColorRoles, ContrastTable } from "./blocks/color-blocks";

/** Foundations: colors. Rendered as stories so the accessibility test checks them in both themes. */
const meta = { title: "Foundations/Colors", parameters: { layout: "fullscreen" } } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Roles: Story = { render: () => <ColorRoles /> };
export const Contrast: Story = { render: () => <ContrastTable /> };

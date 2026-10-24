import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { THEME_STORAGE_KEY } from "@/lib/theme/theme";
import { Surface } from "./blocks/color-blocks";

/**
 * Foundations: themes. The real toggle from the storefront footer and the admin sidebar. It
 * writes the `.dark` class on `<html>`, the same element the Storybook toolbar uses.
 */
const meta = {
  title: "Foundations/Themes",
  component: ThemeToggle,
  render: () => (
    <Surface>
      <ThemeToggle />
    </Surface>
  ),
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Toggle: Story = {
  play: async ({ canvas, userEvent }) => {
    const root = document.documentElement;
    try {
      await userEvent.click(canvas.getByRole("radio", { name: "Dark" }));
      await expect(root).toHaveClass("dark");
      await expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

      // Arrow keys move the choice inside the native radio group.
      await userEvent.keyboard("{ArrowLeft}");
      await expect(canvas.getByRole("radio", { name: "Light" })).toBeChecked();
      await expect(root).not.toHaveClass("dark");

      await userEvent.click(canvas.getByRole("radio", { name: "System" }));
      await expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    } finally {
      localStorage.removeItem(THEME_STORAGE_KEY);
    }
  },
};

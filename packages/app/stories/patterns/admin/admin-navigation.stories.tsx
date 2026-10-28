import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { AdminNav } from "@/components/admin/admin-nav";

/**
 * Patterns / Admin / Navigation. The sidebar navigation of the admin shell (`admin/(protected)`
 * layout): dark `--sidebar` surface, `aria-current="page"` on the current section, a 3 px
 * `--sidebar-primary` marker. The current page comes from the pathname (`nextjs.navigation`).
 */
const meta = {
  title: "Patterns/Admin/Navigation",
  component: AdminNav,
  decorators: [
    (Story) => (
      <div data-density="admin" className="w-56 bg-sidebar p-2 text-sidebar-foreground">
        <Story />
      </div>
    ),
  ],
  // `appDirectory` makes Storybook provide the pathname to `usePathname` (without it: "/").
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/admin" } } },
} satisfies Meta<typeof AdminNav>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The dashboard: only the dashboard link is current (the other sections are not `/admin/*`). */
export const OnDashboard: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(canvas.getByRole("link", { name: "Orders" })).not.toHaveAttribute("aria-current");
  },
};

/** A nested order page: the Orders section is current, and it is the only current link. */
export const OnNestedOrder: Story = {
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: "/admin/orders/ord-1" } },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Orders" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(canvas.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  },
};

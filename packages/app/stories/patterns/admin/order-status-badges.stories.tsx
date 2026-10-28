import { ORDER_STATUS_LABELS, ORDER_STATUSES } from "@commerceos/core";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { DemoBadge, OrderStatusBadge } from "@/components/admin/orders/order-badges";

/**
 * Patterns / Admin / Status badges. The six order statuses (`OrderStatusBadge`, D5 variants) and
 * the demo badge. Every badge has its text: the status is never colour alone. `paid` and
 * `processing` use different variants.
 */

const meta = {
  title: "Patterns/Admin/Status badges",
  parameters: { layout: "padded", a11y: { test: "error" } },
  render: () => (
    <div data-density="admin" className="flex max-w-3xl flex-col gap-3 p-4 md:p-6">
      <ul aria-label="Order statuses" className="flex flex-wrap gap-2">
        {ORDER_STATUSES.map((status) => (
          <li key={status}>
            <OrderStatusBadge status={status} />
          </li>
        ))}
      </ul>
      <div>
        <DemoBadge />
      </div>
    </div>
  ),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The six statuses in their lifecycle order, each with its label as text, and the demo badge. */
export const AllStatuses: Story = {
  play: async ({ canvas }) => {
    const list = canvas.getByRole("list", { name: "Order statuses" });
    await expect(list.querySelectorAll("li")).toHaveLength(6);
    for (const status of ORDER_STATUSES) {
      await expect(canvas.getByText(ORDER_STATUS_LABELS[status])).toBeVisible();
    }
  },
};

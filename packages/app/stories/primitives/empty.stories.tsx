import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { TextLink } from "@/components/ui/text-link";
import { Narrow } from "./blocks/state-grid";

/**
 * Primitives / Empty state. Real components from `@/components/ui/empty`: aligned to the start,
 * on `--muted`, no icon (`EmptyMedia` removed, owner decision). The heading element comes from
 * the caller.
 */
const meta = {
  title: "Primitives/Empty state",
  component: Empty,
  render: (args) => (
    <Empty {...args} className="max-w-xl">
      <EmptyHeader>
        <EmptyTitle>
          <h2>Your cart is empty</h2>
        </EmptyTitle>
        <EmptyDescription>Products you add stay here until you check out.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <TextLink variant="standalone" href="/products">
          Browse the catalog
        </TextLink>
      </EmptyContent>
    </Empty>
  ),
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

/** "Nothing here yet": why it is empty and where to go next. */
export const Playground: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("heading", { level: 2 })).toHaveTextContent("Your cart is empty");
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "Browse the catalog" })).toHaveFocus();
    const empty = canvas.getByText("Your cart is empty").closest<HTMLElement>("[data-slot=empty]");
    await expect(empty && getComputedStyle(empty).textAlign).toBe("left");
  },
};

const clearSearch = fn();

/** "No results for the filters": the action clears them (catalog search). */
export const NoResults: Story = {
  render: () => (
    <Empty className="max-w-xl">
      <EmptyHeader>
        <EmptyTitle>
          <h2>No products match “mousepad xxl”</h2>
        </EmptyTitle>
        <EmptyDescription>Check the spelling or search all categories.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={clearSearch}>
          Clear search
        </Button>
      </EmptyContent>
    </Empty>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    const button = canvas.getByRole("button", { name: "Clear search" });
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(clearSearch).toHaveBeenCalled();
    // No role: static content is not announced.
    await expect(canvas.queryByRole("status")).toBeNull();
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

/** Admin density, with the primary button (pair 74) to create the first item. */
export const AdminDensity: Story = {
  globals: { density: "admin" },
  render: () => (
    <Empty className="max-w-xl">
      <EmptyHeader>
        <EmptyTitle>
          <h2>No categories yet</h2>
        </EmptyTitle>
        <EmptyDescription>
          Categories group products in the store menu and filters.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>New category</Button>
      </EmptyContent>
    </Empty>
  ),
  play: async ({ canvas }) => {
    const description = canvas.getByText(
      "Categories group products in the store menu and filters.",
    );
    await expect(getComputedStyle(description).fontSize).toBe("14px");
    const empty = description.closest<HTMLElement>("[data-slot=empty]");
    await expect(empty && getComputedStyle(empty).paddingTop).toBe("16px");
  },
};

/** "Not found" page: neutral words, an `<h1>`, the same for a missing and a foreign order (A8). */
export const NotFound: Story = {
  render: () => (
    <Empty className="max-w-xl">
      <EmptyHeader>
        <EmptyTitle>
          <h1>Order not found</h1>
        </EmptyTitle>
        <EmptyDescription>Check the order number in your confirmation email.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <TextLink variant="standalone" href="/account/orders">
          Back to my orders
        </TextLink>
      </EmptyContent>
    </Empty>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent("Order not found");
  },
};

/** Long text at 320 px wraps; the actions wrap onto the next line. */
export const LongTextNarrow: Story = {
  render: () => (
    <Narrow>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>
            <h2>No recommendations yet</h2>
          </EmptyTitle>
          <EmptyDescription>
            Copilot needs at least one paid order in the selected period before it can compare
            products. Seed the demo data or place a test order first.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline">Analyze again</Button>
          <TextLink variant="standalone" href="/admin/orders">
            View orders
          </TextLink>
        </EmptyContent>
      </Empty>
    </Narrow>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByTestId("narrow-frame");
    await expect(frame.scrollWidth).toBe(frame.clientWidth);
  },
};

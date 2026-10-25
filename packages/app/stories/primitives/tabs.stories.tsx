import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsNav,
  TabsNavLink,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Narrow, StateGrid } from "./blocks/state-grid";

/**
 * Primitives / Tabs. Real components from `@/components/ui/tabs`: Base UI tabs for panels on the
 * same page, `TabsNav` + `TabsNavLink` for switching a view by URL (owner decision Q1). One look,
 * `line` (Q2); horizontal only (B3.15).
 */
const meta = {
  title: "Primitives/Tabs",
  component: Tabs,
  args: { defaultValue: "description" },
  argTypes: {
    defaultValue: {
      control: "select",
      options: ["description", "specification", "delivery"],
      description: "The tab active on first render (uncontrolled).",
    },
    value: { control: false, description: "The active tab (controlled, with `onValueChange`)." },
  },
  render: (args) => (
    <Tabs {...args} className="max-w-xl">
      <TabsList aria-label="Product details">
        <TabsTrigger value="description">Description</TabsTrigger>
        <TabsTrigger value="specification">Specification</TabsTrigger>
        <TabsTrigger value="delivery">Delivery</TabsTrigger>
      </TabsList>
      <TabsContent value="description">
        A light wireless mouse for long sessions: 58 g, 26 000 DPI sensor, 70 hours of battery.
      </TabsContent>
      <TabsContent value="specification">Weight 58 g. Sensor 26 000 DPI. Battery 70 h.</TabsContent>
      <TabsContent value="delivery">
        This demo store ships nothing: orders are recorded, no parcel is sent.
      </TabsContent>
    </Tabs>
  ),
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/**
 * Keyboard (WAI-ARIA APG): one Tab stop on the list, arrows move and activate (`activateOnFocus`,
 * B3.14), Home and End jump, the next Tab reaches the panel, which has a visible focus.
 */
export const Keyboard: Story = {
  play: async ({ canvas, userEvent }) => {
    const description = canvas.getByRole("tab", { name: "Description" });
    const specification = canvas.getByRole("tab", { name: "Specification" });
    const delivery = canvas.getByRole("tab", { name: "Delivery" });
    await userEvent.tab();
    await expect(description).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(specification).toHaveFocus();
    await expect(specification).toHaveAttribute("aria-selected", "true");
    await expect(canvas.getByRole("tabpanel", { name: "Specification" })).toHaveTextContent(
      "Weight 58 g.",
    );
    await userEvent.keyboard("{End}");
    await expect(delivery).toHaveFocus();
    await expect(delivery).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{Home}");
    await expect(description).toHaveFocus();
    await expect(description).toHaveAttribute("aria-selected", "true");
    // One Tab stop: the next Tab leaves the list for the panel.
    await userEvent.tab();
    const panel = canvas.getByRole("tabpanel", { name: "Description" });
    await expect(panel).toHaveFocus();
    await expect(getComputedStyle(panel).outlineStyle).toBe("solid");
  },
};

/** Click activates; the active tab is `--foreground` with a 2 px underline (shape, not only color). */
export const Click: Story = {
  play: async ({ canvas, userEvent }) => {
    const delivery = canvas.getByRole("tab", { name: "Delivery" });
    await userEvent.click(delivery);
    await expect(delivery).toHaveAttribute("aria-selected", "true");
    await expect(canvas.getByRole("tabpanel", { name: "Delivery" })).toHaveTextContent(
      "ships nothing",
    );
    const underline = getComputedStyle(delivery, "::after");
    await expect(underline.opacity).toBe("1");
    await expect(underline.height).toBe("2px");
    const inactive = canvas.getByRole("tab", { name: "Description" });
    await expect(getComputedStyle(inactive, "::after").opacity).toBe("0");
    await expect(getComputedStyle(inactive).color).not.toBe(getComputedStyle(delivery).color);
  },
};

/** State matrix. Hover and focus use the frozen preview; disabled has no underline. */
export const States: Story = {
  render: () => (
    <Tabs defaultValue="active">
      <StateGrid
        columns={["Default", "Hover", "Focus", "Active", "Disabled"]}
        rows={[
          {
            label: "tab",
            cells: [
              <TabsList key="d" aria-label="Default">
                <TabsTrigger value="default">Orders</TabsTrigger>
              </TabsList>,
              <TabsList key="h" aria-label="Hover">
                <TabsTrigger value="hover" data-preview-state="hover">
                  Orders
                </TabsTrigger>
              </TabsList>,
              <TabsList key="f" aria-label="Focus">
                <TabsTrigger value="focus" data-preview-state="focus">
                  Orders
                </TabsTrigger>
              </TabsList>,
              <TabsList key="a" aria-label="Active">
                <TabsTrigger value="active">Orders</TabsTrigger>
              </TabsList>,
              <TabsList key="x" aria-label="Disabled">
                <TabsTrigger value="disabled" disabled>
                  Orders
                </TabsTrigger>
              </TabsList>,
            ],
          },
        ]}
      />
    </Tabs>
  ),
  play: async ({ canvas }) => {
    const tab = (list: string) =>
      canvas.getByRole("tablist", { name: list }).querySelector<HTMLElement>("[role=tab]");
    const plain = tab("Default");
    const disabled = tab("Disabled");
    await expect(disabled && getComputedStyle(disabled).opacity).toBe("1");
    await expect(disabled && getComputedStyle(disabled, "::after").opacity).toBe("0");
    const hover = tab("Hover");
    await expect(hover && getComputedStyle(hover).color).not.toBe(
      plain && getComputedStyle(plain).color,
    );
    const focus = tab("Focus");
    await expect(focus && getComputedStyle(focus).outlineStyle).toBe("solid");
  },
};

/**
 * Switching a view by URL (Featured categories on the home page, the dashboard period): a named
 * `<nav>` of links, exactly one with `aria-current="page"`; works without JavaScript.
 */
export const NavByUrl: Story = {
  render: () => (
    <TabsNav aria-label="Featured categories">
      <TabsNavLink href="/?featured=mice" active>
        Mice
      </TabsNavLink>
      <TabsNavLink href="/?featured=keyboards">Keyboards</TabsNavLink>
      <TabsNavLink href="/?featured=headsets">Headsets</TabsNavLink>
    </TabsNav>
  ),
  play: async ({ canvas, userEvent }) => {
    const nav = canvas.getByRole("navigation", { name: "Featured categories" });
    await expect(canvas.queryByRole("tab")).toBeNull();
    await expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    await expect(canvas.getByRole("link", { name: "Mice" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Links are normal Tab stops, in order.
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "Mice" })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "Keyboards" })).toHaveFocus();
  },
};

/** Admin density: 32 px tabs, 14 px text (dashboard period). */
export const AdminDensity: Story = {
  globals: { density: "admin" },
  render: () => (
    <TabsNav aria-label="Period">
      <TabsNavLink href="/admin?period=7d">Last 7 days</TabsNavLink>
      <TabsNavLink href="/admin?period=30d" active>
        Last 30 days
      </TabsNavLink>
      <TabsNavLink href="/admin?period=90d">Last 90 days</TabsNavLink>
    </TabsNav>
  ),
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "Last 30 days" });
    await expect(link.getBoundingClientRect().height).toBe(32);
    await expect(getComputedStyle(link).fontSize).toBe("14px");
  },
};

/** Inside a card (pair 73) and at 320 px: the list wraps instead of scrolling sideways (B3.13). */
export const InCardNarrow: Story = {
  render: () => (
    <Narrow>
      <Card>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList aria-label="Recommendations">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="saved">Saved</TabsTrigger>
              <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            <TabsContent value="all">3 recommendations from the last analysis.</TabsContent>
            <TabsContent value="saved">1 saved recommendation.</TabsContent>
            <TabsContent value="dismissed">No dismissed recommendations.</TabsContent>
            <TabsContent value="completed">No completed recommendations.</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </Narrow>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByTestId("narrow-frame");
    await expect(frame.scrollWidth).toBe(frame.clientWidth);
    const list = canvas.getByRole("tablist", { name: "Recommendations" });
    await expect(list.scrollWidth).toBe(list.clientWidth);
  },
};

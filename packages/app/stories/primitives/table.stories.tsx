import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TextLink } from "@/components/ui/text-link";
import { Narrow } from "./blocks/state-grid";

/**
 * Primitives / Table. Real component from `@/components/ui/table` (no `"use client"`, B3.4). Rows
 * are not clickable and have no hover (B3.8); the resource name is a `TextLink` `resource`.
 */
const meta = {
  title: "Primitives/Table",
  component: Table,
  args: { "aria-label": "Orders" },
  argTypes: {
    "aria-label": {
      control: "text",
      description: "The table's name when it has no visible `TableCaption` (B3.9).",
    },
  },
  render: (args) => <OrdersTable {...args} />,
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const ORDERS = [
  { reference: "CO-7F3K2Q", customer: "Anna Nowak", status: "Paid", total: "1 249,00 zł" },
  {
    reference: "CO-9B1M4D",
    customer: "Piotr Zieliński",
    status: "Pending payment",
    total: "89,99 zł",
  },
  { reference: "CO-2X8P6L", customer: "Maria Wiśniewska", status: "Shipped", total: "349,50 zł" },
];

function OrdersTable(props: ComponentProps<typeof Table>) {
  return (
    <Table {...props}>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Order</TableHead>
          <TableHead scope="col">Customer</TableHead>
          <TableHead scope="col">Status</TableHead>
          <TableHead scope="col" className="text-right">
            Total
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ORDERS.map((order) => (
          <TableRow key={order.reference}>
            <TableCell>
              <TextLink variant="resource" href={`/admin/orders/${order.reference}`}>
                {order.reference}
              </TextLink>
            </TableCell>
            <TableCell>{order.customer}</TableCell>
            <TableCell>{order.status}</TableCell>
            <TableCell className="text-right">{order.total}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export const Playground: Story = {};

/** Store density ("My orders"): 16 px text, 48 px rows, header on `--muted`, digits tabular. */
export const StoreDensity: Story = {
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table", { name: "Orders" });
    await expect(getComputedStyle(table).fontVariantNumeric).toBe("tabular-nums");
    const row = canvas.getByRole("row", { name: /CO-7F3K2Q/ });
    // 24 px line + 2 × 12 px padding, plus the 1 px row line.
    await expect(row.getBoundingClientRect().height).toBe(49);
    const head = canvas.getByRole("columnheader", { name: "Order" });
    await expect(getComputedStyle(head).fontWeight).toBe("500");
    // The header row has a fill; body rows do not (no hover or selected styles, B3.8).
    const header = head.closest("thead");
    await expect(header && getComputedStyle(header).backgroundColor).not.toBe(
      getComputedStyle(row).backgroundColor,
    );
  },
};

/** Admin density: 14 px text, 44 px rows (R04.1). */
export const AdminDensity: Story = {
  globals: { density: "admin" },
  play: async ({ canvas }) => {
    const row = canvas.getByRole("row", { name: /CO-7F3K2Q/ });
    // 20 px line + 2 × 12 px padding, plus the 1 px row line.
    await expect(row.getBoundingClientRect().height).toBe(45);
    await expect(getComputedStyle(row).fontSize).toBe("14px");
  },
};

/** Numbers to the right, a visible caption under the table and a footer with the sum (B3.6, B3.9). */
export const CaptionAndFooter: Story = {
  globals: { density: "admin" },
  render: () => (
    <Table>
      <TableCaption>Top products by revenue, last 30 days (paid orders).</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Product</TableHead>
          <TableHead scope="col" className="text-right">
            Units
          </TableHead>
          <TableHead scope="col" className="text-right">
            Revenue
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Wireless gaming mouse</TableCell>
          <TableCell className="text-right">111</TableCell>
          <TableCell className="text-right">22 199,89 zł</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Mechanical keyboard</TableCell>
          <TableCell className="text-right">8</TableCell>
          <TableCell className="text-right">3 192,00 zł</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableHead scope="row">Total</TableHead>
          <TableCell className="text-right">119</TableCell>
          <TableCell className="text-right">25 391,89 zł</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
  play: async ({ canvas }) => {
    // The caption names the table.
    await expect(
      canvas.getByRole("table", { name: "Top products by revenue, last 30 days (paid orders)." }),
    ).toBeInTheDocument();
    // Tabular digits are inherited by every cell, the footer too (B3.6).
    await expect(getComputedStyle(canvas.getByText("119")).fontVariantNumeric).toBe("tabular-nums");
  },
};

/** Long text at 320 px: cells wrap, headers stay on one line, the page does not widen (B3.7). */
export const LongTextNarrow: Story = {
  render: () => (
    <Narrow>
      <Table aria-label="Products">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Product</TableHead>
            <TableHead scope="col" className="text-right">
              Stock
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <TextLink variant="resource" href="/admin/products/1">
                [DEMO] Ultralight wireless gaming mouse with a 26 000 DPI sensor
              </TextLink>
            </TableCell>
            <TableCell className="text-right">4</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <TextLink variant="resource" href="/admin/products/2">
                DEMO-SKU-KEYBOARD-TKL-HOTSWAP-RGB-0001
              </TextLink>
            </TableCell>
            <TableCell className="text-right">12</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Narrow>
  ),
  play: async ({ canvas }) => {
    const frame = canvas.getByTestId("narrow-frame");
    await expect(frame.scrollWidth).toBe(frame.clientWidth);
    const container = frame.querySelector<HTMLElement>("[data-slot=table-container]");
    await expect(container && container.scrollWidth).toBe(container?.clientWidth);
    const head = canvas.getByRole("columnheader", { name: "Product" });
    await expect(getComputedStyle(head).whiteSpace).toBe("nowrap");
  },
};

/**
 * A table wider than the screen: the container scrolls, and every row has a link, so the region
 * is reachable by keyboard (axe `scrollable-region-focusable`, B3.10). Tab goes through the links.
 */
export const WideOnPhone: Story = {
  render: () => (
    <Narrow>
      <Table aria-label="Order lines">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Product</TableHead>
            <TableHead scope="col">SKU</TableHead>
            <TableHead scope="col" className="text-right">
              Unit price
            </TableHead>
            <TableHead scope="col" className="text-right">
              Quantity
            </TableHead>
            <TableHead scope="col" className="text-right">
              Line total
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[
            ["Gaming headset", "DEMO-HS-01", "399,00 zł", "1", "399,00 zł"],
            ["Mouse pad XL", "DEMO-MP-02", "79,00 zł", "2", "158,00 zł"],
          ].map(([name, sku, price, quantity, total]) => (
            <TableRow key={sku}>
              <TableCell>
                <TextLink variant="resource" href={`/admin/products/${sku}`}>
                  {name}
                </TextLink>
              </TableCell>
              <TableCell className="whitespace-nowrap">{sku}</TableCell>
              <TableCell className="text-right whitespace-nowrap">{price}</TableCell>
              <TableCell className="text-right">{quantity}</TableCell>
              <TableCell className="text-right whitespace-nowrap">{total}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Narrow>
  ),
  play: async ({ canvas, userEvent }) => {
    const frame = canvas.getByTestId("narrow-frame");
    // The page stays 320 px; only the table container scrolls.
    await expect(frame.scrollWidth).toBe(frame.clientWidth);
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "Gaming headset" })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("link", { name: "Mouse pad XL" })).toHaveFocus();
  },
};

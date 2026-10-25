import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Primitives / Skeleton. Real components from `@/components/ui/skeleton`. Every skeleton is
 * `aria-hidden`; `SkeletonGroup` names the loading state once (`role="status"`, owner decision Q3).
 */
const meta = {
  title: "Primitives/Skeleton",
  component: Skeleton,
  args: { className: "h-control-md w-48" },
  argTypes: {
    className: {
      control: "text",
      description: "The size of what it replaces (`h-control-md`, `h-lh`, `aspect-square`).",
    },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Lines of text: `h-lh` takes the line height of the text style it replaces. */
export const TextLines: Story = {
  render: () => (
    <SkeletonGroup label="Loading the order…" className="flex max-w-md flex-col gap-related">
      <Skeleton className="h-lh w-3/4 type-h2" />
      <Skeleton className="h-lh w-full" />
      <Skeleton className="h-lh w-5/6" />
    </SkeletonGroup>
  ),
  play: async ({ canvas, canvasElement }) => {
    const status = canvas.getByRole("status");
    await expect(status).toHaveTextContent("Loading the order…");
    const skeletons = canvasElement.querySelectorAll("[data-slot=skeleton]");
    await expect(skeletons).toHaveLength(3);
    for (const skeleton of skeletons) await expect(skeleton).toHaveAttribute("aria-hidden", "true");
    // Store body line: 24 px.
    await expect(skeletons[1]?.getBoundingClientRect().height).toBe(24);
  },
};

/**
 * Product grid: the skeleton replaces the whole tile (`rounded-card`), never sits on the gray
 * product surface (`--muted` on `--surface-product` is 1.00 : 1 in the light theme, B3.16).
 */
export const ProductGrid: Story = {
  render: () => (
    <SkeletonGroup label="Loading products…" className="grid max-w-3xl grid-cols-3 gap-group">
      {[1, 2, 3].map((tile) => (
        <div key={tile} className="flex flex-col gap-related">
          <Skeleton className="aspect-square w-full rounded-card" />
          <Skeleton className="h-lh w-4/5" />
          <Skeleton className="h-lh w-1/3" />
          <Skeleton className="h-control-sm w-full" />
        </div>
      ))}
    </SkeletonGroup>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Loading products…");
    const tile = canvasElement.querySelector<HTMLElement>("[data-slot=skeleton]");
    await expect(tile && getComputedStyle(tile).borderTopLeftRadius).toBe("12px");
  },
};

/** Admin: rows of a table while it loads (14/20 text, 44 px rows), one status for all of it. */
export const TableRows: Story = {
  globals: { density: "admin" },
  render: () => (
    <SkeletonGroup label="Loading orders…">
      <Table aria-label="Orders">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Order</TableHead>
            <TableHead scope="col">Customer</TableHead>
            <TableHead scope="col" className="text-right">
              Total
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3].map((row) => (
            <TableRow key={row}>
              <TableCell>
                <Skeleton className="h-lh w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-lh w-40" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-lh w-16" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SkeletonGroup>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Loading orders…");
    const skeleton = canvasElement.querySelector<HTMLElement>("[data-slot=skeleton]");
    await expect(skeleton?.getBoundingClientRect().height).toBe(20);
  },
};

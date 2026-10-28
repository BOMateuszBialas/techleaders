import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  METRIC_DEFINITIONS,
  ORDER_STATUSES,
  PERIOD_COMPARISON_DEFINITION,
  aovChange,
  metricChange,
  previousPeriod,
  resolvePeriod,
  type Dashboard,
} from "@commerceos/core";
import { expect } from "storybook/test";
import { DashboardView, MetricsSkeleton } from "@/components/admin/dashboard/dashboard-view";

/**
 * Patterns / Admin / Dashboard. The dashboard body (`DashboardView`): the period switch, the
 * custom range form, the demo note, the comparison with the previous period, four metric cards
 * with their definitions, two tables, and the loading skeleton. Fictional numbers (demo data).
 */

const PERIOD = resolvePeriod("7d", new Date("2026-10-17T10:00:00.000Z"));
const PREVIOUS = previousPeriod(PERIOD);

function dashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  const counts: Record<string, number> = { paid: 2, shipped: 1, cancelled: 1 };
  return {
    period: PERIOD,
    sales: {
      period: PERIOD,
      currency: "PLN",
      definitionIds: ["paidOrders", "revenue", "aov"],
      paidOrders: 3,
      revenueMinor: 98_470,
      aovMinor: 32_823,
      otherCurrencyOrders: 0,
    },
    orders: {
      period: PERIOD,
      definitionIds: ["ordersPlaced"],
      total: 4,
      byStatus: ORDER_STATUSES.map((status) => ({ status, count: counts[status] ?? 0 })),
    },
    topProducts: {
      period: PERIOD,
      currency: "PLN",
      definitionIds: ["topProducts"],
      limit: 5,
      rows: [{ productId: "p-1", name: "Pulse Ultralight Mouse", units: 4, revenueMinor: 75_600 }],
    },
    lowStock: {
      definitionIds: ["lowStock"],
      threshold: 5,
      total: 2,
      rows: [
        {
          id: "p-2",
          slug: "titan-mmo-mouse",
          name: "Titan MMO Mouse",
          sku: null,
          stockQuantity: 0,
        },
      ],
    },
    demoOrderCount: 3,
    range: {
      firstDay: "2026-10-11",
      lastDay: "2026-10-17",
      minDay: "2000-01-01",
      maxDay: "2026-10-17",
    },
    rangeError: null,
    comparison: {
      period: PREVIOUS,
      sales: {
        period: PREVIOUS,
        currency: "PLN",
        definitionIds: ["paidOrders", "revenue", "aov"],
        paidOrders: 2,
        revenueMinor: 100_000,
        aovMinor: 50_000,
        otherCurrencyOrders: 0,
      },
      orders: {
        period: PREVIOUS,
        definitionIds: ["ordersPlaced"],
        total: 4,
        byStatus: ORDER_STATUSES.map((status) => ({ status, count: status === "paid" ? 4 : 0 })),
      },
      demoOrderCount: 0,
      changes: {
        ordersPlaced: metricChange(4, 4),
        paidOrders: metricChange(3, 2),
        revenue: metricChange(98_470, 100_000),
        aov: aovChange(32_823, 50_000),
      },
      partialHistory: false,
      includesToday: false,
    },
    definitions: METRIC_DEFINITIONS,
    comparisonDefinition: PERIOD_COMPARISON_DEFINITION,
    ...overrides,
  };
}

const EMPTY = dashboard({
  demoOrderCount: 0,
  sales: { ...dashboard().sales, paidOrders: 0, revenueMinor: 0, aovMinor: null },
  orders: {
    ...dashboard().orders,
    total: 0,
    byStatus: ORDER_STATUSES.map((status) => ({ status, count: 0 })),
  },
  topProducts: { ...dashboard().topProducts, rows: [] },
  lowStock: { ...dashboard().lowStock, total: 0, rows: [] },
});

const meta = {
  title: "Patterns/Admin/Dashboard",
  component: DashboardView,
  decorators: [
    (Story) => (
      <div data-density="admin" className="max-w-6xl p-4 md:p-6">
        <Story />
      </div>
    ),
  ],
  args: { dashboard: dashboard() },
} satisfies Meta<typeof DashboardView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A week with orders, a demo note, one out-of-stock product and the comparison line. */
export const Loaded: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("navigation", { name: "Period" })).toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "Last 7 days" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(canvas.getByText("Includes 3 seeded demo orders (fictional).")).toBeVisible();
  },
};

/** No order in the period: the next step is a link to the products, with no developer command. */
export const EmptyPeriod: Story = {
  args: { dashboard: EMPTY },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Go to products" })).toHaveAttribute(
      "href",
      "/admin/products",
    );
  },
};

/** The range is invalid: the form keeps the submitted dates and says why, in an alert. */
export const RangeError: Story = {
  args: {
    dashboard: dashboard({
      rangeError: {
        message: "The end date must not be before the start date.",
        from: "2026-10-14",
        to: "2026-10-01",
      },
    }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "The end date must not be before the start date.",
    );
  },
};

/** The loading state of the metrics: one labelled status region, no bare "Loading" text. */
export const Loading: StoryObj = {
  render: () => (
    <div data-density="admin" className="max-w-6xl p-4 md:p-6">
      <MetricsSkeleton />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Loading metrics");
  },
};

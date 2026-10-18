import {
  DEMO_TRAFFIC_METRIC_IDS,
  METRIC_DEFINITIONS,
  METRIC_IDS,
  ORDER_STATUSES,
  resolvePeriod,
  type Dashboard,
} from "@commerceos/core";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  EMPTY_LOW_STOCK,
  EMPTY_PERIOD_HINT,
  EMPTY_TOP_PRODUCTS,
  NOT_ENOUGH_DATA,
  demoOrdersNote,
  formatAov,
  isEmptyPeriod,
  lowStockCountNote,
  otherCurrencyNote,
  periodLinks,
  periodRangeLabel,
  statusBreakdown,
} from "./dashboard-copy";
import { DashboardView } from "./dashboard-view";

const NOW = new Date("2026-10-17T10:00:00.000Z");
const PERIOD = resolvePeriod("7d", NOW);

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
      rows: [
        { productId: "p-1", name: "Pulse Ultralight Mouse", units: 4, revenueMinor: 75_600 },
        { productId: null, name: "Gone pad", units: 1, revenueMinor: 1000 },
      ],
    },
    lowStock: {
      definitionIds: ["lowStock"],
      threshold: 5,
      total: 12,
      rows: [
        { id: "p-2", name: "Titan MMO Mouse", sku: "DEMO-MOU-003", stockQuantity: 0 },
        { id: "p-3", name: "Arena Fight Stick", sku: null, stockQuantity: 2 },
      ],
    },
    demoOrderCount: 0,
    definitions: METRIC_DEFINITIONS,
    ...overrides,
  };
}

const EMPTY: Dashboard = dashboard({
  sales: { ...dashboard().sales, paidOrders: 0, revenueMinor: 0, aovMinor: null },
  orders: {
    ...dashboard().orders,
    total: 0,
    byStatus: ORDER_STATUSES.map((status) => ({ status, count: 0 })),
  },
  topProducts: { ...dashboard().topProducts, rows: [] },
  lowStock: { ...dashboard().lowStock, total: 0, rows: [] },
});

function render(value: Dashboard): string {
  return renderToStaticMarkup(createElement(DashboardView, { dashboard: value }));
}

/** The markup with tags removed and whitespace collapsed, for text assertions. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;| | /g, " ")
    .replace(/\s+/g, " ");
}

describe("dashboard copy", () => {
  it("links both periods to ?period= and marks the active one", () => {
    expect(periodLinks("30d")).toEqual([
      { preset: "7d", label: "Last 7 days", href: "/admin?period=7d", current: false },
      { preset: "30d", label: "Last 30 days", href: "/admin?period=30d", current: true },
    ]);
    expect(periodRangeLabel(PERIOD)).toBe("11–17 Oct 2026 (Europe/Warsaw)");
  });

  it("mentions demo orders only when the period has any", () => {
    expect(demoOrdersNote(0)).toBeNull();
    expect(demoOrdersNote(1)).toBe("Includes 1 seeded demo order (fictional).");
    expect(demoOrdersNote(31)).toBe("Includes 31 seeded demo orders (fictional).");
  });

  it("mentions orders in other currencies only when there are any", () => {
    expect(otherCurrencyNote(0)).toBeNull();
    expect(otherCurrencyNote(1)).toBe("1 order in another currency is not included.");
    expect(otherCurrencyNote(2)).toBe("2 orders in other currencies are not included.");
  });

  it("shows AOV as an amount, or Not enough data without paid orders", () => {
    expect(formatAov(null, "PLN")).toBe(NOT_ENOUGH_DATA);
    expect(text(formatAov(32_823, "PLN"))).toBe("328,23 zł");
  });

  it("lists only the statuses that occur, in workflow order", () => {
    expect(statusBreakdown(dashboard())).toEqual([
      { status: "paid", text: "Paid: 2" },
      { status: "shipped", text: "Shipped: 1" },
      { status: "cancelled", text: "Cancelled: 1" },
    ]);
  });

  it("knows an empty period and a cut low-stock list", () => {
    expect(isEmptyPeriod(EMPTY)).toBe(true);
    expect(isEmptyPeriod(dashboard())).toBe(false);
    expect(
      isEmptyPeriod(
        dashboard({ orders: { ...EMPTY.orders }, sales: { ...dashboard().sales, paidOrders: 1 } }),
      ),
    ).toBe(false);
    expect(lowStockCountNote(10, 12)).toBe("Showing 10 of 12.");
    expect(lowStockCountNote(2, 2)).toBeNull();
  });
});

describe("DashboardView", () => {
  it("prints every metric with its definition from METRIC_DEFINITIONS", () => {
    const html = render(dashboard());
    for (const id of METRIC_IDS) {
      expect(html).toContain(`data-metric="${id}"`);
      expect(text(html)).toContain(METRIC_DEFINITIONS[id].label);
      expect(html).toContain(METRIC_DEFINITIONS[id].definition.replace(/"/g, "&quot;"));
    }
  });

  it("shows the values, the range, the status split, top products and low stock", () => {
    const html = render(dashboard());
    const body = text(html);

    expect(body).toContain("11–17 Oct 2026 (Europe/Warsaw)");
    const links = html.match(/<a [^>]*href="\/admin\?period=[^"]+"[^>]*>/g) ?? [];
    expect(links).toHaveLength(2);
    expect(links[0]).toContain('aria-current="page"');
    expect(links[1]).not.toContain("aria-current");
    expect(body).toContain("984,70 zł");
    expect(body).toContain("328,23 zł");
    expect(body).toContain("Paid: 2");
    expect(body).toContain("Pulse Ultralight Mouse 4 756,00 zł");
    expect(body).toContain("Gone pad (deleted product)");
    expect(html).toContain('href="/admin/products/p-2"');
    expect(body).toContain("Titan MMO Mouse 0 Out of stock");
    expect(body).toContain("Arena Fight Stick 2");
    expect(body).toContain("Showing 2 of 12.");
    expect(body).not.toContain("seeded demo");
    expect(body).not.toContain("other currenc");
    expect(body).not.toContain(EMPTY_PERIOD_HINT);
  });

  it("adds the demo-orders and other-currency notes when they apply", () => {
    const body = text(
      render(
        dashboard({
          demoOrderCount: 31,
          sales: { ...dashboard().sales, otherCurrencyOrders: 2 },
        }),
      ),
    );
    expect(body).toContain("Includes 31 seeded demo orders (fictional).");
    expect(body).toContain("2 orders in other currencies are not included.");
  });

  it("shows the empty states and Not enough data for an empty period", () => {
    const body = text(render(EMPTY));

    expect(body).toContain(NOT_ENOUGH_DATA);
    expect(body).toContain("0,00 zł");
    expect(body).toContain(EMPTY_TOP_PRODUCTS);
    expect(body).toContain(EMPTY_LOW_STOCK);
    expect(body).toContain(EMPTY_PERIOD_HINT);
    expect(body).not.toContain("Showing");
  });
});

describe("README metric definitions", () => {
  it("mirror METRIC_DEFINITIONS word for word", () => {
    const readme = readFileSync(new URL("../../../../../../README.md", import.meta.url), "utf8");
    for (const id of [...METRIC_IDS, ...DEMO_TRAFFIC_METRIC_IDS]) {
      const { label, definition } = METRIC_DEFINITIONS[id];
      expect(readme).toContain(`| ${label} | ${definition} |`);
    }
  });
});

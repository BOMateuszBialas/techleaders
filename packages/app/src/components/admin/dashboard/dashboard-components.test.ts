import {
  DEMO_TRAFFIC_METRIC_IDS,
  METRIC_DEFINITIONS,
  METRIC_IDS,
  ORDER_STATUSES,
  PERIOD_COMPARISON_DEFINITION,
  aovChange,
  metricChange,
  previousPeriod,
  resolveCustomPeriod,
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
  NOT_COMPARED,
  NOT_ENOUGH_DATA,
  NOT_ENOUGH_DATA_TO_COMPARE,
  TODAY_NOTE,
  changeText,
  comparisonHeader,
  comparisonNotes,
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

function withComparison(overrides: Partial<Dashboard["comparison"]>): Dashboard {
  return dashboard({ comparison: { ...dashboard().comparison, ...overrides } });
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

describe("comparison copy (date-range spec)", () => {
  const count = (value: number) => String(value);

  it("names the previous range and its length", () => {
    expect(comparisonHeader(PREVIOUS)).toBe("Compared with 4–10 Oct 2026, the previous 7 days.");
    expect(comparisonHeader(resolveCustomPeriod("2026-10-16", "2026-10-16"))).toBe(
      "Compared with 16 Oct 2026, the previous day.",
    );
  });

  it("says the change in words, with a signed whole percent", () => {
    expect(changeText(metricChange(14, 12), count)).toBe("Up 2 (+17%) from 12");
    expect(changeText(metricChange(9, 12), count)).toBe("Down 3 (−25%) from 12");
    expect(changeText(metricChange(12, 12), count)).toBe("No change from 12");
    expect(changeText(metricChange(3, 0), count)).toBe(
      "Up 3 from 0 (no % change: the previous period had none)",
    );
    expect(changeText(metricChange(14, 12, { withPercent: false }), count)).toBe("Up 2 from 12");
    expect(changeText(null, count)).toBe(NOT_ENOUGH_DATA_TO_COMPARE);
  });

  it("lists only the comparison notes that apply", () => {
    expect(comparisonNotes(dashboard())).toEqual([]);
    const previousSales = { ...dashboard().comparison.sales, otherCurrencyOrders: 1 };
    expect(
      comparisonNotes(
        withComparison({
          includesToday: true,
          partialHistory: true,
          demoOrderCount: 1,
          sales: previousSales,
        }),
      ),
    ).toEqual([
      TODAY_NOTE,
      "No order was placed before 4 Oct 2026, so the previous period may include days before the store started selling; percentages are not shown.",
      "The previous period includes 1 seeded demo order (fictional).",
      "In the previous period, 1 order in another currency is not included.",
    ]);
    expect(
      comparisonNotes(
        withComparison({
          demoOrderCount: 15,
          sales: { ...previousSales, otherCurrencyOrders: 2 },
        }),
      ),
    ).toEqual([
      "The previous period includes 15 seeded demo orders (fictional).",
      "In the previous period, 2 orders in other currencies are not included.",
    ]);
  });

  it("marks no preset link as current for a custom range", () => {
    expect(periodLinks("custom").every((link) => !link.current)).toBe(true);
  });
});

describe("DashboardView comparison", () => {
  it("adds a comparison line to the four compared cards and keeps metric-value bare", () => {
    const html = render(dashboard());
    const body = text(html);

    expect(body).toContain("Compared with 4–10 Oct 2026, the previous 7 days.");
    expect(body).toContain(PERIOD_COMPARISON_DEFINITION);
    expect(body).toContain("No change from 4");
    expect(body).toContain("Up 1 (+50%) from 2");
    expect(body).toContain("Down 15,30 zł (−2%) from 1000,00 zł");
    expect(body).toContain("Down 171,77 zł (−34%) from 500,00 zł");
    expect(html.match(/data-testid="metric-change"/g)).toHaveLength(6);
    expect(body.split(NOT_COMPARED)).toHaveLength(3);
    const values = [...html.matchAll(/data-testid="metric-value"[^>]*>([^<]*)</g)].map((match) =>
      text(match[1] ?? ""),
    );
    expect(values).toEqual(["4", "3", "984,70 zł", "328,23 zł", "12"]);
  });

  it("says Not enough data to compare for AOV without paid orders", () => {
    const changes = { ...dashboard().comparison.changes, aov: null };
    expect(text(render(withComparison({ changes })))).toContain(NOT_ENOUGH_DATA_TO_COMPARE);
  });

  it("renders the range form with the shown days and its bounds", () => {
    const html = render(dashboard());

    const form = html.match(/<form[^>]*>/)?.[0] ?? "";
    expect(form).toContain('method="get"');
    expect(form).toContain('action="/admin"');
    const from = html.match(/<input[^>]*id="range-from"[^>]*>/)?.[0] ?? "";
    expect(from).toContain('name="from"');
    expect(from).toContain('type="date"');
    expect(from).toContain('value="2026-10-11"');
    expect(from).toContain('min="2000-01-01"');
    expect(from).toContain('max="2026-10-17"');
    expect(from).not.toContain('aria-invalid="');
    expect(html).toContain('for="range-to"');
    expect(html).not.toContain('role="alert"');
  });

  it("shows an invalid range as an alert, refilled with the submitted values", () => {
    const html = render(
      dashboard({
        rangeError: {
          message: "The end date must not be before the start date.",
          from: "2026-10-14",
          to: "2026-10-01",
        },
      }),
    );

    expect(text(html)).toContain(
      "The end date must not be before the start date. Showing the preset period instead.",
    );
    const to = html.match(/<input[^>]*id="range-to"[^>]*>/)?.[0] ?? "";
    expect(to).toContain('value="2026-10-01"');
    expect(to).toContain('aria-invalid="true"');
    expect(to).toContain('aria-describedby="range-error"');
    expect(html).toContain('id="range-error" role="alert"');
  });

  it("marks no preset as current for a custom range", () => {
    const custom = resolveCustomPeriod("2026-10-01", "2026-10-14");
    const html = render(dashboard({ period: custom }));

    expect(html).not.toContain('aria-current="page"');
    expect(text(html)).toContain("1–14 Oct 2026 (Europe/Warsaw)");
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

describe("README comparison definition", () => {
  it("mirrors PERIOD_COMPARISON_DEFINITION word for word", () => {
    const readme = readFileSync(new URL("../../../../../../README.md", import.meta.url), "utf8");
    expect(readme).toContain(PERIOD_COMPARISON_DEFINITION);
  });
});

describe("DashboardView comparison notes", () => {
  it("prints the notes that apply under the comparison header", () => {
    const html = render(withComparison({ includesToday: true, demoOrderCount: 2 }));

    expect(html.match(/data-testid="comparison-note"/g)).toHaveLength(2);
    expect(text(html)).toContain(TODAY_NOTE);
    expect(text(html)).toContain("The previous period includes 2 seeded demo orders (fictional).");
  });
});

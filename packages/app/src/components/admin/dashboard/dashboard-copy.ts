import {
  LOW_STOCK_THRESHOLD,
  METRIC_PERIOD_LABELS,
  METRIC_PERIOD_PRESETS,
  formatMoney,
  money,
  type CurrencyCode,
  type Dashboard,
  type MetricPeriod,
  type MetricPeriodPreset,
} from "@commerceos/core";
import { orderStatusLabel } from "@/components/checkout/checkout-copy";

/**
 * Owner-facing copy for the admin dashboard (orders spec, Phase 3, UI/UX). The metric labels and
 * definitions themselves come from `METRIC_DEFINITIONS` in core, never from here.
 */

export const DASHBOARD_UNAVAILABLE_MESSAGE =
  "Store metrics are unavailable right now. Check the server logs and try again.";
export const NOT_ENOUGH_DATA = "Not enough data";
export const EMPTY_TOP_PRODUCTS = "No paid orders in this period.";
export const EMPTY_LOW_STOCK = `No published product is at or below ${LOW_STOCK_THRESHOLD} in stock.`;
export const EMPTY_STORE_HINT =
  "No orders yet. Orders appear here after a checkout. To load the demo store, run npm run db:seed.";
export const OUT_OF_STOCK_BADGE = "Out of stock";

export type PeriodLink = {
  preset: MetricPeriodPreset;
  label: string;
  href: string;
  current: boolean;
};

/** The period switch: "Last 7 days" / "Last 30 days", the active one marked current. */
export function periodLinks(active: MetricPeriodPreset): PeriodLink[] {
  return METRIC_PERIOD_PRESETS.map((preset) => ({
    preset,
    label: METRIC_PERIOD_LABELS[preset],
    href: `/admin?period=${preset}`,
    current: preset === active,
  }));
}

/** "11–17 Oct 2026 (Europe/Warsaw)". */
export function periodRangeLabel(period: MetricPeriod): string {
  return `${period.label} (${period.timeZone})`;
}

/** "Includes 3 seeded demo orders (fictional)." when the period has any (A14), else null. */
export function demoOrdersNote(count: number): string | null {
  if (count === 0) return null;
  return count === 1
    ? "Includes 1 seeded demo order (fictional)."
    : `Includes ${count} seeded demo orders (fictional).`;
}

/** "2 orders in other currencies are not included." when there are any (A10), else null. */
export function otherCurrencyNote(count: number): string | null {
  if (count === 0) return null;
  return count === 1
    ? "1 order in another currency is not included."
    : `${count} orders in other currencies are not included.`;
}

/** True when the period has no order at all: the dashboard then shows how to get some. */
export function isEmptyPeriod(dashboard: Dashboard): boolean {
  return dashboard.orders.total === 0 && dashboard.sales.paidOrders === 0;
}

export function formatAmount(amountMinor: number, currency: CurrencyCode): string {
  return formatMoney(money(amountMinor, currency));
}

/** The AOV card value: an amount, or "Not enough data" without paid orders (#23 AC3). */
export function formatAov(aovMinor: number | null, currency: CurrencyCode): string {
  return aovMinor === null ? NOT_ENOUGH_DATA : formatAmount(aovMinor, currency);
}

/** "Paid: 2", for the statuses that occur in the period, in workflow order. */
export function statusBreakdown(dashboard: Dashboard): { status: string; text: string }[] {
  return dashboard.orders.byStatus
    .filter((row) => row.count > 0)
    .map((row) => ({ status: row.status, text: `${orderStatusLabel(row.status)}: ${row.count}` }));
}

/** "Showing 10 of 12." when the low-stock list is cut, else null. */
export function lowStockCountNote(shown: number, total: number): string | null {
  return total > shown ? `Showing ${shown} of ${total}.` : null;
}

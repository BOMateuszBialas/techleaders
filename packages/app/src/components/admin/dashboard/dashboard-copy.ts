import {
  LOW_STOCK_THRESHOLD,
  METRIC_PERIOD_LABELS,
  METRIC_PERIOD_PRESETS,
  formatIsoDay,
  formatMoney,
  money,
  periodCalendarDays,
  periodDays,
  type CurrencyCode,
  type Dashboard,
  type DashboardPeriod,
  type MetricChange,
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
/** The period has no order at all (the store may still have older ones). OA-5: no developer command. */
export const EMPTY_PERIOD_HINT = "No orders in this period. Orders appear here after a checkout.";
/** The next step for an empty period (Q2): a link to the product list. */
export const EMPTY_PERIOD_ACTION = "Go to products";
export const OUT_OF_STOCK_BADGE = "Out of stock";

export type PeriodLink = {
  preset: MetricPeriodPreset;
  label: string;
  href: string;
  current: boolean;
};

/** The period switch: "Last 7 days" / "Last 30 days", the active one marked current. */
export function periodLinks(active: DashboardPeriod["preset"]): PeriodLink[] {
  return METRIC_PERIOD_PRESETS.map((preset) => ({
    preset,
    label: METRIC_PERIOD_LABELS[preset],
    href: `/admin?period=${preset}`,
    current: preset === active,
  }));
}

/**
 * "11–17 Oct 2026 (Europe/Warsaw)", or "Custom range: 1–14 Oct 2026 (Europe/Warsaw)" when no
 * preset is active (date-range spec UI/UX), so the page says which kind of period it shows.
 */
export function periodRangeLabel(period: DashboardPeriod): string {
  const range = `${period.label} (${period.timeZone})`;
  return period.preset === "custom" ? `${RANGE_FORM_LEGEND}: ${range}` : range;
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

/* Comparison with the previous period (date-range spec, UI/UX). */

export const NOT_COMPARED = "Not compared with the previous period.";
export const NOT_ENOUGH_DATA_TO_COMPARE = "Not enough data to compare";
export const TODAY_NOTE =
  "Today is not over yet, so this period has fewer hours of sales than the previous one.";
export const RANGE_FORM_LEGEND = "Custom range";

/** "Compared with 4–10 Oct 2026, the previous 7 days." */
export function comparisonHeader(previous: DashboardPeriod): string {
  const days = periodDays(previous);
  const length = days === 1 ? "the previous day" : `the previous ${days} days`;
  return `Compared with ${previous.label}, ${length}.`;
}

/** "+17%" or "−25%" (a real minus sign). */
function signedPercent(percent: number): string {
  return percent < 0 ? `−${Math.abs(percent)}%` : `+${percent}%`;
}

/**
 * One comparison line, in words so direction never depends on colour: "Up 2 (+17%) from 12",
 * "No change from 12", "Up 3 from 0 (no % change: the previous period had none)". With partial
 * history the percentage is withheld and the page note says why.
 */
export function changeText(change: MetricChange | null, format: (value: number) => string): string {
  if (change === null) return NOT_ENOUGH_DATA_TO_COMPARE;
  const previous = format(change.previous);
  if (change.direction === "same") return `No change from ${previous}`;
  const word = change.direction === "up" ? "Up" : "Down";
  const amount = format(Math.abs(change.delta));
  if (change.percent !== null) {
    return `${word} ${amount} (${signedPercent(change.percent)}) from ${previous}`;
  }
  if (change.previous === 0) {
    return `${word} ${amount} from ${previous} (no % change: the previous period had none)`;
  }
  return `${word} ${amount} from ${previous}`;
}

/** The notes under the comparison header, in display order; empty when none applies. */
export function comparisonNotes(dashboard: Dashboard): string[] {
  const { comparison } = dashboard;
  const notes: string[] = [];
  if (comparison.includesToday) notes.push(TODAY_NOTE);
  if (comparison.partialHistory) {
    const { firstDay } = periodCalendarDays(comparison.period);
    notes.push(
      `No order was placed before ${formatIsoDay(firstDay)}, so the previous period may include days before the store started selling; percentages are not shown.`,
    );
  }
  const demo = comparison.demoOrderCount;
  if (demo > 0) {
    notes.push(
      demo === 1
        ? "The previous period includes 1 seeded demo order (fictional)."
        : `The previous period includes ${demo} seeded demo orders (fictional).`,
    );
  }
  const other = comparison.sales.otherCurrencyOrders;
  if (other > 0) {
    notes.push(
      other === 1
        ? "In the previous period, 1 order in another currency is not included."
        : `In the previous period, ${other} orders in other currencies are not included.`,
    );
  }
  return notes;
}

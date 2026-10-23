/**
 * Metric periods (orders spec A9): whole calendar days in the store time zone, today included,
 * as a half-open `[from, to)` range of instants at local midnights. Each midnight is computed
 * on its own, so a range across a DST switch is still exact. Since the date-range spec the
 * dashboard also accepts a custom range of whole days (`resolveCustomPeriod`).
 */

export const STORE_TIME_ZONE = "Europe/Warsaw";

export const METRIC_PERIOD_PRESETS = ["7d", "30d"] as const;
export type MetricPeriodPreset = (typeof METRIC_PERIOD_PRESETS)[number];
export const DEFAULT_METRIC_PERIOD: MetricPeriodPreset = "7d";

const PRESET_DAYS: Readonly<Record<MetricPeriodPreset, number>> = { "7d": 7, "30d": 30 };

export const METRIC_PERIOD_LABELS: Readonly<Record<MetricPeriodPreset, string>> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

/** "Now", injected so tests fix the date (the container registers `() => new Date()`). */
export type Clock = () => Date;

/** Whole store days as a half-open range of instants, with the days named for people. */
export type LabelledMetricRange = {
  /** First instant of the period (local midnight of its first day). */
  from: Date;
  /** First instant after the period (local midnight after its last day). */
  to: Date;
  /** The covered days, e.g. "11–17 Oct 2026". */
  label: string;
  timeZone: string;
};

/** A preset period ending today: what the Copilot and the dashboard presets use. */
export type MetricPeriod = LabelledMetricRange & { preset: MetricPeriodPreset };

/**
 * A dashboard period (date-range spec): a preset, or a custom range of whole days chosen by the
 * owner. Only the dashboard accepts `"custom"`; the Copilot keeps `MetricPeriod`.
 */
export type DashboardPeriod = LabelledMetricRange & { preset: MetricPeriodPreset | "custom" };

type CalendarDay = { year: number; month: number; day: number };

const DAY_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: STORE_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});

/** Fixed English month names: ICU versions differ ("Sep" or "Sept"), labels must not. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const FIELD_NAMES = ["year", "month", "day", "hour", "minute", "second"] as const;
type WallClock = Record<(typeof FIELD_NAMES)[number], number>;

function isField(type: string): type is keyof WallClock {
  return (FIELD_NAMES as readonly string[]).includes(type);
}

/** The wall-clock fields of `instant` in the store time zone. */
function localParts(instant: Date): WallClock {
  const fields: WallClock = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
  for (const { type, value } of DAY_PARTS.formatToParts(instant)) {
    if (isField(type)) fields[type] = Number(value);
  }
  return fields;
}

/** How far the store's wall clock is ahead of UTC at `instant`, in milliseconds. */
function offsetAt(instant: number): number {
  const p = localParts(new Date(instant));
  const wallClock = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallClock - Math.floor(instant / 1000) * 1000;
}

/** The instant of local midnight at the start of `day` (Warsaw never switches at midnight). */
function localMidnight(day: CalendarDay): Date {
  const wallClock = Date.UTC(day.year, day.month - 1, day.day);
  const guess = wallClock - offsetAt(wallClock);
  return new Date(wallClock - offsetAt(guess));
}

/** The calendar day `days` after `day` (negative goes back); plain date arithmetic in UTC. */
function addDays(day: CalendarDay, days: number): CalendarDay {
  const date = new Date(Date.UTC(day.year, day.month - 1, day.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/** Whole days from `first` to `last`, both included (1 for the same day). */
function inclusiveDays(first: CalendarDay, last: CalendarDay): number {
  const utc = (day: CalendarDay) => Date.UTC(day.year, day.month - 1, day.day);
  return Math.round((utc(last) - utc(first)) / 86_400_000) + 1;
}

function today(now: Date): CalendarDay {
  const { year, month, day } = localParts(now);
  return { year, month, day };
}

/** "11 Oct 2026". */
function formatDay(day: CalendarDay): string {
  return `${day.day} ${MONTHS[day.month - 1]} ${day.year}`;
}

/** "11–17 Oct 2026", "18 Sep – 17 Oct 2026", "25 Dec 2025 – 7 Jan 2026" or "17 Oct 2026". */
function formatDayRange(first: CalendarDay, last: CalendarDay): string {
  const dayMonth = (day: CalendarDay) => `${day.day} ${MONTHS[day.month - 1]}`;
  const full = formatDay(last);
  if (first.year !== last.year) return `${dayMonth(first)} ${first.year} – ${full}`;
  if (first.month !== last.month) return `${dayMonth(first)} – ${full}`;
  if (first.day === last.day) return full;
  return `${first.day}–${full}`;
}

/** The first and last calendar day of a period (`to` is the midnight after the last day). */
function periodBounds(period: LabelledMetricRange): { first: CalendarDay; last: CalendarDay } {
  return { first: today(period.from), last: today(new Date(period.to.getTime() - 1)) };
}

/** The period of `preset` that ends today (store time zone) at `now`. */
export function resolvePeriod(preset: MetricPeriodPreset, now: Date): MetricPeriod {
  const last = today(now);
  const first = addDays(last, 1 - PRESET_DAYS[preset]);
  return {
    preset,
    from: localMidnight(first),
    to: localMidnight(addDays(last, 1)),
    label: formatDayRange(first, last),
    timeZone: STORE_TIME_ZONE,
  };
}

/** `"2026-10-11"`: an ISO calendar date. */
function isoDay(day: CalendarDay): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${day.year}-${pad(day.month)}-${pad(day.day)}`;
}

/** The calendar day of an ISO date, or null when it is not one (`2026-02-30`, `abc`). */
function parseIsoDay(value: string): CalendarDay | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const day = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  return isoDay(addDays(day, 0)) === value ? day : null;
}

/** True for a real calendar date written `YYYY-MM-DD`. */
export function isIsoDay(value: string): boolean {
  return parseIsoDay(value) !== null;
}

function calendarDay(value: string): CalendarDay {
  const day = parseIsoDay(value);
  if (day === null) throw new Error(`Not an ISO calendar date: ${value}`);
  return day;
}

/** Today's date in the store time zone, as `YYYY-MM-DD`. */
export function storeToday(now: Date): string {
  return isoDay(today(now));
}

/** How many days `firstDay`–`lastDay` covers, both included (ISO dates, `firstDay ≤ lastDay`). */
export function countDays(firstDay: string, lastDay: string): number {
  return inclusiveDays(calendarDay(firstDay), calendarDay(lastDay));
}

/** "6 Oct 2026" for `"2026-10-06"`. */
export function formatIsoDay(value: string): string {
  return formatDay(calendarDay(value));
}

/**
 * A custom dashboard period of whole store days, both ends included (date-range spec). The
 * caller validates the dates first (`parseDashboardRange`); an invalid one throws.
 */
export function resolveCustomPeriod(firstDay: string, lastDay: string): DashboardPeriod {
  const first = calendarDay(firstDay);
  const last = calendarDay(lastDay);
  return {
    preset: "custom",
    from: localMidnight(first),
    to: localMidnight(addDays(last, 1)),
    label: formatDayRange(first, last),
    timeZone: STORE_TIME_ZONE,
  };
}

/** How many calendar days a period covers. */
export function periodDays(period: LabelledMetricRange): number {
  const { first, last } = periodBounds(period);
  return inclusiveDays(first, last);
}

/**
 * The period of the same number of days that ends where `period` starts (Copilot spec A8,
 * date-range spec A2): the "previous 7 days" a change is compared with. Built from local
 * calendar days, so it is exact across a DST switch too. Keeps every other field of `period`.
 */
export function previousRange<P extends LabelledMetricRange>(period: P): P {
  const { first } = periodBounds(period);
  const previousFirst = addDays(first, -periodDays(period));
  return {
    ...period,
    from: localMidnight(previousFirst),
    to: period.from,
    label: formatDayRange(previousFirst, addDays(first, -1)),
  };
}

/** `previousRange` of a preset period (the Copilot's `sales_change`). */
export function previousPeriod(period: MetricPeriod): MetricPeriod {
  return previousRange(period);
}

/**
 * The store-time-zone calendar days a period covers, both ends included, as ISO dates: how the
 * demo traffic tables, stored per local day, are filtered for the same period (Copilot spec
 * Phase 3). `to` is the local midnight after the last day, so the last day is the one before it.
 */
export function periodCalendarDays(period: LabelledMetricRange): {
  firstDay: string;
  lastDay: string;
} {
  const { first, last } = periodBounds(period);
  return { firstDay: isoDay(first), lastDay: isoDay(last) };
}

/**
 * Average order value in whole minor units, rounded half up (A8): `null` when there are no paid
 * orders ("Not enough data"). Integer arithmetic only: ⌊(2·revenue + n) / 2n⌋.
 */
export function averageOrderValue(revenueMinor: number, paidOrders: number): number | null {
  if (paidOrders === 0) return null;
  return Math.floor((2 * revenueMinor + paidOrders) / (2 * paidOrders));
}

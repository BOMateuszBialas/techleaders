/**
 * Metric periods (orders spec A9): whole calendar days in the store time zone, today included,
 * as a half-open `[from, to)` range of instants at local midnights. Each midnight is computed
 * on its own, so a range across a DST switch is still exact.
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

export type MetricPeriod = {
  preset: MetricPeriodPreset;
  /** First instant of the period (local midnight of its first day). */
  from: Date;
  /** First instant after the period (local midnight after today). */
  to: Date;
  /** The covered days, e.g. "11–17 Oct 2026". */
  label: string;
  timeZone: string;
};

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

function today(now: Date): CalendarDay {
  const { year, month, day } = localParts(now);
  return { year, month, day };
}

/** "11–17 Oct 2026", "18 Sep – 17 Oct 2026" or "25 Dec 2025 – 7 Jan 2026". */
function formatDayRange(first: CalendarDay, last: CalendarDay): string {
  const dayMonth = (day: CalendarDay) => `${day.day} ${MONTHS[day.month - 1]}`;
  const full = `${dayMonth(last)} ${last.year}`;
  if (first.year !== last.year) return `${dayMonth(first)} ${first.year} – ${full}`;
  if (first.month !== last.month) return `${dayMonth(first)} – ${full}`;
  return `${first.day}–${full}`;
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

/**
 * The period of the same length that ends where `period` starts (Copilot spec A8): the
 * "previous 7 days" a sales change is compared with. Built from local calendar days, so it is
 * exact across a DST switch too.
 */
export function previousPeriod(period: MetricPeriod): MetricPeriod {
  const first = today(period.from);
  const previousFirst = addDays(first, -PRESET_DAYS[period.preset]);
  return {
    preset: period.preset,
    from: localMidnight(previousFirst),
    to: period.from,
    label: formatDayRange(previousFirst, addDays(first, -1)),
    timeZone: period.timeZone,
  };
}

/**
 * Average order value in whole minor units, rounded half up (A8): `null` when there are no paid
 * orders ("Not enough data"). Integer arithmetic only: ⌊(2·revenue + n) / 2n⌋.
 */
export function averageOrderValue(revenueMinor: number, paidOrders: number): number | null {
  if (paidOrders === 0) return null;
  return Math.floor((2 * revenueMinor + paidOrders) / (2 * paidOrders));
}

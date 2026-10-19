import { z } from "zod";
import {
  countDays,
  formatIsoDay,
  isIsoDay,
  type MetricPeriodPreset,
} from "../../domain/metrics/metric-period";
import { parseMetricPeriod } from "./metric-query.schema";

/** The earliest day a custom range may start (date-range spec A6). */
export const MIN_DASHBOARD_DAY = "2000-01-01";
/** The longest custom range, in days (A6). */
export const MAX_DASHBOARD_RANGE_DAYS = 366;

export const DASHBOARD_RANGE_MESSAGES = {
  bothRequired: "Choose both a start date and an end date.",
  notADate: "Enter real dates as YYYY-MM-DD.",
  endBeforeStart: "The end date must not be before the start date.",
  future: "The end date must not be after today.",
  tooEarly: `The start date must be on or after ${formatIsoDay(MIN_DASHBOARD_DAY)}.`,
  tooLong: `Choose a range of at most ${MAX_DASHBOARD_RANGE_DAYS} days.`,
} as const;

/** What `/admin` shows: a preset, a valid custom range, or the preset fallback with an error. */
export type DashboardRangeSelection =
  | { kind: "preset"; preset: MetricPeriodPreset }
  | { kind: "custom"; firstDay: string; lastDay: string }
  | {
      kind: "invalid";
      message: string;
      fallback: MetricPeriodPreset;
      /** The submitted values, cut to a date's length, to refill the form. */
      submitted: { from: string; to: string };
    };

const isoDaySchema = z.string().refine(isIsoDay, DASHBOARD_RANGE_MESSAGES.notADate);

/** A custom range of whole days ending no later than `today` (A6); the first issue wins. */
export function dashboardRangeSchema(today: string) {
  return z.object({ from: isoDaySchema, to: isoDaySchema }).superRefine(({ from, to }, ctx) => {
    // Zod 4 runs this even when a field failed; a malformed date is already reported.
    if (!isIsoDay(from) || !isIsoDay(to)) return;
    // ISO dates compare correctly as strings.
    const issue = (message: string) => ctx.addIssue({ code: "custom", message });
    if (to < from) issue(DASHBOARD_RANGE_MESSAGES.endBeforeStart);
    else if (to > today) issue(DASHBOARD_RANGE_MESSAGES.future);
    else if (from < MIN_DASHBOARD_DAY) issue(DASHBOARD_RANGE_MESSAGES.tooEarly);
    else if (countDays(from, to) > MAX_DASHBOARD_RANGE_DAYS)
      issue(DASHBOARD_RANGE_MESSAGES.tooLong);
  });
}

/** The first value of a search parameter, as a string ("" when absent). */
function firstValue(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Parses the untrusted `period`, `from` and `to` search parameters of `/admin` (A6–A8). A valid
 * `from`/`to` pair wins over `period`; neither present means the preset; anything else is an
 * invalid selection that falls back to the preset and carries the message. Never throws.
 */
export function parseDashboardRange(
  raw: { period?: unknown; from?: unknown; to?: unknown },
  today: string,
): DashboardRangeSelection {
  const preset = parseMetricPeriod(raw.period);
  const from = firstValue(raw.from);
  const to = firstValue(raw.to);
  if (from === "" && to === "") return { kind: "preset", preset };

  const invalid = (message: string): DashboardRangeSelection => ({
    kind: "invalid",
    message,
    fallback: preset,
    submitted: { from: from.slice(0, 10), to: to.slice(0, 10) },
  });
  if (from === "" || to === "") return invalid(DASHBOARD_RANGE_MESSAGES.bothRequired);

  const result = dashboardRangeSchema(today).safeParse({ from, to });
  if (!result.success) {
    // Both dates malformed give the same message twice; say it once.
    const messages = new Set(result.error.issues.map((issue) => issue.message));
    return invalid([...messages].join(" "));
  }
  return { kind: "custom", firstDay: result.data.from, lastDay: result.data.to };
}

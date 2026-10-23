/**
 * The change of a metric between a period and the previous period of the same length
 * (date-range spec A5). One rule for the dashboard and, after the follow-up, the Copilot, whose
 * `sales_change` facts already round the same way.
 */

export type ChangeDirection = "up" | "down" | "same";

export type MetricChange = {
  current: number;
  previous: number;
  /** `current − previous`, in the metric's unit (minor units for money). */
  delta: number;
  /**
   * Whole percent of the change, `null` when there is no base (previous value 0) or when
   * percentages are withheld (partial history, A9).
   */
  percent: number | null;
  direction: ChangeDirection;
};

/** Whole percent of the change, `null` when the previous value is 0 (no base to compare). */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export type ChangeOptions = {
  /** False when the comparison period may predate the store (A9): absolute change only. */
  withPercent: boolean;
};

export function metricChange(
  current: number,
  previous: number,
  options: ChangeOptions = { withPercent: true },
): MetricChange {
  const delta = current - previous;
  return {
    current,
    previous,
    delta,
    percent: options.withPercent ? percentChange(current, previous) : null,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "same",
  };
}

/** AOV change, or `null` ("Not enough data to compare") when either period has no paid orders. */
export function aovChange(
  current: number | null,
  previous: number | null,
  options: ChangeOptions = { withPercent: true },
): MetricChange | null {
  if (current === null || previous === null) return null;
  return metricChange(current, previous, options);
}

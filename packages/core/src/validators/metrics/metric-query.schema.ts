import { z } from "zod";
import { LOW_STOCK_THRESHOLD, TOP_PRODUCTS_LIMIT } from "../../domain/metrics/metric-definitions";
import {
  DEFAULT_METRIC_PERIOD,
  METRIC_PERIOD_PRESETS,
  type MetricPeriodPreset,
} from "../../domain/metrics/metric-period";

/** How many low-stock rows the dashboard lists (the card also shows the total count). */
export const LOW_STOCK_LIST_LIMIT = 10;

/** `?period=7d|30d`; anything else (missing, unknown, repeated garbage) means "Last 7 days". */
export const metricPeriodSchema = z.enum(METRIC_PERIOD_PRESETS).catch(DEFAULT_METRIC_PERIOD);

/** Parses an untrusted `period` value (a URL parameter or a tool argument). Never throws. */
export function parseMetricPeriod(raw: unknown): MetricPeriodPreset {
  return metricPeriodSchema.parse(Array.isArray(raw) ? raw[0] : raw);
}

/** Low-stock query (A11): the threshold is a parameter, not configuration. */
export const lowStockQuerySchema = z.object({
  threshold: z.int().min(1).max(1000).default(LOW_STOCK_THRESHOLD),
  limit: z.int().min(1).max(50).default(LOW_STOCK_LIST_LIMIT),
});
export type LowStockQuery = z.infer<typeof lowStockQuerySchema>;

export const topProductsQuerySchema = z.object({
  limit: z.int().min(1).max(50).default(TOP_PRODUCTS_LIMIT),
});
export type TopProductsQuery = z.infer<typeof topProductsQuerySchema>;

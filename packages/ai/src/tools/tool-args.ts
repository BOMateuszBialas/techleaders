import { METRIC_PERIOD_PRESETS } from "@commerceos/core";
import { z } from "zod";

/**
 * Tool arguments are validated even though today's plans are fixed (Copilot spec, Modules): a
 * later tool-calling loop must not be able to pass anything the use cases would not accept.
 * The period is resolved once per question by `AskCopilotUseCase`, so every tool of one
 * answer covers exactly the same instants.
 */
export const toolPeriodSchema = z
  .object({
    preset: z.enum(METRIC_PERIOD_PRESETS),
    from: z.date(),
    to: z.date(),
    label: z.string().min(1),
    timeZone: z.string().min(1),
  })
  .refine((period) => period.from.getTime() < period.to.getTime(), {
    message: "The period must end after it starts.",
  });

/** How many rows a ranked tool may return (Copilot spec: `limit` 1–10). */
export const toolLimitSchema = z.int().min(1).max(10);

/** A low-stock threshold (1–1000, as `GetLowStockProductsUseCase` accepts). */
export const toolThresholdSchema = z.int().min(1).max(1000);

import type { RateLimiterPort } from "@commerceos/core";

/**
 * Store-wide: 100 LLM answers or drafts per day (Copilot spec A4, as amended by LOG-01 on
 * 2026-11-09: the cap counts answers, not attempts). Copilot answers and product description
 * drafts share this one budget (descriptions spec A2). The key keeps its Copilot name so the
 * count of the day survives the move into this module.
 */
export const LLM_DAILY_KEY = "copilot:llm:day";
export const LLM_DAILY_LIMIT = 100;
export const LLM_DAILY_WINDOW_SECONDS = 86_400;

export type LlmDailyUnit = {
  /** False when the cap was already reached: the answer or draft does not start. */
  allowed: boolean;
  /** Units left after this one; a retry runs only when this is above 0. */
  remaining: number;
};

/**
 * Takes one unit of the shared daily cap for a whole answer or draft, before its first attempt.
 * A retry never takes a unit of its own: it checks `remaining` from this call, so a refused
 * retry keeps its real reason instead of reporting the cap.
 */
export async function takeLlmDailyUnit(rateLimiter: RateLimiterPort): Promise<LlmDailyUnit> {
  const daily = await rateLimiter.consume(LLM_DAILY_KEY, LLM_DAILY_LIMIT, LLM_DAILY_WINDOW_SECONDS);
  return { allowed: daily.allowed, remaining: daily.remaining };
}

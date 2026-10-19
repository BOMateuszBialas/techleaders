import type { RateLimiterPort } from "@commerceos/core";

/**
 * Store-wide: 100 LLM attempts per day, consumed per attempt (Copilot spec A4). Copilot answers
 * and product description drafts share this one budget (descriptions spec A2). The key keeps its
 * Copilot name so the count of the day survives the move into this module.
 */
export const LLM_DAILY_KEY = "copilot:llm:day";
export const LLM_DAILY_LIMIT = 100;
export const LLM_DAILY_WINDOW_SECONDS = 86_400;

/** Counts one LLM attempt against the shared daily cap; false when the cap is reached. */
export async function consumeLlmDailyAttempt(rateLimiter: RateLimiterPort): Promise<boolean> {
  const daily = await rateLimiter.consume(LLM_DAILY_KEY, LLM_DAILY_LIMIT, LLM_DAILY_WINDOW_SECONDS);
  return daily.allowed;
}

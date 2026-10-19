import type { RateLimiterPort } from "@commerceos/core";
import { describe, expect, it, vi } from "vitest";
import {
  LLM_DAILY_KEY,
  LLM_DAILY_LIMIT,
  LLM_DAILY_WINDOW_SECONDS,
  consumeLlmDailyAttempt,
} from "./llm-daily-cap";

describe("consumeLlmDailyAttempt", () => {
  it("keeps the Copilot's key, limit and window, so today's count survives the move", () => {
    expect([LLM_DAILY_KEY, LLM_DAILY_LIMIT, LLM_DAILY_WINDOW_SECONDS]).toEqual([
      "copilot:llm:day",
      100,
      86_400,
    ]);
  });

  it("consumes one attempt and reports whether the cap allowed it", async () => {
    const consume = vi
      .fn<RateLimiterPort["consume"]>()
      .mockResolvedValueOnce({ allowed: true, remaining: 3 })
      .mockResolvedValueOnce({ allowed: false, remaining: 0 });
    const rateLimiter: RateLimiterPort = { consume };
    expect(await consumeLlmDailyAttempt(rateLimiter)).toBe(true);
    expect(await consumeLlmDailyAttempt(rateLimiter)).toBe(false);
    expect(consume).toHaveBeenCalledWith("copilot:llm:day", 100, 86_400);
  });
});

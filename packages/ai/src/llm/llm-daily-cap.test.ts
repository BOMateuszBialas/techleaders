import type { RateLimiterPort } from "@commerceos/core";
import { describe, expect, it, vi } from "vitest";
import {
  LLM_DAILY_KEY,
  LLM_DAILY_LIMIT,
  LLM_DAILY_WINDOW_SECONDS,
  takeLlmDailyUnit,
} from "./llm-daily-cap";

describe("takeLlmDailyUnit", () => {
  it("keeps the Copilot's key, limit and window, so today's count survives the move", () => {
    expect([LLM_DAILY_KEY, LLM_DAILY_LIMIT, LLM_DAILY_WINDOW_SECONDS]).toEqual([
      "copilot:llm:day",
      100,
      86_400,
    ]);
  });

  it("takes one unit and reports whether the cap allowed it and how many are left", async () => {
    const consume = vi
      .fn<RateLimiterPort["consume"]>()
      .mockResolvedValueOnce({ allowed: true, remaining: 3 })
      .mockResolvedValueOnce({ allowed: false, remaining: 0 });
    const rateLimiter: RateLimiterPort = { consume };
    expect(await takeLlmDailyUnit(rateLimiter)).toEqual({ allowed: true, remaining: 3 });
    expect(await takeLlmDailyUnit(rateLimiter)).toEqual({ allowed: false, remaining: 0 });
    expect(consume).toHaveBeenCalledWith("copilot:llm:day", 100, 86_400);
  });
});

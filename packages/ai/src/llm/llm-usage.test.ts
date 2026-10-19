import { describe, expect, it } from "vitest";
import { addLlmUsage, NO_LLM_USAGE } from "./llm-usage";

describe("addLlmUsage", () => {
  it("adds reported counts and keeps unreported ones unknown", () => {
    const first = addLlmUsage(NO_LLM_USAGE, {
      inputTokens: 10,
      outputTokens: null,
      thinkingTokens: 2,
    });
    expect(first).toEqual({ inputTokens: 10, outputTokens: null, thinkingTokens: 2 });
    expect(addLlmUsage(first, { inputTokens: 5, outputTokens: 3, thinkingTokens: null })).toEqual({
      inputTokens: 15,
      outputTokens: 3,
      thinkingTokens: 2,
    });
    expect(addLlmUsage(first, undefined)).toEqual(first);
  });
});

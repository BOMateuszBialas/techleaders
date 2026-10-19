import type { LlmUsage } from "../ports/llm-provider.port";

/** Usage before the first attempt: no counts reported yet. */
export const NO_LLM_USAGE: LlmUsage = Object.freeze({
  inputTokens: null,
  outputTokens: null,
  thinkingTokens: null,
});

/**
 * Adds one attempt's token counts to a running total. A count the provider did not report
 * (`null` or missing) leaves the total as it is, so "unknown" never turns into 0.
 */
export function addLlmUsage(total: LlmUsage, usage: LlmUsage | undefined): LlmUsage {
  const sum = (a: number | null, b: number | null | undefined) =>
    b === null || b === undefined ? a : (a ?? 0) + b;
  return {
    inputTokens: sum(total.inputTokens, usage?.inputTokens),
    outputTokens: sum(total.outputTokens, usage?.outputTokens),
    thinkingTokens: sum(total.thinkingTokens, usage?.thinkingTokens),
  };
}

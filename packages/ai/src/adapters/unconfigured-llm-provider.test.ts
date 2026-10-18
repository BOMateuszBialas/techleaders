import { describe, expect, it } from "vitest";
import { LlmProviderUnavailableError, llmFailureOf } from "../ports/llm-provider.port";
import { UnconfiguredLlmProvider } from "./unconfigured-llm-provider";

describe("UnconfiguredLlmProvider", () => {
  it("fails explicitly instead of fabricating a response", async () => {
    const provider = new UnconfiguredLlmProvider();
    expect(provider.isConfigured).toBe(false);
    const error: unknown = await provider.generateStructured().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(LlmProviderUnavailableError);
    expect(llmFailureOf(error)).toEqual({ kind: "unavailable", reason: "not_configured" });
  });
});

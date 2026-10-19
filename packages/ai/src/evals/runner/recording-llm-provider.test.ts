import { describe, expect, it } from "vitest";
import { z } from "zod";
import { UnconfiguredLlmProvider } from "../../adapters/unconfigured-llm-provider";
import {
  LlmOutputInvalidError,
  LlmProviderUnavailableError,
  llmCauseCodeOf,
  llmFailureOf,
  type LlmProviderPort,
  type StructuredGenerationRequest,
} from "../../ports/llm-provider.port";
import { CallBudget, EVAL_BUDGET_CAUSE, RecordingLlmProvider } from "./recording-llm-provider";

const request: StructuredGenerationRequest<unknown> = {
  messages: [{ role: "user", content: "hi" }],
  schema: z.unknown(),
  maxOutputTokens: 1,
  timeoutMs: 1,
};

function provider(reply: () => Promise<unknown>): LlmProviderPort {
  return {
    name: "fake",
    isConfigured: true,
    generateStructured: async <T>(sent: StructuredGenerationRequest<T>) => ({
      data: sent.schema.parse(await reply()),
      model: "fake-model",
      latencyMs: 7,
    }),
  };
}

describe("CallBudget", () => {
  it("hands out exactly its limit", () => {
    const budget = new CallBudget(2);
    expect([budget.take(), budget.take(), budget.take()]).toEqual([true, true, false]);
    expect({ used: budget.used, remaining: budget.remaining }).toEqual({ used: 2, remaining: 0 });
  });
});

describe("RecordingLlmProvider", () => {
  it("passes the inner provider's name and configuration through", () => {
    const recording = new RecordingLlmProvider(new UnconfiguredLlmProvider());
    expect({ name: recording.name, isConfigured: recording.isConfigured }).toEqual({
      name: new UnconfiguredLlmProvider().name,
      isConfigured: false,
    });
  });

  it("records requests, latency and the model; a result without usage adds no tokens", async () => {
    const recording = new RecordingLlmProvider(provider(async () => "ok"));
    await recording.generateStructured(request);
    await recording.generateStructured(request);
    expect(recording.requests).toHaveLength(2);
    expect(recording.latencyMs).toBe(14);
    expect(recording.model).toBe("fake-model");
    expect(recording.tokens).toEqual({ input: 0, output: 0, thinking: 0 });
  });

  it("records the provider's failure reason and the tokens a failed call used", async () => {
    const recording = new RecordingLlmProvider(
      provider(async () => {
        throw new LlmProviderUnavailableError("quota", {
          reason: "rate_limited",
          causeCode: "http_429",
          usage: { inputTokens: 5, outputTokens: null, thinkingTokens: 2 },
        });
      }),
    );
    await expect(recording.generateStructured(request)).rejects.toThrow("quota");
    expect(recording.providerFailure).toBe("rate_limited");
    expect(recording.providerCause).toBe("http_429");
    expect(recording.tokens).toEqual({ input: 5, output: 0, thinking: 2 });
    expect(recording.latencyMs).toBeNull();
  });

  it("does not count invalid output or unrelated errors as a provider failure", async () => {
    const invalid = new RecordingLlmProvider(
      provider(async () => {
        throw new LlmOutputInvalidError("bad");
      }),
    );
    await expect(invalid.generateStructured(request)).rejects.toThrow("bad");
    const broken = new RecordingLlmProvider(
      provider(async () => {
        throw new Error("bug");
      }),
    );
    await expect(broken.generateStructured(request)).rejects.toThrow("bug");
    expect([invalid.providerFailure, broken.providerFailure]).toEqual([null, null]);
  });

  it("refuses a call past the budget with its own cause, without calling the provider", async () => {
    const budget = new CallBudget(1);
    let calls = 0;
    const recording = new RecordingLlmProvider(
      provider(async () => {
        calls += 1;
        return "ok";
      }),
      budget,
    );
    await recording.generateStructured(request);
    const refused = await recording.generateStructured(request).catch((error: unknown) => error);
    expect(llmFailureOf(refused)).toEqual({ kind: "unavailable", reason: "rate_limited" });
    expect(llmCauseCodeOf(refused)).toBe(EVAL_BUDGET_CAUSE);
    expect({ calls, requests: recording.requests.length }).toEqual({ calls: 1, requests: 1 });
    expect(recording.providerFailure).toBeNull();
  });
});

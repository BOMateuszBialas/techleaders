import type { RateLimiterPort } from "@commerceos/core";
import { describe, expect, it, vi } from "vitest";
import { groundedReply } from "../evals/replies";
import {
  ScriptedLlmProvider,
  SCRIPTED_MODEL,
  type ScriptStep,
} from "../evals/scripted-llm-provider";
import {
  LlmOutputInvalidError,
  LlmProviderUnavailableError,
  type LlmProviderPort,
  type LlmUnavailableReason,
} from "../ports/llm-provider.port";
import { UnconfiguredLlmProvider } from "../adapters/unconfigured-llm-provider";
import { COPILOT_PROMPT_VERSION } from "../prompts/copilot-system.prompt";
import { copilotModelOutputSchema } from "../schemas/copilot-model-output.schema";
import { buildFacts } from "./build-facts";
import { NOW, PERIOD, lowStock, orders, sales, top } from "./copilot-results.fixture";
import {
  ATTEMPT_TIMEOUT_MS,
  INVALID_OUTPUT_PROBLEM,
  LLM_DAILY_KEY,
  LLM_DAILY_LIMIT,
  LLM_DAILY_WINDOW_SECONDS,
  MAX_OUTPUT_TOKENS,
  generateAnswer,
  generationLogFields,
} from "./generate-answer";
import { INTENTS } from "./intents";
import { buildRuleInsights } from "./rule-insights";

const table = buildFacts({
  sales: sales(),
  orders: orders(),
  topProducts: top(),
  lowStock: lowStock(),
});
const baseline = buildRuleInsights("focus", table, PERIOD);
const INPUT = { question: INTENTS.focus.question, period: PERIOD, table, baseline };

/** Grounded except for an invented figure. */
const fabricatedReply: ScriptStep = (request) => {
  const reply = copilotModelOutputSchema.parse(groundedReply(request));
  return { ...reply, summary: "Revenue rose 40% because of great work." };
};

function setup(options: { provider?: LlmProviderPort; allowed?: boolean[] } = {}) {
  let now = NOW.getTime();
  const allowed = [...(options.allowed ?? [])];
  const rateLimiter: RateLimiterPort = {
    consume: vi.fn(async () => ({ allowed: allowed.shift() ?? true, remaining: 1 })),
  };
  const deps = {
    llmProvider: options.provider ?? new UnconfiguredLlmProvider(),
    rateLimiter,
    clock: () => new Date(now),
  };
  return { deps, rateLimiter, advance: (ms: number) => (now += ms) };
}

function failing(reason: LlmUnavailableReason): ScriptStep {
  return () => {
    throw new LlmProviderUnavailableError("down", { reason });
  };
}

describe("generateAnswer", () => {
  it("returns the rule-based answer at once when no provider is configured", async () => {
    const { deps, rateLimiter } = setup();
    const generation = await generateAnswer(deps, INPUT);
    expect(generation).toMatchObject({
      draft: baseline,
      origin: "rules",
      fallbackReason: "not_configured",
      model: null,
      provider: "unconfigured",
      attempts: 0,
      issueCodes: [],
    });
    expect(rateLimiter.consume).not.toHaveBeenCalled();
  });

  it("returns a grounded model answer after one attempt within the limits", async () => {
    const provider = new ScriptedLlmProvider([groundedReply]);
    const { deps, rateLimiter } = setup({ provider });
    const generation = await generateAnswer(deps, INPUT);

    expect(generation).toMatchObject({
      origin: "llm",
      fallbackReason: null,
      model: SCRIPTED_MODEL,
      provider: "scripted",
      attempts: 1,
      issueCodes: [],
      usage: { inputTokens: 1000, outputTokens: 200, thinkingTokens: null },
    });
    expect(generation.draft.recommendations[0]?.title).toBe(
      "Feature Pulse Ultralight Mouse on the home page",
    );
    expect(rateLimiter.consume).toHaveBeenCalledWith(
      LLM_DAILY_KEY,
      LLM_DAILY_LIMIT,
      LLM_DAILY_WINDOW_SECONDS,
    );
    const [request] = provider.requests;
    expect(request).toMatchObject({
      schema: copilotModelOutputSchema,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      timeoutMs: ATTEMPT_TIMEOUT_MS,
    });
    expect(request?.signal).toBeInstanceOf(AbortSignal);
    expect(request?.messages[1]?.content).toContain(`Question: ${INTENTS.focus.question}`);
  });

  it("retries once with the problem codes, never the model's text, then accepts", async () => {
    const provider = new ScriptedLlmProvider([fabricatedReply, groundedReply]);
    const { deps, rateLimiter } = setup({ provider });
    const generation = await generateAnswer(deps, INPUT);

    expect(generation).toMatchObject({
      origin: "llm",
      attempts: 2,
      issueCodes: ["ungrounded_number", "causal_claim"],
      usage: { inputTokens: 2000, outputTokens: 400, thinkingTokens: null },
    });
    expect(rateLimiter.consume).toHaveBeenCalledTimes(2);
    const retry = provider.requests[1]?.messages ?? [];
    expect(retry).toHaveLength(3);
    expect(retry.slice(0, 2)).toEqual(provider.requests[0]?.messages);
    expect(retry[2]?.content).toContain("ungrounded_number");
    expect(retry[2]?.content).toContain("causal_claim");
    expect(JSON.stringify(retry)).not.toContain("40%");
    expect(JSON.stringify(retry)).not.toContain("great work");
  });

  it("falls back to the rules with invalid_output after two failed attempts", async () => {
    const provider = new ScriptedLlmProvider([fabricatedReply, fabricatedReply]);
    const { deps } = setup({ provider });
    const generation = await generateAnswer(deps, INPUT);
    expect(generation).toMatchObject({
      draft: baseline,
      origin: "rules",
      fallbackReason: "invalid_output",
      model: null,
      attempts: 2,
    });
  });

  it("asks again after a reply that fails the schema, saying so", async () => {
    const provider = new ScriptedLlmProvider([() => ({ summary: "" }), groundedReply]);
    const { deps } = setup({ provider });
    const generation = await generateAnswer(deps, INPUT);
    expect(generation).toMatchObject({
      origin: "llm",
      attempts: 2,
      issueCodes: ["invalid_output"],
    });
    expect(provider.requests[1]?.messages[2]?.content).toBe(INVALID_OUTPUT_PROBLEM);
  });

  it("skips the second attempt when under 10 s of the deadline remain", async () => {
    const { deps, advance } = setup();
    const provider = new ScriptedLlmProvider([
      (request) => {
        advance(31_000);
        return fabricatedReply(request);
      },
      groundedReply,
    ]);
    const generation = await generateAnswer({ ...deps, llmProvider: provider }, INPUT);
    expect(provider.requests).toHaveLength(1);
    expect(generation).toMatchObject({ fallbackReason: "invalid_output", attempts: 1 });
  });

  it("gives the second attempt only the time left before the deadline", async () => {
    const { deps, advance } = setup();
    const provider = new ScriptedLlmProvider([
      (request) => {
        advance(25_000);
        return fabricatedReply(request);
      },
      groundedReply,
    ]);
    const generation = await generateAnswer({ ...deps, llmProvider: provider }, INPUT);
    expect(generation.origin).toBe("llm");
    expect(provider.requests[1]?.timeoutMs).toBe(15_000);
  });

  it("does not retry a provider failure and reports its reason", async () => {
    for (const reason of [
      "timeout",
      "rate_limited",
      "provider_error",
      "auth",
      "refused",
    ] as const) {
      const provider = new ScriptedLlmProvider([failing(reason), groundedReply]);
      const { deps } = setup({ provider });
      const generation = await generateAnswer(deps, INPUT);
      expect(generation).toMatchObject({
        draft: baseline,
        origin: "rules",
        fallbackReason: reason,
        attempts: 1,
      });
      expect(provider.requests).toHaveLength(1);
    }
  });

  it("treats an unclassified adapter error as a provider error, not a crash", async () => {
    const provider = new ScriptedLlmProvider([
      () => {
        throw new TypeError("bug in an adapter");
      },
    ]);
    const { deps } = setup({ provider });
    expect(await generateAnswer(deps, INPUT)).toMatchObject({ fallbackReason: "provider_error" });
  });

  it("stops at the daily cap, before the first call or between attempts", async () => {
    const first = new ScriptedLlmProvider([groundedReply]);
    const spent = setup({ provider: first, allowed: [false] });
    expect(await generateAnswer(spent.deps, INPUT)).toMatchObject({
      fallbackReason: "daily_limit",
      attempts: 0,
    });
    expect(first.requests).toHaveLength(0);

    const second = new ScriptedLlmProvider([fabricatedReply, groundedReply]);
    const midway = setup({ provider: second, allowed: [true, false] });
    expect(await generateAnswer(midway.deps, INPUT)).toMatchObject({
      origin: "rules",
      fallbackReason: "daily_limit",
      attempts: 1,
      issueCodes: ["ungrounded_number", "causal_claim"],
    });
    expect(second.requests).toHaveLength(1);
  });

  it("keeps usage unknown when the provider reports none", async () => {
    const provider: LlmProviderPort = {
      name: "quiet",
      isConfigured: true,
      generateStructured: async (request) => ({
        data: request.schema.parse(groundedReply({ ...request, schema: copilotModelOutputSchema })),
        model: "quiet-model",
        latencyMs: 1,
      }),
    };
    const { deps } = setup({ provider });
    const generation = await generateAnswer(deps, INPUT);
    expect(generation.usage).toEqual({
      inputTokens: null,
      outputTokens: null,
      thinkingTokens: null,
    });
  });

  it("reports a schema failure from the provider as an attempt", async () => {
    const provider = new ScriptedLlmProvider([
      () => {
        throw new LlmOutputInvalidError("bad json");
      },
      () => {
        throw new LlmOutputInvalidError("bad json");
      },
    ]);
    const { deps } = setup({ provider });
    expect(await generateAnswer(deps, INPUT)).toMatchObject({
      fallbackReason: "invalid_output",
      attempts: 2,
      issueCodes: ["invalid_output"],
    });
  });
});

describe("usage and cause of rejected attempts (#65)", () => {
  const REJECTED_USAGE = { inputTokens: 900, outputTokens: 4000, thinkingTokens: 50 };

  /** Fails the first call with `error`, then answers like the scripted provider. */
  function failingOnce(error: Error): LlmProviderPort {
    const scripted = new ScriptedLlmProvider([groundedReply]);
    let calls = 0;
    return {
      name: "gemini",
      isConfigured: true,
      generateStructured: async (request) => {
        calls += 1;
        if (calls === 1) throw error;
        return scripted.generateStructured(request);
      },
    };
  }

  it("adds the tokens of an attempt that failed the schema to the logged usage", async () => {
    const provider = failingOnce(
      new LlmOutputInvalidError("schema mismatch", { usage: REJECTED_USAGE }),
    );
    const generation = await generateAnswer(setup({ provider }).deps, INPUT);
    expect(generation).toMatchObject({ origin: "llm", attempts: 2, providerCause: null });
    // 900 + 1000 input, 4000 + 200 output, 50 thinking (the scripted reply reports none).
    expect(generation.usage).toEqual({ inputTokens: 1900, outputTokens: 4200, thinkingTokens: 50 });
  });

  it("logs a provider failure's cause code and the tokens it used, keeping the reason", async () => {
    const provider = failingOnce(
      new LlmProviderUnavailableError("ended early", {
        causeCode: "finish_max_tokens",
        usage: REJECTED_USAGE,
      }),
    );
    const generation = await generateAnswer(setup({ provider }).deps, INPUT);
    expect(generation).toMatchObject({
      origin: "rules",
      fallbackReason: "provider_error",
      providerCause: "finish_max_tokens",
      usage: REJECTED_USAGE,
    });
    expect(generationLogFields(generation)).toMatchObject({
      providerCause: "finish_max_tokens",
      usageOutput: 4000,
    });
  });

  it("logs no cause for an error without a safe cause code", async () => {
    const unsafe = Object.assign(new LlmProviderUnavailableError("down"), {
      causeCode: "Invalid JSON payload received.",
    });
    const generation = await generateAnswer(setup({ provider: failingOnce(unsafe) }).deps, INPUT);
    expect(generation.providerCause).toBeNull();
    expect(generation.usage).toEqual({
      inputTokens: null,
      outputTokens: null,
      thinkingTokens: null,
    });
  });
});

describe("generationLogFields", () => {
  it("logs names, counts and codes, with the prompt version only when a call was made", async () => {
    expect(generationLogFields(undefined)).toEqual({
      provider: null,
      model: null,
      promptVersion: null,
      attempts: 0,
      issueCodes: [],
      providerCause: null,
      usageInput: null,
      usageOutput: null,
      usageThinking: null,
    });
    const unconfigured = await generateAnswer(setup().deps, INPUT);
    expect(generationLogFields(unconfigured)).toMatchObject({
      provider: "unconfigured",
      promptVersion: null,
    });
    const provider = new ScriptedLlmProvider([groundedReply]);
    const answered = await generateAnswer(setup({ provider }).deps, INPUT);
    expect(generationLogFields(answered)).toEqual({
      provider: "scripted",
      model: SCRIPTED_MODEL,
      promptVersion: COPILOT_PROMPT_VERSION,
      attempts: 1,
      issueCodes: [],
      providerCause: null,
      usageInput: 1000,
      usageOutput: 200,
      usageThinking: null,
    });
  });
});

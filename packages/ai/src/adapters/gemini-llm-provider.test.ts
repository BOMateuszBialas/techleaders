import type { GenerateContentParameters } from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  llmCauseCodeOf,
  llmFailureOf,
  llmUsageOf,
  type StructuredGenerationRequest,
} from "../ports/llm-provider.port";
import {
  GEMINI_THINKING_LEVEL,
  GeminiLlmProvider,
  createGeminiClient,
  toGeminiJsonSchema,
  type GeminiResponse,
} from "./gemini-llm-provider";

const schema = z.object({
  summary: z.string().min(1).max(50),
  items: z.array(z.object({ id: z.string().regex(/^f\d+$/) })).max(3),
});
type Answer = z.infer<typeof schema>;

const VALID: Answer = { summary: "ok", items: [{ id: "f1" }] };

function request(overrides: Partial<StructuredGenerationRequest<Answer>> = {}) {
  return {
    messages: [
      { role: "system" as const, content: "rules" },
      { role: "system" as const, content: "more rules" },
      { role: "user" as const, content: "question" },
    ],
    schema,
    maxOutputTokens: 4000,
    timeoutMs: 20_000,
    ...overrides,
  };
}

function setup(answer: (params: GenerateContentParameters) => Promise<GeminiResponse>) {
  const generateContent = vi.fn(answer);
  const createClient = vi.fn(() => ({ models: { generateContent } }));
  const provider = new GeminiLlmProvider({ apiKey: "test-key", model: "flash", createClient });
  return { provider, generateContent, createClient };
}

/** A response whose first candidate holds `text` as its one text part. */
const ok = (response: Partial<GeminiResponse> = {}, text = JSON.stringify(VALID)) =>
  setup(async () => ({
    candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }],
    ...response,
  }));

const USAGE_METADATA = {
  promptTokenCount: 900,
  candidatesTokenCount: 300,
  thoughtsTokenCount: 200,
};
const USAGE = { inputTokens: 900, outputTokens: 300, thinkingTokens: 200 };

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.catch((caught: unknown) => caught);
}

async function failureOf(promise: Promise<unknown>) {
  return llmFailureOf(await errorOf(promise));
}

describe("GeminiLlmProvider", () => {
  it("sends one JSON-schema request with the limits and returns the validated answer", async () => {
    const { provider, generateContent, createClient } = ok({
      modelVersion: "flash-001",
      usageMetadata: USAGE_METADATA,
    });
    expect(provider).toMatchObject({ name: "gemini", isConfigured: true });
    expect(createClient).toHaveBeenCalledWith("test-key");

    const result = await provider.generateStructured(request());
    expect(result).toMatchObject({
      data: VALID,
      model: "flash-001",
      usage: USAGE,
    });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    expect(generateContent).toHaveBeenCalledTimes(1);
    const params = generateContent.mock.calls[0]?.[0];
    expect(params).toMatchObject({
      model: "flash",
      contents: [{ role: "user", parts: [{ text: "question" }] }],
      config: {
        systemInstruction: "rules\n\nmore rules",
        responseMimeType: "application/json",
        responseJsonSchema: toGeminiJsonSchema(schema),
        maxOutputTokens: 4000,
        thinkingConfig: { thinkingLevel: GEMINI_THINKING_LEVEL },
      },
    });
    expect(params?.config?.abortSignal).toBeInstanceOf(AbortSignal);
    expect(GEMINI_THINKING_LEVEL).toBe("LOW");
  });

  it("thinks at the minimal level when the caller asks for minimal effort", async () => {
    const { provider, generateContent } = ok({});
    await provider.generateStructured(request({ effort: "minimal" }));
    await provider.generateStructured(request({ effort: "low" }));
    expect(generateContent.mock.calls.map((call) => call[0].config?.thinkingConfig)).toEqual([
      { thinkingLevel: "MINIMAL" },
      { thinkingLevel: "LOW" },
    ]);
  });

  it("omits the system instruction when there is none and reports unknown usage as null", async () => {
    // No finish reason: read as STOP.
    const { provider, generateContent } = ok({
      candidates: [{ content: { parts: [{ text: JSON.stringify(VALID) }] } }],
    });
    const result = await provider.generateStructured(
      request({ messages: [{ role: "user", content: "q" }] }),
    );
    expect(generateContent.mock.calls[0]?.[0].config).not.toHaveProperty("systemInstruction");
    expect(result.model).toBe("flash");
    expect(result.usage).toEqual({ inputTokens: null, outputTokens: null, thinkingTokens: null });
  });

  it("maps HTTP errors to reasons without retrying", async () => {
    const cases: [number, string, string][] = [
      [401, "unauthenticated", "auth"],
      [403, "permission denied", "auth"],
      [400, "API key not valid. Please pass a valid API key.", "auth"],
      [400, "Invalid JSON payload", "provider_error"],
      [429, "quota exceeded", "rate_limited"],
      [408, "request timeout", "timeout"],
      [504, "deadline exceeded", "timeout"],
      [500, "internal", "provider_error"],
      [503, "overloaded", "provider_error"],
    ];
    for (const [status, message, reason] of cases) {
      const { provider, generateContent } = setup(async () => {
        throw Object.assign(new Error(message), { status });
      });
      expect(await failureOf(provider.generateStructured(request()))).toEqual({
        kind: "unavailable",
        reason,
      });
      expect(generateContent).toHaveBeenCalledTimes(1);
    }
  });

  it("maps a status-carrying non-Error and a network failure to provider_error", async () => {
    const plain = setup(async () => {
      throw { status: 502 };
    });
    expect(await failureOf(plain.provider.generateStructured(request()))).toEqual({
      kind: "unavailable",
      reason: "provider_error",
    });
    const network = setup(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await failureOf(network.provider.generateStructured(request()))).toEqual({
      kind: "unavailable",
      reason: "provider_error",
    });
  });

  it("times out after timeoutMs, and when the caller's deadline aborts", async () => {
    const hang = (params: GenerateContentParameters) =>
      new Promise<GeminiResponse>((_, reject) => {
        params.config?.abortSignal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    const slow = setup(hang);
    expect(await failureOf(slow.provider.generateStructured(request({ timeoutMs: 5 })))).toEqual({
      kind: "unavailable",
      reason: "timeout",
    });

    const deadline = new AbortController();
    const caller = setup(hang);
    const pending = caller.provider.generateStructured(request({ signal: deadline.signal }));
    deadline.abort();
    expect(await failureOf(pending)).toEqual({ kind: "unavailable", reason: "timeout" });
  });

  it("treats a blocked prompt and safety finish reasons as refused", async () => {
    const blocked = ok({ promptFeedback: { blockReason: "PROHIBITED_CONTENT" } });
    expect(await failureOf(blocked.provider.generateStructured(request()))).toEqual({
      kind: "unavailable",
      reason: "refused",
    });
    const safety = ok({ candidates: [{ finishReason: "SAFETY" }] });
    expect(await failureOf(safety.provider.generateStructured(request()))).toEqual({
      kind: "unavailable",
      reason: "refused",
    });
  });

  it("does not read a truncated answer (MAX_TOKENS) and does not retry it", async () => {
    const truncated = ok({
      candidates: [
        { finishReason: "MAX_TOKENS", content: { parts: [{ text: '{"summary": "o' }] } },
      ],
      usageMetadata: USAGE_METADATA,
    });
    const error = await errorOf(truncated.provider.generateStructured(request()));
    expect(llmFailureOf(error)).toEqual({ kind: "unavailable", reason: "provider_error" });
    // The log can tell a truncated answer apart, and count its tokens (#65).
    expect(llmCauseCodeOf(error)).toBe("finish_max_tokens");
    expect(llmUsageOf(error)).toEqual(USAGE);
    expect(truncated.generateContent).toHaveBeenCalledTimes(1);
  });

  it("gives a provider_error a short cause code, and other reasons none (#65)", async () => {
    const cases: [number, string, string | null][] = [
      [400, "Invalid JSON payload", "bad_request"],
      [404, "model not found", "not_found"],
      [409, "conflict", "http_409"],
      [500, "internal", "server_error"],
      [503, "overloaded", "server_error"],
      [400, "API key not valid", null],
      [429, "quota exceeded", null],
    ];
    for (const [status, message, cause] of cases) {
      const { provider } = setup(async () => {
        throw Object.assign(new Error(message), { status });
      });
      expect(llmCauseCodeOf(await errorOf(provider.generateStructured(request())))).toBe(cause);
    }
    const network = setup(async () => {
      throw new TypeError("fetch failed");
    });
    expect(llmCauseCodeOf(await errorOf(network.provider.generateStructured(request())))).toBe(
      "network",
    );
    const refused = ok({ candidates: [{ finishReason: "SAFETY" }], usageMetadata: USAGE_METADATA });
    const refusal = await errorOf(refused.provider.generateStructured(request()));
    expect(llmCauseCodeOf(refusal)).toBeNull();
    expect(llmUsageOf(refusal)).toEqual(USAGE);
  });

  it("reads only the text parts, skips thought parts, and never uses the SDK's text getter", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const json = JSON.stringify(VALID);
    const { provider } = setup(async () => ({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              { text: "Let me think about the facts.", thought: true },
              { text: json.slice(0, 10) },
              {},
              { text: json.slice(10) },
            ],
          },
        },
      ],
      get text(): string {
        throw new Error("the adapter must not read response.text");
      },
    }));
    await expect(provider.generateStructured(request())).resolves.toMatchObject({ data: VALID });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("reports empty text, invalid JSON and a schema mismatch as invalid output", async () => {
    for (const text of ["", "not json", JSON.stringify({ summary: "", items: [] })]) {
      const { provider } = ok({ usageMetadata: USAGE_METADATA }, text);
      const error = await errorOf(provider.generateStructured(request()));
      expect(llmFailureOf(error)).toEqual({ kind: "invalid_output" });
      // The rejected attempt's tokens travel with the error (#65).
      expect(llmUsageOf(error)).toEqual(USAGE);
    }
    const noParts = setup(async () => ({ candidates: [{ finishReason: "STOP", content: {} }] }));
    expect(await failureOf(noParts.provider.generateStructured(request()))).toEqual({
      kind: "invalid_output",
    });
  });

  it("builds the real SDK client without a network call", () => {
    const client = createGeminiClient("test-key");
    expect(typeof client.models.generateContent).toBe("function");
    const provider = new GeminiLlmProvider({ apiKey: "test-key", model: "flash" });
    expect(provider.isConfigured).toBe(true);
  });
});

describe("toGeminiJsonSchema", () => {
  it("keeps the supported keywords and drops the rest, at every depth", () => {
    expect(toGeminiJsonSchema(schema)).toEqual({
      type: "object",
      properties: {
        summary: { type: "string" },
        items: {
          type: "array",
          maxItems: 3,
          items: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
            additionalProperties: false,
          },
        },
      },
      required: ["summary", "items"],
      additionalProperties: false,
    });
  });

  it("keeps property names that look like keywords, enums and definitions", () => {
    const tricky = z.object({ pattern: z.enum(["a", "b"]), minLength: z.number().min(1) });
    expect(toGeminiJsonSchema(tricky)).toMatchObject({
      properties: {
        pattern: { type: "string", enum: ["a", "b"] },
        minLength: { type: "number", minimum: 1 },
      },
    });
  });
});

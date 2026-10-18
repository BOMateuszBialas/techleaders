import { GoogleGenAI, ThinkingLevel, type GenerateContentParameters } from "@google/genai";
import { z } from "zod";
import {
  LlmOutputInvalidError,
  LlmProviderUnavailableError,
  type LlmProviderPort,
  type LlmUnavailableReason,
  type LlmUsage,
  type StructuredGenerationRequest,
  type StructuredGenerationResult,
} from "../ports/llm-provider.port";

/** The part of a `generateContent` response the adapter reads (`GenerateContentResponse`). */
export type GeminiResponse = {
  readonly text?: string;
  candidates?: { finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
  };
  modelVersion?: string;
};

/** The SDK surface the adapter uses, so unit tests stub it without a network. */
export type GeminiClient = {
  models: { generateContent(params: GenerateContentParameters): Promise<GeminiResponse> };
};
export type GeminiClientFactory = (apiKey: string) => GeminiClient;

/**
 * The official client with SDK retries off (Copilot spec A11: provider errors are not retried;
 * the caller owns its single retry after a schema or grounding failure).
 */
export const createGeminiClient: GeminiClientFactory = (apiKey) =>
  new GoogleGenAI({ apiKey, httpOptions: { retryOptions: { attempts: 1 } } });

/**
 * Thinking effort. The Gemini 3 Flash models the free tier offers think at a high level by
 * default, which took longer than the 20 s attempt timeout in the smoke test; thinking tokens
 * also count as output, so a low level keeps the answer inside `maxOutputTokens` and the
 * deadline. (Gemini 2.5's `thinkingBudget` is not used: 2.5 models are closed to new keys.)
 */
export const GEMINI_THINKING_LEVEL = ThinkingLevel.LOW;

/**
 * JSON Schema keywords Gemini's `responseJsonSchema` supports (SDK typings,
 * `GenerateContentConfig.responseJsonSchema`). Others, such as `maxLength`, are dropped: the
 * response is validated against the full Zod schema anyway.
 */
const SUPPORTED_KEYWORDS = new Set([
  "$id",
  "$defs",
  "$ref",
  "$anchor",
  "type",
  "format",
  "title",
  "description",
  "enum",
  "items",
  "prefixItems",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "anyOf",
  "oneOf",
  "properties",
  "additionalProperties",
  "required",
  "propertyOrdering",
]);
/** Keywords whose value maps names to sub-schemas. */
const SCHEMA_MAPS = new Set(["properties", "$defs"]);

function simplify(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(simplify);
  if (typeof node !== "object" || node === null) return node;
  return Object.fromEntries(
    Object.entries(node)
      .filter(([key]) => SUPPORTED_KEYWORDS.has(key))
      .map(([key, value]) => [
        key,
        SCHEMA_MAPS.has(key) && typeof value === "object" && value !== null
          ? Object.fromEntries(Object.entries(value).map(([name, sub]) => [name, simplify(sub)]))
          : simplify(value),
      ]),
  );
}

/** The Zod schema as the JSON Schema subset Gemini accepts. */
export function toGeminiJsonSchema(schema: z.ZodType): unknown {
  return simplify(z.toJSONSchema(schema, { io: "output" }));
}

/** Finish reasons that mean the model declined or was blocked (`FinishReason`). */
const REFUSED = new Set([
  "SAFETY",
  "RECITATION",
  "LANGUAGE",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "IMAGE_SAFETY",
  "IMAGE_PROHIBITED_CONTENT",
]);
const COMPLETE = new Set(["STOP", "FINISH_REASON_UNSPECIFIED"]);

function statusReason(status: number, message: string): LlmUnavailableReason {
  // The Gemini API answers an invalid key with 400 INVALID_ARGUMENT "API key not valid".
  if (status === 401 || status === 403 || (status === 400 && /api key/i.test(message))) {
    return "auth";
  }
  if (status === 429) return "rate_limited";
  if (status === 408 || status === 504) return "timeout";
  return "provider_error";
}

/** Maps any SDK or network failure to a reason; never exposes the provider's message. */
function toUnavailable(error: unknown, signal: AbortSignal): LlmProviderUnavailableError {
  if (signal.aborted) {
    return new LlmProviderUnavailableError("The LLM provider timed out.", {
      reason: "timeout",
      cause: error,
    });
  }
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = Number(error.status);
    const message = error instanceof Error ? error.message : "";
    return new LlmProviderUnavailableError(`The LLM provider failed (HTTP ${status}).`, {
      reason: statusReason(status, message),
      cause: error,
    });
  }
  return new LlmProviderUnavailableError("The LLM provider could not be reached.", {
    reason: "provider_error",
    cause: error,
  });
}

function usageOf(response: GeminiResponse): LlmUsage {
  const usage = response.usageMetadata;
  return {
    inputTokens: usage?.promptTokenCount ?? null,
    outputTokens: usage?.candidatesTokenCount ?? null,
    thinkingTokens: usage?.thoughtsTokenCount ?? null,
  };
}

/** Reads the JSON answer after checking why generation stopped. */
function readText(response: GeminiResponse): string {
  if (response.promptFeedback?.blockReason) {
    throw new LlmProviderUnavailableError("The LLM provider blocked the request.", {
      reason: "refused",
    });
  }
  const finish = response.candidates?.[0]?.finishReason ?? "STOP";
  if (REFUSED.has(finish)) {
    throw new LlmProviderUnavailableError("The LLM provider refused to answer.", {
      reason: "refused",
    });
  }
  if (!COMPLETE.has(finish)) {
    // MAX_TOKENS (truncated JSON) and anything else unexpected: not retried (spec A11).
    throw new LlmProviderUnavailableError(`The LLM answer ended early (${finish}).`, {
      reason: "provider_error",
    });
  }
  const text = response.text;
  if (!text) throw new LlmOutputInvalidError("The LLM answer was empty.");
  return text;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new LlmOutputInvalidError("The LLM answer is not valid JSON.", { cause: error });
  }
}

export type GeminiLlmProviderDeps = {
  apiKey: string;
  model: string;
  createClient?: GeminiClientFactory;
};

/**
 * Gemini API adapter (Copilot spec A1, `GeminiLlmProvider`): one `generateContent` call with a
 * JSON response schema, a per-call timeout combined with the caller's deadline, no SDK
 * retries, finish-reason checks before reading, and Zod validation of the parsed answer. Every
 * failure becomes `LlmProviderUnavailableError` (with a reason) or `LlmOutputInvalidError`.
 */
export class GeminiLlmProvider implements LlmProviderPort {
  readonly name = "gemini";
  readonly isConfigured = true;
  private readonly model: string;
  private readonly client: GeminiClient;

  constructor(deps: GeminiLlmProviderDeps) {
    this.model = deps.model;
    this.client = (deps.createClient ?? createGeminiClient)(deps.apiKey);
  }

  async generateStructured<T>(
    request: StructuredGenerationRequest<T>,
  ): Promise<StructuredGenerationResult<T>> {
    const started = Date.now();
    const timeout = AbortSignal.timeout(request.timeoutMs);
    const signal = request.signal ? AbortSignal.any([request.signal, timeout]) : timeout;
    const system = request.messages.filter((message) => message.role === "system");
    const user = request.messages.filter((message) => message.role === "user");

    let response: GeminiResponse;
    try {
      response = await this.client.models.generateContent({
        model: this.model,
        contents: user.map((message) => ({ role: "user", parts: [{ text: message.content }] })),
        config: {
          ...(system.length > 0
            ? { systemInstruction: system.map((message) => message.content).join("\n\n") }
            : {}),
          responseMimeType: "application/json",
          responseJsonSchema: toGeminiJsonSchema(request.schema),
          maxOutputTokens: request.maxOutputTokens,
          thinkingConfig: { thinkingLevel: GEMINI_THINKING_LEVEL },
          abortSignal: signal,
        },
      });
    } catch (error) {
      throw toUnavailable(error, signal);
    }

    const parsed = request.schema.safeParse(parseJson(readText(response)));
    if (!parsed.success) {
      throw new LlmOutputInvalidError("The LLM answer does not match the schema.", {
        cause: parsed.error,
      });
    }
    return {
      data: parsed.data,
      model: response.modelVersion ?? this.model,
      latencyMs: Date.now() - started,
      usage: usageOf(response),
    };
  }
}

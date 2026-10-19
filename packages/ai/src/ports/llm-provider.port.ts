import { AppError } from "@commerceos/core";
import { z } from "zod";

/**
 * Provider-independent LLM port. Concrete adapters (one per vendor) live in
 * `adapters/` and are selected in the app's composition root via LLM_PROVIDER.
 */
export type LlmMessage = { role: "system" | "user"; content: string };

export type StructuredGenerationRequest<T> = {
  messages: readonly LlmMessage[];
  schema: z.ZodType<T>;
  /** Hard limits. Adapters must enforce them. */
  maxOutputTokens: number;
  timeoutMs: number;
  /** The caller's overall deadline; aborting it fails the call with reason `timeout`. */
  signal?: AbortSignal;
  /**
   * How much the model may reason before it answers; `low` when omitted. `minimal` suits short,
   * fully specified texts (descriptions spec: a draft took 4 500 thinking tokens and 20 s at
   * `low`). An adapter whose model has no such setting ignores it.
   */
  effort?: LlmEffort;
};

export type LlmEffort = "minimal" | "low";

/** Token counts the provider reported; `null` when it reported none. */
export type LlmUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  thinkingTokens: number | null;
};

export type StructuredGenerationResult<T> = {
  data: T;
  model: string;
  latencyMs: number;
  usage?: LlmUsage;
};

export interface LlmProviderPort {
  readonly name: string;
  readonly isConfigured: boolean;
  generateStructured<T>(
    request: StructuredGenerationRequest<T>,
  ): Promise<StructuredGenerationResult<T>>;
}

/** Why the provider could not answer (Copilot spec, `GeminiLlmProvider`). */
export const LLM_UNAVAILABLE_REASONS = [
  "not_configured",
  "timeout",
  "rate_limited",
  "provider_error",
  "auth",
  "refused",
] as const;
export type LlmUnavailableReason = (typeof LLM_UNAVAILABLE_REASONS)[number];

export const LLM_PROVIDER_UNAVAILABLE = "LLM_PROVIDER_UNAVAILABLE";
export const LLM_OUTPUT_INVALID = "LLM_OUTPUT_INVALID";

/**
 * The provider cannot be used (not configured, down, rate-limited, refused). Callers show the
 * fallback state and never retry. `causeCode` is a short, log-safe detail for diagnosis
 * (`bad_request`, `finish_max_tokens`, ...; #65); the fallback reason stays `reason`. `usage`
 * holds the tokens of a response that was received and then rejected.
 */
export class LlmProviderUnavailableError extends AppError {
  readonly reason: LlmUnavailableReason;
  readonly causeCode: string | null;
  readonly usage?: LlmUsage;

  constructor(
    message: string,
    options: ErrorOptions & {
      reason?: LlmUnavailableReason;
      causeCode?: string;
      usage?: LlmUsage;
    } = {},
  ) {
    const { reason = "provider_error", causeCode = null, usage, ...errorOptions } = options;
    super(LLM_PROVIDER_UNAVAILABLE, message, errorOptions);
    this.reason = reason;
    this.causeCode = causeCode;
    if (usage) this.usage = usage;
  }
}

/**
 * The provider answered, but not with JSON that matches the schema. It counts as an attempt:
 * the caller may ask once more (Copilot spec A11). `usage` holds the rejected response's tokens,
 * so the `copilot.answer` log counts them (#65).
 */
export class LlmOutputInvalidError extends AppError {
  readonly usage?: LlmUsage;

  constructor(message: string, options: ErrorOptions & { usage?: LlmUsage } = {}) {
    const { usage, ...errorOptions } = options;
    super(LLM_OUTPUT_INVALID, message, errorOptions);
    if (usage) this.usage = usage;
  }
}

/**
 * How a failed `generateStructured` call ended, matched by the stable `code` (never
 * `instanceof`, which fails when a bundler duplicates the module). `null`: not an LLM failure.
 */
export function llmFailureOf(
  error: unknown,
): { kind: "unavailable"; reason: LlmUnavailableReason } | { kind: "invalid_output" } | null {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  if (error.code === LLM_OUTPUT_INVALID) return { kind: "invalid_output" };
  if (error.code !== LLM_PROVIDER_UNAVAILABLE) return null;
  const reason = "reason" in error ? error.reason : undefined;
  return {
    kind: "unavailable",
    reason: LLM_UNAVAILABLE_REASONS.find((known) => known === reason) ?? "provider_error",
  };
}

const tokenCount = z.number().int().min(0).nullable().catch(null);
const llmUsageSchema = z.object({
  inputTokens: tokenCount,
  outputTokens: tokenCount,
  thinkingTokens: tokenCount,
});

/** The tokens a failed call still used (read structurally, like `llmFailureOf`); else undefined. */
export function llmUsageOf(error: unknown): LlmUsage | undefined {
  if (typeof error !== "object" || error === null || !("usage" in error)) return undefined;
  const parsed = llmUsageSchema.safeParse(error.usage);
  return parsed.success ? parsed.data : undefined;
}

const CAUSE_CODE = /^[a-z0-9_]{1,40}$/;

/** A failure's short cause code when it is a safe log token (`bad_request`); else null. */
export function llmCauseCodeOf(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("causeCode" in error)) return null;
  const code = error.causeCode;
  return typeof code === "string" && CAUSE_CODE.test(code) ? code : null;
}

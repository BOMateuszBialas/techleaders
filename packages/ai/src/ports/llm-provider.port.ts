import { AppError } from "@commerceos/core";
import type { z } from "zod";

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
};

export type StructuredGenerationResult<T> = {
  data: T;
  model: string;
  latencyMs: number;
};

export interface LlmProviderPort {
  readonly name: string;
  readonly isConfigured: boolean;
  generateStructured<T>(
    request: StructuredGenerationRequest<T>,
  ): Promise<StructuredGenerationResult<T>>;
}

/** The provider cannot be used (not configured, down, rate-limited). Callers show the fallback state. */
export class LlmProviderUnavailableError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super("LLM_PROVIDER_UNAVAILABLE", message, options);
  }
}

import type { z } from "zod";

/**
 * Provider-independent LLM port. Concrete adapters (one per vendor) live in
 * this package and are selected in the app's composition root via LLM_PROVIDER.
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

export interface LlmProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  generateStructured<T>(
    request: StructuredGenerationRequest<T>,
  ): Promise<StructuredGenerationResult<T>>;
}

export class LlmProviderUnavailableError extends Error {
  override readonly name = "LlmProviderUnavailableError";
}

/**
 * Used when no provider credentials are configured. It never fabricates a
 * response; callers must catch the error and show the fallback state.
 */
export class UnconfiguredLlmProvider implements LlmProvider {
  readonly name = "unconfigured";
  readonly isConfigured = false;

  async generateStructured<T>(): Promise<StructuredGenerationResult<T>> {
    throw new LlmProviderUnavailableError(
      "No LLM provider is configured. Set LLM_PROVIDER, LLM_API_KEY and LLM_MODEL.",
    );
  }
}

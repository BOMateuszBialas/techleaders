import {
  LlmProviderUnavailableError,
  type LlmProviderPort,
  type StructuredGenerationResult,
} from "../ports/llm-provider.port";

/**
 * Used when no provider credentials are configured. It never fabricates a
 * response; callers must catch the error and show the fallback state.
 */
export class UnconfiguredLlmProvider implements LlmProviderPort {
  readonly name = "unconfigured";
  readonly isConfigured = false;

  async generateStructured<T>(): Promise<StructuredGenerationResult<T>> {
    throw new LlmProviderUnavailableError(
      "No LLM provider is configured. Set LLM_PROVIDER, LLM_API_KEY and LLM_MODEL.",
      { reason: "not_configured" },
    );
  }
}

import {
  llmCauseCodeOf,
  llmFailureOf,
  llmUsageOf,
  LlmProviderUnavailableError,
  type LlmProviderPort,
  type LlmUnavailableReason,
  type LlmUsage,
  type StructuredGenerationRequest,
  type StructuredGenerationResult,
} from "../../ports/llm-provider.port";
import type { TokenTotals } from "./case-result";

/** The cause code of a call the eval budget refused; never a provider error (spec A5). */
export const EVAL_BUDGET_CAUSE = "eval_budget";

/**
 * The live call budget of one eval run (spec A2), shared by every case. `remaining` is checked
 * before a case starts; `take` before each call, so no call can ever exceed `limit`.
 */
export class CallBudget {
  private spent = 0;

  constructor(readonly limit: number) {}

  get used(): number {
    return this.spent;
  }

  get remaining(): number {
    return this.limit - this.spent;
  }

  take(): boolean {
    if (this.spent >= this.limit) return false;
    this.spent += 1;
    return true;
  }
}

/**
 * Wraps the provider of one eval case: records what was sent (checked for ids, never printed),
 * the reported latency, tokens and model, and the provider's own failure reason, and enforces the
 * run's call budget when one is given.
 */
export class RecordingLlmProvider implements LlmProviderPort {
  readonly requests: StructuredGenerationRequest<unknown>[] = [];
  readonly tokens: TokenTotals = { input: 0, output: 0, thinking: 0 };
  latencyMs: number | null = null;
  model: string | null = null;
  /** The reason of the last failure the wrapped provider reported (a budget refusal is not one). */
  providerFailure: LlmUnavailableReason | null = null;
  /** Its log-safe cause code, when the provider gave one. */
  providerCause: string | null = null;

  constructor(
    private readonly inner: LlmProviderPort,
    private readonly budget?: CallBudget,
  ) {}

  get name(): string {
    return this.inner.name;
  }

  get isConfigured(): boolean {
    return this.inner.isConfigured;
  }

  async generateStructured<T>(
    request: StructuredGenerationRequest<T>,
  ): Promise<StructuredGenerationResult<T>> {
    if (this.budget && !this.budget.take()) {
      throw new LlmProviderUnavailableError("The eval call budget is spent.", {
        reason: "rate_limited",
        causeCode: EVAL_BUDGET_CAUSE,
      });
    }
    this.requests.push(request);
    try {
      const result = await this.inner.generateStructured(request);
      this.latencyMs = (this.latencyMs ?? 0) + result.latencyMs;
      this.model = result.model;
      this.addUsage(result.usage);
      return result;
    } catch (error) {
      this.addUsage(llmUsageOf(error));
      const failure = llmFailureOf(error);
      if (failure?.kind === "unavailable") {
        this.providerFailure = failure.reason;
        this.providerCause = llmCauseCodeOf(error);
      }
      throw error;
    }
  }

  private addUsage(usage: LlmUsage | undefined): void {
    this.tokens.input += usage?.inputTokens ?? 0;
    this.tokens.output += usage?.outputTokens ?? 0;
    this.tokens.thinking += usage?.thinkingTokens ?? 0;
  }
}

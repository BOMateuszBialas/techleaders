import type { Clock, MetricPeriod, RateLimiterPort } from "@commerceos/core";
import { describeGroundingIssues, findGroundingIssues } from "../grounding/find-grounding-issues";
import type { CopilotLogValue } from "../ports/copilot-log.port";
import {
  llmCauseCodeOf,
  llmFailureOf,
  llmUsageOf,
  type LlmMessage,
  type LlmProviderPort,
  type LlmUsage,
  type StructuredGenerationResult,
} from "../ports/llm-provider.port";
import {
  COPILOT_PROMPT_VERSION,
  PERIOD_DAYS,
  buildCopilotMessages,
} from "../prompts/copilot-system.prompt";
import {
  copilotModelOutputSchema,
  type CopilotModelOutput,
} from "../schemas/copilot-model-output.schema";
import type { FactTable } from "./build-facts";
import type { FallbackReason } from "./copilot-answer";
import type { CopilotDraft } from "./rule-insights";

/** Store-wide: 100 LLM attempts per day, consumed per attempt (Copilot spec A4). */
export const LLM_DAILY_KEY = "copilot:llm:day";
export const LLM_DAILY_LIMIT = 100;
export const LLM_DAILY_WINDOW_SECONDS = 86_400;

/** Copilot spec A11: at most 2 attempts, 20 s each, one 40 s deadline, 4 000 output tokens. */
export const MAX_ATTEMPTS = 2;
export const ATTEMPT_TIMEOUT_MS = 20_000;
export const DEADLINE_MS = 40_000;
/** The second attempt runs only when at least this much of the deadline remains. */
export const MIN_RETRY_MS = 10_000;
export const MAX_OUTPUT_TOKENS = 4_000;

export const INVALID_OUTPUT_PROBLEM =
  "Your previous answer was not valid JSON that matches the response schema. Write the whole answer again, following the schema exactly.";

export type GenerationDeps = {
  llmProvider: LlmProviderPort;
  rateLimiter: RateLimiterPort;
  clock: Clock;
};

export type GenerationInput = {
  /** The canonical D09 question of the routed intent (A3), never the owner's text. */
  question: string;
  period: MetricPeriod;
  table: FactTable;
  /** The rule-based answer: shown whenever the model's is not. */
  baseline: CopilotDraft;
};

export type Generation = {
  draft: CopilotDraft;
  origin: "llm" | "rules";
  fallbackReason: FallbackReason | null;
  model: string | null;
  provider: string;
  attempts: number;
  /** Why attempts were rejected: grounding codes and `invalid_output`, without repeats. */
  issueCodes: string[];
  /** A provider failure's short cause (`bad_request`, `finish_max_tokens`, ...; #65), else null. */
  providerCause: string | null;
  /** Tokens of every attempt, rejected ones included (#65). */
  usage: LlmUsage;
};

function addUsage(total: LlmUsage, usage: LlmUsage | undefined): LlmUsage {
  const sum = (a: number | null, b: number | null | undefined) =>
    b === null || b === undefined ? a : (a ?? 0) + b;
  return {
    inputTokens: sum(total.inputTokens, usage?.inputTokens),
    outputTokens: sum(total.outputTokens, usage?.outputTokens),
    thinkingTokens: sum(total.thinkingTokens, usage?.thinkingTokens),
  };
}

/**
 * The generation path (Copilot spec, "AskCopilotUseCase flow"): without a configured provider
 * the rule-based answer is returned at once. Otherwise up to 2 structured-output attempts within
 * one 40 s deadline, each counted against the daily cap; an answer is accepted only when it has
 * no grounding issue. A second attempt carries the problem codes (never the model's text) and
 * runs only when 10 s remain. Provider failures (timeout, 429, 5xx, auth, refusal) are not
 * retried. Every path that does not end in an accepted answer returns the baseline with the
 * reason, so an LLM failure is never an HTTP error and never a partial model answer.
 */
export async function generateAnswer(
  deps: GenerationDeps,
  input: GenerationInput,
): Promise<Generation> {
  const { llmProvider, rateLimiter, clock } = deps;
  let attempts = 0;
  let usage: LlmUsage = { inputTokens: null, outputTokens: null, thinkingTokens: null };
  const issueCodes = new Set<string>();
  let providerCause: string | null = null;
  const result = (
    fields: Pick<Generation, "draft" | "origin" | "fallbackReason" | "model">,
  ): Generation => ({
    ...fields,
    provider: llmProvider.name,
    attempts,
    issueCodes: [...issueCodes],
    providerCause,
    usage,
  });
  const rules = (reason: FallbackReason) =>
    result({ draft: input.baseline, origin: "rules", fallbackReason: reason, model: null });

  if (!llmProvider.isConfigured) return rules("not_configured");

  const deadline = clock().getTime() + DEADLINE_MS;
  const signal = AbortSignal.timeout(DEADLINE_MS);
  const base = buildCopilotMessages(input);
  let messages: LlmMessage[] = base;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const remaining = deadline - clock().getTime();
    if (attempt > 1 && remaining < MIN_RETRY_MS) break;
    const daily = await rateLimiter.consume(
      LLM_DAILY_KEY,
      LLM_DAILY_LIMIT,
      LLM_DAILY_WINDOW_SECONDS,
    );
    if (!daily.allowed) return rules("daily_limit");
    attempts += 1;

    let output: StructuredGenerationResult<CopilotModelOutput>;
    try {
      output = await llmProvider.generateStructured({
        messages,
        schema: copilotModelOutputSchema,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        timeoutMs: Math.min(ATTEMPT_TIMEOUT_MS, remaining),
        signal,
      });
    } catch (error) {
      // A response rejected after it arrived still used tokens.
      usage = addUsage(usage, llmUsageOf(error));
      const failure = llmFailureOf(error);
      if (failure?.kind === "invalid_output") {
        issueCodes.add("invalid_output");
        messages = [...base, { role: "user", content: INVALID_OUTPUT_PROBLEM }];
        continue;
      }
      providerCause = llmCauseCodeOf(error);
      // An unclassified error (an adapter bug) is still an AI failure: rules, not a 500.
      return rules(failure?.reason ?? "provider_error");
    }

    usage = addUsage(usage, output.usage);
    const issues = findGroundingIssues(output.data, input.table, {
      periodDays: PERIOD_DAYS[input.period.preset],
    });
    if (issues.length === 0) {
      return result({
        draft: output.data,
        origin: "llm",
        fallbackReason: null,
        model: output.model,
      });
    }
    issues.forEach((issue) => issueCodes.add(issue.code));
    messages = [...base, { role: "user", content: describeGroundingIssues(issues) }];
  }
  return rules("invalid_output");
}

/**
 * The generation's part of the `copilot.answer` event: counts, codes and names only. Token
 * counts are logged as `usage*` because the server logger redacts any key containing "token".
 */
export function generationLogFields(
  generation: Generation | undefined,
): Record<string, CopilotLogValue> {
  return {
    provider: generation?.provider ?? null,
    model: generation?.model ?? null,
    promptVersion: generation && generation.attempts > 0 ? COPILOT_PROMPT_VERSION : null,
    attempts: generation?.attempts ?? 0,
    issueCodes: generation?.issueCodes ?? [],
    providerCause: generation?.providerCause ?? null,
    usageInput: generation?.usage.inputTokens ?? null,
    usageOutput: generation?.usage.outputTokens ?? null,
    usageThinking: generation?.usage.thinkingTokens ?? null,
  };
}

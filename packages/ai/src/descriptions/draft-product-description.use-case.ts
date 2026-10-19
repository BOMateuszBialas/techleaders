import {
  CATEGORY_CHOICE_MESSAGE,
  TooManyRequestsError,
  ValidationError,
  descriptionDraftSchema,
  hasAppErrorCode,
  isNotFoundError,
  parseInput,
  type Clock,
  type DescriptionDraftInput,
  type GetCategoryUseCase,
  type RateLimiterPort,
} from "@commerceos/core";
import {
  describeDescriptionIssues,
  findDescriptionIssues,
} from "../grounding/find-description-issues";
import { consumeLlmDailyAttempt } from "../llm/llm-daily-cap";
import { addLlmUsage, NO_LLM_USAGE } from "../llm/llm-usage";
import type { CopilotLogPort, CopilotLogValue } from "../ports/copilot-log.port";
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
  buildProductDescriptionMessages,
  PRODUCT_DESCRIPTION_PROMPT_VERSION,
} from "../prompts/product-description.prompt";
import {
  productDescriptionOutputSchema,
  type ProductDescriptionOutput,
} from "../schemas/product-description-output.schema";
import type { DescriptionDraftDto, DescriptionUnavailableReason } from "./description-draft.dto";
import {
  buildDescriptionSources,
  stripDemoMarker,
  type DescriptionSources,
} from "./description-sources";

/** Per owner: 5 drafts per 10 minutes (descriptions spec A2). */
export const DRAFT_LIMIT = 5;
export const DRAFT_WINDOW_SECONDS = 600;
export const DRAFT_RATE_LIMITED_MESSAGE =
  "You asked for many drafts in a short time. Try again in a few minutes.";

/** A7: at most 2 attempts, min(15 s, time left) each, one 30 s deadline, 1 500 output tokens. */
export const DRAFT_MAX_ATTEMPTS = 2;
export const DRAFT_ATTEMPT_TIMEOUT_MS = 15_000;
export const DRAFT_DEADLINE_MS = 30_000;
/** The second attempt runs only when at least this much of the deadline remains. */
export const DRAFT_MIN_RETRY_MS = 10_000;
export const DRAFT_MAX_OUTPUT_TOKENS = 1_500;

export const DEMO_PREFIX = "[DEMO] ";

export type DraftProductDescriptionDeps = {
  llmProvider: LlmProviderPort;
  rateLimiter: RateLimiterPort;
  getCategoryUseCase: GetCategoryUseCase;
  copilotLog: CopilotLogPort;
  clock: Clock;
};

type Outcome = "draft" | "unavailable" | "rate_limited" | "invalid_category" | "error";

/** What one request did, for the `description.draft` log event: counts and codes, never text. */
type Trace = {
  outcome: Outcome;
  reason: DescriptionUnavailableReason | null;
  attempts: number;
  issueCodes: Set<string>;
  providerCause: string | null;
  model: string | null;
  usage: LlmUsage;
  sources: DescriptionSources | null;
  draftChars: number | null;
};

/**
 * Drafts a product description from the values in the product form (descriptions spec,
 * "DraftProductDescriptionUseCase flow"): no call without a configured provider or with too
 * little input; a per-owner limit; up to 2 attempts within one 30 s deadline, each counted
 * against the store's shared daily LLM cap; a draft is returned only when it passes
 * `findDescriptionIssues`. It reads one category's name and writes nothing but the rate-limit
 * counters: it has no catalog-writing dependency (D02, N04), and the owner saves a draft only
 * through the product form.
 */
export class DraftProductDescriptionUseCase {
  constructor(private readonly deps: DraftProductDescriptionDeps) {}

  async execute(input: unknown, admin: { id: string }): Promise<DescriptionDraftDto> {
    const request = parseInput(descriptionDraftSchema, input);
    const started = Date.now();
    const trace: Trace = {
      outcome: "error",
      reason: null,
      attempts: 0,
      issueCodes: new Set(),
      providerCause: null,
      model: null,
      usage: NO_LLM_USAGE,
      sources: null,
      draftChars: null,
    };
    try {
      const result = await this.draft(request, admin, trace);
      trace.outcome = result.kind;
      if (result.kind === "unavailable") trace.reason = result.reason;
      else trace.draftChars = result.text.length;
      return result;
    } catch (error) {
      if (hasAppErrorCode(error, "RATE_LIMITED")) {
        trace.outcome = "rate_limited";
      } else if (hasAppErrorCode(error, "VALIDATION_FAILED")) {
        trace.outcome = "invalid_category";
      }
      throw error;
    } finally {
      this.deps.copilotLog.info(
        "description.draft",
        logFields(trace, this.deps.llmProvider.name, Date.now() - started),
      );
    }
  }

  private async draft(
    request: DescriptionDraftInput,
    admin: { id: string },
    trace: Trace,
  ): Promise<DescriptionDraftDto> {
    const { llmProvider, rateLimiter, clock } = this.deps;
    const unavailable = (reason: DescriptionUnavailableReason): DescriptionDraftDto => ({
      kind: "unavailable",
      reason,
    });
    if (!llmProvider.isConfigured) return unavailable("not_configured");

    const sources = buildDescriptionSources(request, await this.categoryName(request.categoryId));
    trace.sources = sources;
    if (sources.insufficient) return unavailable("insufficient_input");

    const limit = await rateLimiter.consume(
      `descriptions:draft:${admin.id}`,
      DRAFT_LIMIT,
      DRAFT_WINDOW_SECONDS,
    );
    if (!limit.allowed) throw new TooManyRequestsError(DRAFT_RATE_LIMITED_MESSAGE);

    const deadline = clock().getTime() + DRAFT_DEADLINE_MS;
    const signal = AbortSignal.timeout(DRAFT_DEADLINE_MS);
    const base = buildProductDescriptionMessages(sources);
    let messages: LlmMessage[] = base;

    for (let attempt = 1; attempt <= DRAFT_MAX_ATTEMPTS; attempt += 1) {
      const remaining = deadline - clock().getTime();
      if (attempt > 1 && remaining < DRAFT_MIN_RETRY_MS) break;
      if (!(await consumeLlmDailyAttempt(rateLimiter))) return unavailable("daily_limit");
      trace.attempts += 1;

      let output: StructuredGenerationResult<ProductDescriptionOutput>;
      try {
        output = await llmProvider.generateStructured({
          messages,
          schema: productDescriptionOutputSchema,
          maxOutputTokens: DRAFT_MAX_OUTPUT_TOKENS,
          timeoutMs: Math.min(DRAFT_ATTEMPT_TIMEOUT_MS, remaining),
          signal,
        });
      } catch (error) {
        // A response rejected after it arrived still used tokens.
        trace.usage = addLlmUsage(trace.usage, llmUsageOf(error));
        const failure = llmFailureOf(error);
        if (failure?.kind === "invalid_output") {
          trace.issueCodes.add("schema");
          const note = describeDescriptionIssues([{ code: "schema" }]);
          messages = [...base, { role: "user", content: note }];
          continue;
        }
        trace.providerCause = llmCauseCodeOf(error);
        // No retry; an unclassified error (an adapter bug) is still an AI failure, not a 500.
        return unavailable(failure?.reason ?? "provider_error");
      }

      trace.usage = addLlmUsage(trace.usage, output.usage);
      const text = stripDemoMarker(output.data.description);
      const issues = findDescriptionIssues(text, sources);
      if (issues.length === 0) {
        trace.model = output.model;
        return {
          kind: "draft",
          text: sources.demo ? `${DEMO_PREFIX}${text}` : text,
          model: output.model,
          promptVersion: PRODUCT_DESCRIPTION_PROMPT_VERSION,
          fieldsUsed: sources.fieldsUsed,
          demoMarked: sources.demo,
        };
      }
      issues.forEach((issue) => trace.issueCodes.add(issue.code));
      messages = [...base, { role: "user", content: describeDescriptionIssues(issues) }];
    }
    return unavailable("invalid_output");
  }

  /** The category's name; an unknown id is a field error on `categoryId` (400). */
  private async categoryName(categoryId: string | null): Promise<string | null> {
    if (categoryId === null) return null;
    try {
      return (await this.deps.getCategoryUseCase.execute({ id: categoryId })).name;
    } catch (error) {
      if (!isNotFoundError(error)) throw error;
      throw new ValidationError(CATEGORY_CHOICE_MESSAGE, { categoryId: [CATEGORY_CHOICE_MESSAGE] });
    }
  }
}

/**
 * The `description.draft` event (A13): outcome, reason, attempts, issue codes, provider, model,
 * prompt version, latency, token usage and character counts. Never a field value, the prompt or
 * the draft. Token counts are logged as `usage*`: the server logger redacts keys with "token".
 */
function logFields(
  trace: Trace,
  provider: string,
  latencyMs: number,
): Record<string, CopilotLogValue> {
  const fields = trace.sources?.fields;
  return {
    outcome: trace.outcome,
    fallbackReason: trace.reason,
    attempts: trace.attempts,
    issueCodes: [...trace.issueCodes],
    provider,
    providerCause: trace.providerCause,
    model: trace.model,
    promptVersion: trace.attempts > 0 ? PRODUCT_DESCRIPTION_PROMPT_VERSION : null,
    usageInput: trace.usage.inputTokens,
    usageOutput: trace.usage.outputTokens,
    usageThinking: trace.usage.thinkingTokens,
    nameChars: fields?.name.length ?? null,
    categoryChars: fields?.category.length ?? null,
    priceChars: fields?.price.length ?? null,
    notesChars: fields?.notes.length ?? null,
    draftChars: trace.draftChars,
    demo: trace.sources?.demo ?? null,
    latencyMs,
  };
}

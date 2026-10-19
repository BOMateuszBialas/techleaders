import { isDeepStrictEqual } from "node:util";
import {
  GetLowStockProductsUseCase,
  GetOrderSummaryUseCase,
  GetSalesSummaryUseCase,
  GetTopProductsUseCase,
  GetTrafficSummaryUseCase,
  SaveCopilotAnswerUseCase,
  type CopilotRecommendationRepositoryPort,
  type RateLimiterPort,
} from "@commerceos/core";
import { UnconfiguredLlmProvider } from "../../adapters/unconfigured-llm-provider";
import { AskCopilotUseCase } from "../../copilot/ask-copilot.use-case";
import type { CopilotAnswerDto } from "../../copilot/copilot-answer";
import { NOW } from "../../copilot/copilot-results.fixture";
import { DEMO_TRAFFIC_LIMITATION } from "../../copilot/expand-response";
import { INTENTS } from "../../copilot/intents";
import type { LlmProviderPort, StructuredGenerationRequest } from "../../ports/llm-provider.port";
import { copilotResponseSchema } from "../../schemas/copilot-response.schema";
import { GetLowStockProductsTool } from "../../tools/get-low-stock-products.tool";
import { GetOrderSummaryTool } from "../../tools/get-order-summary.tool";
import { GetSalesSummaryTool } from "../../tools/get-sales-summary.tool";
import { GetTopProductsTool } from "../../tools/get-top-products.tool";
import { GetTrafficSummaryTool } from "../../tools/get-traffic-summary.tool";
import type { EvalCase } from "../eval-case";
import { EVAL_IDS, evalStore, evalTraffic, type EvalStoreKind } from "../eval-store";
import { ScriptedLlmProvider } from "../scripted-llm-provider";
import {
  check,
  quoted,
  statusOf,
  type CaseResult,
  type EvalMode,
  type PropertyResult,
} from "./case-result";
import { type CallBudget, RecordingLlmProvider } from "./recording-llm-provider";

export const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Evals check what is shown; storing works like the demo store's and is tested in Phase 4. */
export const evalRecommendations: CopilotRecommendationRepositoryPort = {
  saveAnswer: async (answer) => ({
    answerId: "eval-answer",
    recommendationIds: answer.recommendations.map((_, index) => `eval-${index + 1}`),
  }),
  listByStatus: async () => ({ rows: [], total: 0 }),
  changeStatus: async () => ({ kind: "not_found" }),
};

/** The real Copilot over an eval store: real tools, facts, rules, grounding and expansion. */
export function buildEvalCopilot(
  store: EvalStoreKind,
  llmProvider: LlmProviderPort,
): AskCopilotUseCase {
  const storeMetrics = evalStore(store);
  const rateLimiter: RateLimiterPort = { consume: async () => ({ allowed: true, remaining: 1 }) };
  return new AskCopilotUseCase({
    getSalesSummaryTool: new GetSalesSummaryTool({
      getSalesSummaryUseCase: new GetSalesSummaryUseCase({ storeMetrics }),
    }),
    getOrderSummaryTool: new GetOrderSummaryTool({
      getOrderSummaryUseCase: new GetOrderSummaryUseCase({ storeMetrics }),
    }),
    getTopProductsTool: new GetTopProductsTool({
      getTopProductsUseCase: new GetTopProductsUseCase({ storeMetrics }),
    }),
    getLowStockProductsTool: new GetLowStockProductsTool({
      getLowStockProductsUseCase: new GetLowStockProductsUseCase({ storeMetrics }),
    }),
    getTrafficSummaryTool: new GetTrafficSummaryTool({
      getTrafficSummaryUseCase: new GetTrafficSummaryUseCase({
        trafficStats: evalTraffic(store),
        getSalesSummaryUseCase: new GetSalesSummaryUseCase({ storeMetrics }),
        getTopProductsUseCase: new GetTopProductsUseCase({ storeMetrics }),
      }),
    }),
    llmProvider,
    rateLimiter,
    copilotLog: { info: () => {} },
    clock: () => NOW,
    saveCopilotAnswerUseCase: new SaveCopilotAnswerUseCase({
      copilotRecommendationRepository: evalRecommendations,
    }),
  });
}

/** Runs one case with the given provider (scripted offline, the real one live). */
export async function executeCopilotCase(
  evalCase: EvalCase,
  provider: RecordingLlmProvider,
): Promise<CopilotAnswerDto> {
  return buildEvalCopilot(evalCase.store, provider).execute(evalCase.request, { id: "eval" });
}

/** The rule-based answer the same request gets without a model (Copilot spec A12). */
export function rulesAnswerOf(evalCase: EvalCase): Promise<CopilotAnswerDto> {
  return buildEvalCopilot(evalCase.store, new UnconfiguredLlmProvider()).execute(evalCase.request, {
    id: "eval",
  });
}

/** `llm`, `rules: invalid_output`, `rules`, `declined` or `unsupported`. */
export function describeCopilotOutcome(
  outcome: Pick<CopilotAnswerDto, "kind" | "origin" | "fallbackReason">,
): string {
  if (outcome.kind !== "answered") return outcome.kind;
  if (outcome.origin === "llm") return "llm";
  return outcome.fallbackReason ? `rules: ${outcome.fallbackReason}` : "rules";
}

/** Whether the model's answer was shown; `null` when none was expected or the provider failed. */
export function copilotAccepted(answer: CopilotAnswerDto): boolean | null {
  if (answer.kind !== "answered") return null;
  if (answer.origin === "llm") return true;
  return answer.fallbackReason === "invalid_output" ? false : null;
}

/**
 * The properties of one Copilot answer (Copilot spec A19). Offline, the outcome (kind, origin,
 * reason, calls) must match the case; live, it is only reported (eval-script spec A4). Every
 * other property holds whatever the model did.
 */
export function checkCopilotAnswer(
  evalCase: EvalCase,
  mode: EvalMode,
  answer: CopilotAnswerDto,
  requests: readonly StructuredGenerationRequest<unknown>[],
  rules: CopilotAnswerDto | null,
): PropertyResult[] {
  const { expected } = evalCase;
  const properties: PropertyResult[] = [];

  if (mode === "offline") {
    const actual = `${describeCopilotOutcome(answer)} · ${requests.length} call(s)`;
    const wanted = `${describeCopilotOutcome(expected)} · ${expected.llmCalls} call(s)`;
    properties.push(
      check(
        "outcome",
        answer.kind === expected.kind &&
          answer.origin === expected.origin &&
          answer.fallbackReason === expected.fallbackReason &&
          requests.length === expected.llmCalls,
        `expected ${wanted}, got ${actual}`,
      ),
    );
  }

  // The displayed contract holds whatever the model did: at most 3, every field valid.
  properties.push(
    check(
      "contract",
      copilotResponseSchema.safeParse({
        summary: answer.summary,
        recommendations: answer.recommendations,
      }).success,
      "the shown answer fails the response schema",
    ),
  );

  if (expected.absent) {
    const shown = JSON.stringify(answer);
    const found = expected.absent.filter((text) => shown.includes(text));
    properties.push(
      check(
        "absent_text",
        found.length === 0,
        `the shown answer contains a forbidden string: ${found.map(quoted).join(", ")}`,
      ),
    );
  }

  if (expected.missingData) {
    properties.push(
      check(
        "missing_data",
        answer.missingData === expected.missingData,
        `the answer does not name the missing data ${quoted(expected.missingData)}`,
      ),
    );
  }

  if (expected.demoLabelled) {
    const evidence = [
      ...answer.summaryEvidence,
      ...answer.recommendations.flatMap((recommendation) => recommendation.evidence),
    ];
    properties.push(
      check(
        "demo_labels",
        evidence.length > 0 &&
          evidence.every((row) => row.demo) &&
          answer.limitations.includes(DEMO_TRAFFIC_LIMITATION),
        "demo traffic evidence is not flagged demo, or the demo limitation is missing",
      ),
    );
  }

  if (rules) {
    // Never a partial model answer: a fallback is exactly the rule-based answer.
    properties.push(
      check(
        "fallback_is_rules",
        isDeepStrictEqual({ ...answer, fallbackReason: null }, { ...rules, fallbackReason: null }),
        "the fallback differs from the rule-based answer",
      ),
    );
  }

  // A3: every request carries a canonical question and no product id.
  const sent = requests.map((request) => JSON.stringify(request.messages));
  properties.push(
    check(
      "no_ids_sent",
      sent.every((text) => !UUID.test(text)),
      "a request to the model carries a product id",
    ),
  );
  properties.push(
    check(
      "canonical_question",
      sent.every((text) => Object.values(INTENTS).some((intent) => text.includes(intent.question))),
      "a request to the model carries no canonical question",
    ),
  );

  // Related products are resolved by the server to real ids only.
  const ids = new Set<string>(Object.values(EVAL_IDS));
  properties.push(
    check(
      "related_ids_real",
      answer.recommendations.every((recommendation) =>
        (recommendation.relatedProductIds ?? []).every((id) => ids.has(id)),
      ),
      "a recommendation links a product id that is not in the store",
    ),
  );
  return properties;
}

/**
 * Runs and checks one Copilot case. Offline the case's script answers; live `liveProvider`
 * does, through the run's call budget.
 */
export async function runCopilotCase(
  evalCase: EvalCase,
  options:
    { mode: "offline" } | { mode: "live"; liveProvider: LlmProviderPort; budget: CallBudget },
): Promise<CaseResult> {
  const provider =
    options.mode === "offline"
      ? new RecordingLlmProvider(new ScriptedLlmProvider(evalCase.script))
      : new RecordingLlmProvider(options.liveProvider, options.budget);
  const answer = await executeCopilotCase(evalCase, provider);
  const fellBack = answer.kind === "answered" && answer.origin === "rules";
  const rules = fellBack ? await rulesAnswerOf(evalCase) : null;
  const properties = checkCopilotAnswer(evalCase, options.mode, answer, provider.requests, rules);
  const unavailable = options.mode === "live" && provider.providerFailure !== null;
  return {
    set: "copilot",
    id: evalCase.id,
    covers: evalCase.covers,
    mode: options.mode,
    status: statusOf(properties, unavailable),
    outcome: describeCopilotOutcome(answer),
    accepted: copilotAccepted(answer),
    providerFailure: provider.providerFailure,
    providerCause: provider.providerCause,
    attempts: provider.requests.length,
    latencyMs: provider.latencyMs,
    tokens: provider.tokens,
    model: provider.model,
    issueCodes: [],
    properties,
  };
}

import {
  METRIC_PERIOD_LABELS,
  TooManyRequestsError,
  askCopilotSchema,
  parseInput,
  previousPeriod,
  resolvePeriod,
  type Clock,
  type MetricPeriod,
  type NewCopilotRecommendation,
  type RateLimiterPort,
  type SaveCopilotAnswerUseCase,
} from "@commerceos/core";
import type { CopilotLogPort } from "../ports/copilot-log.port";
import type { LlmProviderPort } from "../ports/llm-provider.port";
import { COPILOT_PROMPT_VERSION } from "../prompts/copilot-system.prompt";
import type { GetLowStockProductsTool } from "../tools/get-low-stock-products.tool";
import type { GetOrderSummaryTool } from "../tools/get-order-summary.tool";
import type { GetSalesSummaryTool } from "../tools/get-sales-summary.tool";
import type { GetTopProductsTool } from "../tools/get-top-products.tool";
import type { GetTrafficSummaryTool } from "../tools/get-traffic-summary.tool";
import { buildFacts, definitionsOf, type CopilotToolResults } from "./build-facts";
import type { CopilotAnswerDto, CopilotAnswerPeriod } from "./copilot-answer";
import { expandDraft, serverLimitations, type ExpandedRecommendation } from "./expand-response";
import { generateAnswer, generationLogFields, type Generation } from "./generate-answer";
import {
  DECLINED_CATEGORIES,
  INTENTS,
  UNSUPPORTED_MESSAGE,
  declinedMessage,
  type ToolPlan,
} from "./intents";
import { routeQuestion, type RoutedQuestion } from "./route-question";
import { buildRuleInsights } from "./rule-insights";

/** Per owner: 10 questions per 10 minutes (Copilot spec A4). */
export const ASK_LIMIT = 10;
export const ASK_WINDOW_SECONDS = 600;
export const ASK_RATE_LIMITED_MESSAGE =
  "You asked many questions in a short time. Try again in a few minutes.";

export type AskCopilotDeps = {
  getSalesSummaryTool: GetSalesSummaryTool;
  getOrderSummaryTool: GetOrderSummaryTool;
  getTopProductsTool: GetTopProductsTool;
  getLowStockProductsTool: GetLowStockProductsTool;
  getTrafficSummaryTool: GetTrafficSummaryTool;
  llmProvider: LlmProviderPort;
  rateLimiter: RateLimiterPort;
  copilotLog: CopilotLogPort;
  clock: Clock;
  /** Stores every answered question's recommendations as `new` (Phase 4, A13). */
  saveCopilotAnswerUseCase: SaveCopilotAnswerUseCase;
};

type Outcome = { answer: CopilotAnswerDto; tools: string[]; generation?: Generation };

function periodDto(period: MetricPeriod): CopilotAnswerPeriod {
  return {
    from: period.from.toISOString(),
    to: period.to.toISOString(),
    name: METRIC_PERIOD_LABELS[period.preset],
    label: period.label,
    timeZone: period.timeZone,
  };
}

/** What is stored of a shown recommendation: its content, never the display-only names. */
function toNewRecommendation(recommendation: ExpandedRecommendation): NewCopilotRecommendation {
  return {
    title: recommendation.title,
    priority: recommendation.priority,
    observation: recommendation.observation,
    evidence: recommendation.evidence,
    reasoning: recommendation.reasoning,
    suggestedAction: recommendation.suggestedAction,
    relatedProductIds: recommendation.relatedProductIds,
    limitations: recommendation.limitations,
  };
}

function emptyAnswer(
  kind: CopilotAnswerDto["kind"],
  summary: string,
): Omit<CopilotAnswerDto, "kind"> & { kind: typeof kind } {
  return {
    answerId: null,
    kind,
    intent: null,
    question: null,
    origin: "rules",
    fallbackReason: null,
    model: null,
    period: null,
    summary,
    summaryEvidence: [],
    recommendations: [],
    limitations: [],
    definitions: [],
  };
}

/**
 * Commerce Copilot (Copilot spec, "AskCopilotUseCase flow"): rate limit → deterministic routing →
 * the intent's fixed tool plan → numbered facts → rule-based insights → an LLM answer when a
 * provider is configured and the answer passes the grounding checks (`generateAnswer`) →
 * expansion → the recommendations stored as `new` (Phase 4), so the owner can save, dismiss or
 * complete them.
 * Declined and unsupported questions run no tool and store nothing. It reads store data only
 * through the approved tools and writes nothing but the rate-limit counters and Copilot's own
 * recommendation records: never store data (D02).
 */
export class AskCopilotUseCase {
  constructor(private readonly deps: AskCopilotDeps) {}

  async execute(input: unknown, admin: { id: string }): Promise<CopilotAnswerDto> {
    const request = parseInput(askCopilotSchema, input);
    const started = Date.now();
    const limit = await this.deps.rateLimiter.consume(
      `copilot:ask:${admin.id}`,
      ASK_LIMIT,
      ASK_WINDOW_SECONDS,
    );
    if (!limit.allowed) throw new TooManyRequestsError(ASK_RATE_LIMITED_MESSAGE);

    const route: RoutedQuestion = request.intent
      ? { kind: "answered", intent: request.intent, period: "7d" }
      : // The schema guarantees a question when no intent is sent.
        routeQuestion(String(request.question));
    const { answer, tools, generation } = await this.answer(route);

    this.deps.copilotLog.info("copilot.answer", {
      kind: answer.kind,
      intent: answer.intent,
      declinedCategory: route.kind === "declined" ? route.category : null,
      source: request.intent ? "suggested" : "typed",
      tools,
      origin: answer.origin,
      fallbackReason: answer.fallbackReason,
      recommendations: answer.recommendations.length,
      answerId: answer.answerId,
      ...generationLogFields(generation),
      latencyMs: Date.now() - started,
    });
    return answer;
  }

  private async answer(route: RoutedQuestion): Promise<Outcome> {
    if (route.kind === "unsupported") {
      return { answer: emptyAnswer("unsupported", UNSUPPORTED_MESSAGE), tools: [] };
    }
    if (route.kind === "declined") {
      const category = DECLINED_CATEGORIES[route.category];
      return {
        answer: {
          ...emptyAnswer("declined", declinedMessage(category)),
          missingData: category.missingData,
        },
        tools: [],
      };
    }

    const intent = INTENTS[route.intent];
    const period = resolvePeriod(route.period, this.deps.clock());
    const { results, tools } = await this.runPlan(intent.plan, period);
    const table = buildFacts(results);
    const baseline = buildRuleInsights(intent.id, table, period);
    const generation = await generateAnswer(this.deps, {
      question: intent.question,
      period,
      table,
      baseline,
    });
    const limitations = serverLimitations(intent.id, results);
    const expanded = expandDraft(generation.draft, table, limitations);
    const llm = generation.origin === "llm";
    // Stored before the answer is returned: a failed insert is a 500 (spec, API Contracts),
    // never cards whose status buttons cannot work. A model answer is lost then, by design.
    const saved = await this.deps.saveCopilotAnswerUseCase.execute({
      intent: intent.id,
      origin: generation.origin,
      fallbackReason: generation.fallbackReason,
      provider: llm ? generation.provider : null,
      model: generation.model,
      promptVersion: llm ? COPILOT_PROMPT_VERSION : null,
      periodFrom: period.from,
      periodTo: period.to,
      recommendations: expanded.recommendations.map(toNewRecommendation),
    });
    return {
      answer: {
        ...emptyAnswer("answered", expanded.summary),
        answerId: saved.answerId,
        intent: intent.id,
        question: intent.question,
        origin: generation.origin,
        fallbackReason: generation.fallbackReason,
        model: generation.model,
        period: periodDto(period),
        summaryEvidence: expanded.summaryEvidence,
        recommendations: expanded.recommendations.map((recommendation, index) => ({
          ...recommendation,
          id: saved.recommendationIds[index] ?? null,
        })),
        limitations,
        definitions: definitionsOf(table),
      },
      tools,
      generation,
    };
  }

  /** Runs the plan's tools in parallel; every tool of one answer covers the same instants. */
  private async runPlan(
    plan: ToolPlan,
    period: MetricPeriod,
  ): Promise<{ results: CopilotToolResults; tools: string[] }> {
    const {
      getSalesSummaryTool,
      getOrderSummaryTool,
      getTopProductsTool,
      getLowStockProductsTool,
      getTrafficSummaryTool,
    } = this.deps;
    const compare = plan.compareWithPrevious;
    const previous = compare
      ? { period: previousPeriod(period), topProducts: compare.topProducts }
      : null;
    const tools = new Set<string>();
    const run = <T>(tool: { name: string; run(args: unknown): Promise<T> }, args: unknown) => {
      tools.add(tool.name);
      return tool.run(args);
    };
    const skip = Promise.resolve(undefined);

    const [sales, orders, topProducts, lowStock, previousSales, previousTopProducts, traffic] =
      await Promise.all([
        plan.sales ? run(getSalesSummaryTool, { period }) : skip,
        plan.orders ? run(getOrderSummaryTool, { period }) : skip,
        plan.topProducts ? run(getTopProductsTool, { period, limit: plan.topProducts }) : skip,
        plan.lowStock ? run(getLowStockProductsTool, plan.lowStock) : skip,
        previous ? run(getSalesSummaryTool, { period: previous.period }) : skip,
        previous
          ? run(getTopProductsTool, { period: previous.period, limit: previous.topProducts })
          : skip,
        plan.traffic
          ? run(getTrafficSummaryTool, { period, productLimit: plan.traffic.productLimit })
          : skip,
      ]);
    return {
      results: {
        sales,
        orders,
        topProducts,
        lowStock,
        previousSales,
        previousTopProducts,
        traffic,
      },
      tools: [...tools],
    };
  }
}

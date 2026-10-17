import {
  METRIC_PERIOD_LABELS,
  TooManyRequestsError,
  askCopilotSchema,
  parseInput,
  previousPeriod,
  resolvePeriod,
  type Clock,
  type MetricPeriod,
  type RateLimiterPort,
} from "@commerceos/core";
import type { CopilotLogPort } from "../ports/copilot-log.port";
import type { GetLowStockProductsTool } from "../tools/get-low-stock-products.tool";
import type { GetOrderSummaryTool } from "../tools/get-order-summary.tool";
import type { GetSalesSummaryTool } from "../tools/get-sales-summary.tool";
import type { GetTopProductsTool } from "../tools/get-top-products.tool";
import { buildFacts, definitionsOf, type CopilotToolResults } from "./build-facts";
import type { CopilotAnswerDto, CopilotAnswerPeriod, FallbackReason } from "./copilot-answer";
import { expandDraft, serverLimitations } from "./expand-response";
import {
  DECLINED_CATEGORIES,
  INTENTS,
  TRAFFIC_NOT_AVAILABLE_MESSAGE,
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

/**
 * Phase 1 has no generation path: no provider adapter exists, so every answered question is
 * rule-based and says AI is not configured. Phase 2 adds the provider call and the other reasons.
 */
const PHASE_1_FALLBACK: FallbackReason = "not_configured";

export type AskCopilotDeps = {
  getSalesSummaryTool: GetSalesSummaryTool;
  getOrderSummaryTool: GetOrderSummaryTool;
  getTopProductsTool: GetTopProductsTool;
  getLowStockProductsTool: GetLowStockProductsTool;
  rateLimiter: RateLimiterPort;
  copilotLog: CopilotLogPort;
  clock: Clock;
};

type Outcome = { answer: CopilotAnswerDto; tools: string[] };

function periodDto(period: MetricPeriod): CopilotAnswerPeriod {
  return {
    from: period.from.toISOString(),
    to: period.to.toISOString(),
    name: METRIC_PERIOD_LABELS[period.preset],
    label: period.label,
    timeZone: period.timeZone,
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
    recommendations: [],
    limitations: [],
    definitions: [],
  };
}

/**
 * Commerce Copilot, Phase 1 (Copilot spec, "AskCopilotUseCase flow"): rate limit → deterministic
 * routing → the intent's fixed tool plan → numbered facts → rule-based insights → expansion.
 * Declined and unsupported questions run no tool. It reads store data only through the approved
 * tools and writes nothing but the rate-limit counter.
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
    const { answer, tools } = await this.answer(route);

    this.deps.copilotLog.info("copilot.answer", {
      kind: answer.kind,
      intent: answer.intent,
      declinedCategory: route.kind === "declined" ? route.category : null,
      source: request.intent ? "suggested" : "typed",
      tools,
      origin: answer.origin,
      fallbackReason: answer.fallbackReason,
      recommendations: answer.recommendations.length,
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
    const base = {
      ...emptyAnswer("answered", TRAFFIC_NOT_AVAILABLE_MESSAGE),
      intent: intent.id,
      question: intent.question,
      fallbackReason: PHASE_1_FALLBACK,
    };
    if (!intent.plan) return { answer: base, tools: [] };

    const period = resolvePeriod(route.period, this.deps.clock());
    const { results, tools } = await this.runPlan(intent.plan, period);
    const table = buildFacts(results);
    const draft = buildRuleInsights(intent.id, table, period);
    const limitations = serverLimitations(intent.id, results);
    const expanded = expandDraft(draft, table, limitations);
    return {
      answer: {
        ...base,
        period: periodDto(period),
        summary: expanded.summary,
        recommendations: expanded.recommendations,
        limitations,
        definitions: definitionsOf(table),
      },
      tools,
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

    const [sales, orders, topProducts, lowStock, previousSales, previousTopProducts] =
      await Promise.all([
        plan.sales ? run(getSalesSummaryTool, { period }) : skip,
        plan.orders ? run(getOrderSummaryTool, { period }) : skip,
        run(getTopProductsTool, { period, limit: plan.topProducts }),
        plan.lowStock ? run(getLowStockProductsTool, plan.lowStock) : skip,
        previous ? run(getSalesSummaryTool, { period: previous.period }) : skip,
        previous
          ? run(getTopProductsTool, { period: previous.period, limit: previous.topProducts })
          : skip,
      ]);
    return {
      results: { sales, orders, topProducts, lowStock, previousSales, previousTopProducts },
      tools: [...tools],
    };
  }
}

import type { CopilotIntentId, MetricPeriodPreset } from "@commerceos/core";
import type { DeclinedCategory } from "./intents";

export type RoutedQuestion =
  | { kind: "answered"; intent: CopilotIntentId; period: MetricPeriodPreset }
  | { kind: "declined"; category: DeclinedCategory["id"] }
  | { kind: "unsupported" };

type Rule<T> = { value: T; patterns: readonly RegExp[] };

/**
 * Declined categories (D09, Copilot spec A7), matched before any answered intent so that
 * "conversion rate of social traffic" is declined instead of routed to traffic sources.
 */
const DECLINED_RULES: readonly Rule<DeclinedCategory["id"]>[] = [
  {
    value: "conversion_by_source",
    patterns: [
      /\bconver\w*\b.*\b(sources?|channels?|social|search|email|newsletter|referrals?|direct|ads?|campaigns?)\b/,
      /\b(sources?|channels?|social|search|email|newsletter|referrals?|direct)\b.*\bconver\w*\b/,
    ],
  },
  {
    value: "margin",
    patterns: [/\bmargins?\b/, /\bprofit\w*\b/, /\bcost of goods\b/, /\bcogs\b/, /\bmarkup\b/],
  },
  {
    value: "ad_spend",
    patterns: [/\bad spend\b/, /\broas\b/, /\badvertis\w*\b/, /\bads\b/, /\bcampaigns?\b/],
  },
  {
    value: "demographics",
    patterns: [
      /\bdemographics?\b/,
      /\bsegments?\b/,
      /\bgender\b/,
      /\bage groups?\b/,
      /\bhow old\b/,
      /\bwho (are|is) (my|our) customers?\b/,
      /\bcustomer profiles?\b/,
    ],
  },
  {
    value: "competitors",
    patterns: [/\bcompetitors?\b/, /\bcompetition\b/, /\bcompeting\b/, /\brivals?\b/],
  },
  {
    value: "forecast",
    patterns: [
      /\bforecast\w*\b/,
      /\bpredict\w*\b/,
      /\bprojections?\b/,
      /\bnext (week|month|quarter|year)\b/,
      /\bwill (i|we) (sell|make|earn)\b/,
    ],
  },
];

const SALES_WORDS = String.raw`(sales|sold|revenue|orders?|income|turnover)`;

/**
 * Answered intents, most specific first. "How can I increase sales?" is a focus question; a
 * change that already happened ("why did sales drop") is `sales_change` (A8).
 */
const ANSWERED_RULES: readonly Rule<CopilotIntentId>[] = [
  {
    value: "traffic_sources",
    patterns: [
      /\btraffic\b.*\b(sources?|channels?|come from|comes from|coming from)\b/,
      /\b(sources?|channels?)\b.*\b(traffic|visitors?|sessions?|visits)\b/,
      /\bwhere\b.*\b(traffic|visitors?|sessions?)\b.*\bfrom\b/,
    ],
  },
  {
    value: "funnel",
    patterns: [/\bfunnel\b/, /\bdrop(s|ped)?[- ]?off\b/, /\babandon\w*\b/],
  },
  {
    value: "views_without_sales",
    patterns: [/\b(views?|viewed|page ?views)\b/, /\blooked at\b/],
  },
  {
    value: "low_stock",
    patterns: [
      /\b(low on|low|out of|in) stock\b/,
      /\bstock (levels?|left|running)\b/,
      /\binventory\b/,
      /\brestock\w*\b/,
      /\brunning (low|out)\b/,
      /\bsold out\b/,
    ],
  },
  {
    value: "top_products",
    patterns: [
      /\b(best|top)[- ]?(sellers?|selling|products?)\b/,
      /\bselling (best|well|most)\b/,
      /\b(sells?|sold) (best|well|the most)\b/,
      /\bmost (popular|sold)\b/,
    ],
  },
  {
    value: "focus",
    patterns: [
      /\bfocus\b/,
      /\bprioriti[sz]e\b|\bpriorit(y|ies)\b/,
      /\bimprove\b/,
      /\b(increase|boost|grow|raise)\b.*\b(sales|revenue|orders|store|business)\b/,
      /\bwhat should (i|we) (do|change|work on)\b/,
      /\b(recommend\w*|advice|advise|suggest\w*|next steps?)\b/,
    ],
  },
  {
    value: "sales_change",
    patterns: [
      new RegExp(
        String.raw`\b(why|explain\w*|caus\w*|chang\w*|drop\w*|fell|fall\w*|declin\w*|went (up|down)|rose|grew|lower|higher|compar\w*|increased|decreased)\b.*\b${SALES_WORDS}\b`,
      ),
      new RegExp(
        String.raw`\b${SALES_WORDS}\b.*\b(why|explain\w*|caus\w*|chang\w*|drop\w*|fell|fall\w*|declin\w*|went (up|down)|rose|grew|lower|higher|compar\w*|increased|decreased)\b`,
      ),
    ],
  },
];

const THIRTY_DAYS = /\b(month|monthly|30[- ]?days?|thirty days)\b/;

function firstMatch<T>(rules: readonly Rule<T>[], text: string): T | undefined {
  return rules.find((rule) => rule.patterns.some((pattern) => pattern.test(text)))?.value;
}

/**
 * Deterministic intent routing (Copilot spec A5, A6, A8, A9): English keyword patterns,
 * case-insensitive. Declined categories win over answered intents; no match is "unsupported",
 * which runs no tool. Every answered question covers the last 7 days unless it mentions a
 * month or 30 days.
 */
export function routeQuestion(question: string): RoutedQuestion {
  const text = question.toLowerCase().replace(/\s+/g, " ").trim();

  const declined = firstMatch(DECLINED_RULES, text);
  if (declined) return { kind: "declined", category: declined };

  const intent = firstMatch(ANSWERED_RULES, text);
  if (!intent) return { kind: "unsupported" };
  return { kind: "answered", intent, period: THIRTY_DAYS.test(text) ? "30d" : "7d" };
}

import type { CopilotFact, CopilotProduct, FactTable } from "../copilot/build-facts";
import type { CopilotDraft, DraftRecommendation } from "../copilot/rule-insights";

/** Copilot spec, "Grounding rules". */
export const GROUNDING_ISSUE_CODES = [
  "unknown_fact",
  "unknown_product",
  "ungrounded_number",
  "unlisted_product",
  "causal_claim",
  "too_many",
] as const;
export type GroundingIssueCode = (typeof GROUNDING_ISSUE_CODES)[number];

/**
 * One failed check. `recommendation` is the 1-based position, `null` for the summary or the
 * whole answer. `ref` is a fact id or product alias, never text the model wrote, so an issue can
 * be sent back to the model or logged.
 */
export type GroundingIssue = {
  code: GroundingIssueCode;
  recommendation: number | null;
  ref?: string;
};

export type GroundingOptions = {
  /** The period length in days: the one number a text may state without citing a fact. */
  periodDays: number;
};

export const MAX_ANSWER_RECOMMENDATIONS = 3;

/** Attribution phrases that claim a cause (R05). Checked in observation and summary only. */
const CAUSAL_PHRASE = /\b(?:caused|led to|due to|as a result of|because of|drove)\b/i;

/** A run of digits with single separators inside: "29", "9 847,00", "1,234.5", "2026". */
const NUMBER_TOKEN = /\d+(?:[   .,]\d+)*/g;
const GROUP_SEPARATOR = /[   ]/;
const TOLERANCE = 0.005;

/** The values a token can mean: decimal comma (Polish) or decimal point (English). */
function readings(token: string): number[] {
  const compact = token.replace(/[   ]/g, "");
  const decimalComma = Number(compact.replace(/\./g, "").replace(",", "."));
  const decimalPoint = Number(compact.replace(/,/g, ""));
  return [decimalComma, decimalPoint].filter((value) => Number.isFinite(value));
}

function numbersIn(text: string): number[] {
  return (text.match(NUMBER_TOKEN) ?? []).flatMap(readings);
}

/** The numbers a text may state: the cited facts' values, and the numbers in their labels. */
function allowedNumbers(facts: readonly CopilotFact[], periodDays: number): number[] {
  return [
    periodDays,
    ...facts.flatMap((fact) => [
      ...(fact.number === null ? [] : [Math.abs(fact.number)]),
      ...numbersIn(`${fact.value} ${fact.metric} ${fact.period}`),
    ]),
  ];
}

/** A token is grounded if one reading is allowed, or if every space-separated part is. */
function isGrounded(token: string, allowed: readonly number[]): boolean {
  const known = (value: number) =>
    allowed.some((candidate) => Math.abs(candidate - value) < TOLERANCE);
  if (readings(token).some(known)) return true;
  const parts = token.split(GROUP_SEPARATOR);
  return parts.length > 1 && parts.every((part) => isGrounded(part, allowed));
}

type Mention = { text: string; products: Set<string> };

/**
 * Finds the catalog products a text names (by name or SKU, case-insensitively, longest first so
 * "Pulse Mouse Pro" is not also read as "Pulse Mouse") and blanks them out, so digits inside a
 * name or SKU are not read as stated numbers.
 */
function findProducts(text: string, products: readonly CopilotProduct[]): Mention {
  const names = products.flatMap((product) => [
    { label: product.name, alias: product.alias },
    ...(product.sku ? [{ label: product.sku, alias: product.alias }] : []),
  ]);
  names.sort((a, b) => b.label.length - a.label.length);
  let rest = text.toLowerCase();
  const found = new Set<string>();
  for (const { label, alias } of names) {
    const needle = label.toLowerCase();
    if (needle === "" || !rest.includes(needle)) continue;
    found.add(alias);
    rest = rest.split(needle).join(" ");
  }
  return { text: rest, products: found };
}

type Scope = {
  /** The fields to check, already joined. */
  texts: string[];
  /** The fields checked for causal claims. */
  causalTexts: string[];
  factIds: readonly string[];
  /** Products the text may name: the listed aliases, or the cited facts' products. */
  allowedProducts: ReadonlySet<string>;
  recommendation: number | null;
};

function checkScope(
  scope: Scope,
  table: FactTable,
  facts: ReadonlyMap<string, CopilotFact>,
  options: GroundingOptions,
): GroundingIssue[] {
  const issues: GroundingIssue[] = [];
  const at = scope.recommendation;
  const cited = scope.factIds.flatMap((id) => {
    const fact = facts.get(id);
    if (!fact) issues.push({ code: "unknown_fact", recommendation: at, ref: id });
    return fact ? [fact] : [];
  });
  const allowed = allowedNumbers(cited, options.periodDays);

  const mentioned = new Set<string>();
  for (const text of scope.texts) {
    const mention = findProducts(text, table.products);
    mention.products.forEach((alias) => mentioned.add(alias));
    const tokens = mention.text.match(NUMBER_TOKEN) ?? [];
    if (tokens.some((token) => !isGrounded(token, allowed))) {
      issues.push({ code: "ungrounded_number", recommendation: at });
    }
  }
  for (const alias of mentioned) {
    if (!scope.allowedProducts.has(alias)) {
      issues.push({ code: "unlisted_product", recommendation: at, ref: alias });
    }
  }
  if (scope.causalTexts.some((text) => CAUSAL_PHRASE.test(text))) {
    issues.push({ code: "causal_claim", recommendation: at });
  }
  return issues;
}

function recommendationIssues(
  recommendation: DraftRecommendation,
  position: number,
  table: FactTable,
  facts: ReadonlyMap<string, CopilotFact>,
  options: GroundingOptions,
): GroundingIssue[] {
  const known = new Set(table.products.map((product) => product.alias));
  const listed = new Set(recommendation.relatedProductAliases);
  const issues: GroundingIssue[] = [...listed]
    .filter((alias) => !known.has(alias))
    .map((alias) => ({ code: "unknown_product", recommendation: position, ref: alias }));
  // A cited fact about a product binds the recommendation to that product.
  for (const id of recommendation.evidenceFactIds) {
    const alias = facts.get(id)?.productAlias;
    if (alias && !listed.has(alias)) {
      issues.push({ code: "unlisted_product", recommendation: position, ref: alias });
    }
  }
  return [
    ...issues,
    ...checkScope(
      {
        texts: [
          recommendation.title,
          recommendation.observation,
          recommendation.reasoning,
          recommendation.suggestedAction,
          ...(recommendation.limitations ?? []),
        ],
        causalTexts: [recommendation.observation],
        factIds: recommendation.evidenceFactIds,
        allowedProducts: listed,
        recommendation: position,
      },
      table,
      facts,
      options,
    ),
  ];
}

function dedupe(issues: GroundingIssue[]): GroundingIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}|${issue.recommendation}|${issue.ref ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Checks a draft (a model's or the rules') against the fact table it was built from (Copilot
 * spec, "Grounding rules"): every cited fact and product exists; every number in a
 * recommendation is a value of one of that recommendation's own cited facts (or the period
 * length), and summary numbers come from the summary's facts; every product a text names, or
 * whose fact it cites, is listed; observation and summary claim no cause; at most 3
 * recommendations. An empty list means the draft may be shown.
 *
 * Not machine-checked (covered by the prompt, evals and the fallback): spelled-out numbers,
 * paraphrased product references and qualitative claims no number backs.
 */
export function findGroundingIssues(
  draft: CopilotDraft,
  table: FactTable,
  options: GroundingOptions,
): GroundingIssue[] {
  const facts = new Map(table.facts.map((fact) => [fact.id, fact]));
  const summaryProducts = new Set(
    draft.summaryFactIds.flatMap((id) => facts.get(id)?.productAlias ?? []),
  );
  const issues: GroundingIssue[] = [
    ...(draft.recommendations.length > MAX_ANSWER_RECOMMENDATIONS
      ? [{ code: "too_many" as const, recommendation: null }]
      : []),
    ...checkScope(
      {
        texts: [draft.summary],
        causalTexts: [draft.summary],
        factIds: draft.summaryFactIds,
        allowedProducts: summaryProducts,
        recommendation: null,
      },
      table,
      facts,
      options,
    ),
    ...draft.recommendations.flatMap((recommendation, index) =>
      recommendationIssues(recommendation, index + 1, table, facts, options),
    ),
  ];
  return dedupe(issues);
}

const PROBLEM_TEXT: Readonly<Record<GroundingIssueCode, string>> = {
  unknown_fact: "cites a fact id that is not in the facts",
  unknown_product: "lists a product alias that is not in the products",
  ungrounded_number:
    "states a number that is not the value of a fact it cites (cite the fact, or write it in words)",
  unlisted_product:
    "names a product, or cites a fact about a product, without listing its alias in relatedProductAliases (the summary may only name products of the facts it cites)",
  causal_claim: "claims a cause in the observation or summary; state only what the data shows",
  too_many: "has more than 3 recommendations",
};

/**
 * The problems as a message for a second attempt: codes, positions, fact ids and aliases only,
 * never the model's own text (Copilot spec A11).
 */
export function describeGroundingIssues(issues: readonly GroundingIssue[]): string {
  const lines = issues.map((issue) => {
    const where =
      issue.recommendation === null ? "The answer" : `Recommendation ${issue.recommendation}`;
    const ref = issue.ref ? ` (${issue.ref})` : "";
    return `- ${where}${ref}: ${issue.code}: ${PROBLEM_TEXT[issue.code]}.`;
  });
  return [
    "Your previous answer failed these checks. Write the whole answer again and fix them:",
    ...lines,
  ].join("\n");
}

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
const NUMBER_TOKEN = /\d+(?:[ \u00a0\u202f.,]\d+)*/g;
const GROUP_SEPARATOR = /[ \u00a0\u202f]/;
const TOLERANCE = 0.005;

/** The values a token can mean: decimal comma (Polish) or decimal point (English). */
function readings(token: string): number[] {
  const compact = token.replace(/[ \u00a0\u202f]/g, "");
  const decimalComma = Number(compact.replace(/\./g, "").replace(",", "."));
  const decimalPoint = Number(compact.replace(/,/g, ""));
  return [decimalComma, decimalPoint].filter((value) => Number.isFinite(value));
}

function numbersIn(text: string): number[] {
  return [...text.matchAll(NUMBER_TOKEN)].flatMap((match) => readings(match[0]));
}

/**
 * The numbers a text may state: the cited facts' values and the period length. Numbers inside a
 * fact's metric or period label ("Products at or below 5 in stock", "11–17 Oct 2026") are not
 * values: a text may quote the label itself (blanked out by `withoutLabels`), never reuse them.
 */
function allowedNumbers(facts: readonly CopilotFact[], periodDays: number): number[] {
  return [
    periodDays,
    ...facts.flatMap((fact) => [
      ...(fact.number === null ? [] : [Math.abs(fact.number)]),
      ...numbersIn(fact.value),
    ]),
  ];
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `label` as a whole phrase: not inside a longer word ("Pad" in "update"). */
function phrase(label: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(label)}(?![\\p{L}\\p{N}])`, "giu");
}

/**
 * The cited facts' metric and period labels, and the parts of a period label around and inside
 * its brackets ("Last 7 days", "11–17 Oct 2026"), which a text may quote on their own.
 */
function labelsOf(facts: readonly CopilotFact[]): string[] {
  return facts.flatMap((fact) => [
    fact.metric,
    fact.period,
    ...fact.period.split(/[()]/).map((part) => part.trim()),
  ]);
}

/** Blanks every quoted label, longest first, so its digits are not read as stated numbers. */
function withoutLabels(text: string, labels: readonly string[]): string {
  return [...labels]
    .filter((label) => label !== "")
    .sort((a, b) => b.length - a.length)
    .reduce((rest, label) => rest.replace(phrase(label), " "), text);
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
  let rest = text;
  const found = new Set<string>();
  for (const { label, alias } of names) {
    const pattern = phrase(label);
    if (label === "" || !pattern.test(rest)) continue;
    found.add(alias);
    rest = rest.replace(pattern, " ");
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
  const labels = labelsOf(cited);

  const mentioned = new Set<string>();
  for (const text of scope.texts) {
    const mention = findProducts(text, table.products);
    mention.products.forEach((alias) => mentioned.add(alias));
    const tokens = withoutLabels(mention.text, labels).match(NUMBER_TOKEN) ?? [];
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
 * paraphrased product references and qualitative claims no number backs. A number is compared
 * by absolute value in either decimal reading ("9 847,00" or "9,847.00"), so a wrong sign or
 * direction ("rose" for a fall), a misplaced decimal separator ("2,5" for 25) or a wrong unit
 * ("29 zł" for 29 units) is not caught.
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
      issue.recommendation !== null
        ? `Recommendation ${issue.recommendation}`
        : issue.code === "too_many"
          ? "The answer"
          : "The summary";
    const ref = issue.ref ? ` (${issue.ref})` : "";
    return `- ${where}${ref}: ${issue.code}: ${PROBLEM_TEXT[issue.code]}.`;
  });
  return [
    "Your previous answer failed these checks. Write the whole answer again and fix them:",
    ...lines,
  ].join("\n");
}

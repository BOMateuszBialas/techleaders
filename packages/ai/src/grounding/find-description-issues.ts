import type { GlossaryKind } from "../descriptions/description-glossary";
import type { DescriptionSources } from "../descriptions/description-sources";
import {
  blankSpans,
  findMoney,
  findNumbers,
  findTermMentions,
  mentionKey,
  normalizeText,
} from "../descriptions/description-text";

/** Why a draft was rejected (descriptions spec, "Grounding rules"); `schema` comes from Zod. */
export const DESCRIPTION_ISSUE_CODES = [
  "ungrounded_number",
  "unsupported_feature",
  "unsupported_compatibility",
  "unsupported_claim",
  "commerce_talk",
  "markup",
  "instruction_text",
  "schema",
] as const;
export type DescriptionIssueCode = (typeof DESCRIPTION_ISSUE_CODES)[number];

/** `term` is a glossary term's canonical name (our constant), never text from the draft. */
export type DescriptionIssue = { code: DescriptionIssueCode; term?: string };

const CODE_OF_KIND: Readonly<Record<GlossaryKind, DescriptionIssueCode>> = {
  feature: "unsupported_feature",
  compatibility: "unsupported_compatibility",
  claim: "unsupported_claim",
  commerce: "commerce_talk",
  instruction: "instruction_text",
};

/** Kinds that are never allowed in a draft, whatever the owner's notes say. */
const NEVER_ALLOWED = new Set<GlossaryKind>(["commerce", "instruction"]);

const MARKUP: readonly RegExp[] = [
  /<\/?[a-z!][^>]*>/, // HTML-like tags
  /\*\*|__/, // Markdown emphasis
  /^\s*#/m, // Markdown heading
  /\[[^\]\n]*\]\([^)\n]*\)/, // Markdown link
  /^\s*[-*•]\s/m, // bullet
  /https?:\/\/|www\./, // URL
  /(?<![\p{L}\d])[a-z0-9-]+\.(?:com|net|org|pl|io|eu|shop|store)(?![\p{L}\d])/u, // bare domain
  /[^\s@]+@[^\s@]+\.[^\s@]+/, // e-mail address
];

/** A control character other than a line feed (tab and carriage return included). */
function hasControlCharacter(text: string): boolean {
  return [...text].some((char) => {
    const code = char.charCodeAt(0);
    return (code < 0x20 && code !== 0x0a) || code === 0x7f;
  });
}

/**
 * The problems of one draft (descriptions spec, "Grounding rules"), checked on the draft's text
 * against the sources, both normalized the same way. A number, feature, platform, brand or claim
 * passes only when the sources hold it, a term also with the same polarity: notes saying "no
 * Bluetooth" do not ground a draft that claims Bluetooth (and "Bluetooth" in the notes does not
 * ground "without Bluetooth"). Money passes only when it equals the price. Stock, delivery and
 * promotion talk, markup and injection echoes never pass. One entry per code and term.
 */
export function findDescriptionIssues(
  description: string,
  sources: Pick<DescriptionSources, "numbers" | "mentions" | "priceMinor">,
): DescriptionIssue[] {
  const text = normalizeText(description);
  const issues = new Map<string, DescriptionIssue>();
  const add = (issue: DescriptionIssue) => issues.set(`${issue.code}:${issue.term ?? ""}`, issue);

  if (MARKUP.some((pattern) => pattern.test(text)) || hasControlCharacter(text)) {
    add({ code: "markup" });
  }

  for (const { term, negated } of findTermMentions(text)) {
    const grounded =
      !NEVER_ALLOWED.has(term.kind) && sources.mentions.has(mentionKey(term, negated));
    if (!grounded) add({ code: CODE_OF_KIND[term.kind], term: term.id });
  }

  const money = findMoney(text);
  if (money.some(({ minor }) => minor === null || minor !== sources.priceMinor)) {
    add({ code: "ungrounded_number" });
  }
  // Money is checked against the price only, so "249,00 zł" is never read as other numbers.
  if (findNumbers(blankSpans(text, money)).some((number) => !sources.numbers.has(number))) {
    add({ code: "ungrounded_number" });
  }
  return [...issues.values()];
}

const ISSUE_HINTS: Readonly<Record<DescriptionIssueCode, string>> = {
  ungrounded_number:
    "It contained a number or price that is not in the product fields. Use only numbers that appear in the fields, and quote the price exactly as given or not at all.",
  unsupported_feature: "It named features that are not in the product fields.",
  unsupported_compatibility: "It named platforms or brands that are not in the product fields.",
  unsupported_claim:
    "It made quality or authority claims (warranty, awards, best, fastest) that are not in the product fields.",
  commerce_talk:
    "It mentioned stock, shipping, delivery, discounts or deals, which the description must never mention.",
  markup:
    "It contained markup, a link or an e-mail address. Write plain text only: no HTML, no Markdown, no bullets.",
  instruction_text: "It talked about instructions or prompts instead of describing the product.",
  schema:
    "It was not valid JSON that matches the response schema (80 to 1190 characters, at most 3 paragraphs).",
};

/**
 * The retry note (descriptions spec A7): the problem codes in words and the offending glossary
 * terms, which are our constants. Never the model's own text.
 */
export function describeDescriptionIssues(issues: readonly DescriptionIssue[]): string {
  const codes = [...new Set(issues.map((issue) => issue.code))];
  const terms = [...new Set(issues.flatMap((issue) => (issue.term ? [issue.term] : [])))];
  const lines = [
    "Your previous description was rejected:",
    ...codes.map((code) => `- ${ISSUE_HINTS[code]}`),
  ];
  if (terms.length > 0) lines.push(`Do not mention: ${terms.join(", ")}.`);
  lines.push(
    "Write the whole description again using only facts from the product fields. Shorter is better than invented.",
  );
  return lines.join("\n");
}

import {
  COUNTED_NOUNS,
  DESCRIPTION_GLOSSARY,
  SPELLED_NUMBERS,
  type GlossaryTerm,
} from "./description-glossary";

/**
 * Text analysis shared by the sources (`buildDescriptionSources`) and the draft check
 * (`findDescriptionIssues`), so both sides are read the same way (descriptions spec, "Grounding
 * rules"). Every function below takes text already passed through `normalizeText`.
 */

/** Lower case, Unicode NFKC, every no-break space as a space, typographic quotes and dashes plain. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[   ]/g, " ")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[‐-―−]/g, "-")
    .toLowerCase();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const LETTER = /\p{L}/u;
const DIGIT = /\d/;

/** One variant as a regular expression, with the boundaries its first and last character need. */
function variantSource(variant: string): string {
  let body = "";
  for (let index = 0; index < variant.length; index += 1) {
    const char = variant.charAt(index);
    const between = DIGIT.test(variant.charAt(index - 1)) && DIGIT.test(variant.charAt(index + 1));
    if (char === " " || char === "-") body += "[\\s-]?";
    else if (char === "." && between) body += "[.,]";
    else body += escapeRegExp(char);
  }
  const first = variant.charAt(0);
  const last = variant.charAt(variant.length - 1);
  // A letter-led term may follow digits ("1000hz", "26000dpi"); a digit-led one may not.
  const before = LETTER.test(first)
    ? "(?<!\\p{L})"
    : DIGIT.test(first)
      ? "(?<![\\p{L}\\d.,])"
      : "(?<![\\p{L}\\d#])";
  const plural = LETTER.test(last) ? "(?:e?s)?" : "";
  return `${before}${body}${plural}(?![\\p{L}\\d]|[.,]\\d)`;
}

function termRegExp(term: GlossaryTerm): RegExp {
  const variants = [...term.variants].sort((a, b) => b.length - a.length).map(variantSource);
  const patterns = (term.patterns ?? []).map(
    (pattern) => `(?<![\\p{L}\\d])(?:${pattern})(?![\\p{L}\\d])`,
  );
  return new RegExp([...variants, ...patterns].join("|"), "gu");
}

const TERM_EXPRESSIONS: ReadonlyArray<{ term: GlossaryTerm; expression: RegExp }> =
  DESCRIPTION_GLOSSARY.map((term) => ({ term, expression: termRegExp(term) }));

const NEGATIONS = new Set(["no", "not", "without", "never", "nor"]);
/** A clause ends at punctuation; a dot or comma between digits ("2.4") is part of a number. */
const CLAUSE_BREAK = /[;:!?()\n]|[.,](?!\d)/g;

/**
 * A mention is negated when "no", "not", "without", "never", "nor" or a "n't" word is one of the
 * three words before it in the same clause ("no Bluetooth", "does not need a dongle"), when "non"
 * is attached to it ("non-RGB"; but "non-slip rubber" negates only "slip"), or when "-free"
 * follows it ("honeycomb-free").
 */
function isNegated(text: string, start: number, end: number): boolean {
  if (/^-free(?!\p{L})/u.test(text.slice(end))) return true;
  const before = text.slice(0, start);
  if (/(?<!\p{L})non[\s-]?$/u.test(before)) return true;
  let clauseStart = 0;
  for (const match of before.matchAll(CLAUSE_BREAK)) clauseStart = match.index + 1;
  const words = before.slice(clauseStart).match(/[\p{L}']+/gu) ?? [];
  return words.slice(-3).some((word) => NEGATIONS.has(word) || word.endsWith("n't"));
}

export type TermMention = { term: GlossaryTerm; negated: boolean };
export type TermSpan = TermMention & { start: number; end: number };

/** Every place the text mentions a glossary term, with its polarity. */
export function findTermSpans(text: string): TermSpan[] {
  return TERM_EXPRESSIONS.flatMap(({ term, expression }) =>
    [...text.matchAll(expression)].map((match) => {
      const start = match.index;
      const end = start + match[0].length;
      return { term, negated: isNegated(text, start, end), start, end };
    }),
  );
}

/** Every glossary term the text mentions, once per term and polarity. */
export function findTermMentions(text: string): TermMention[] {
  const mentions = new Map<string, TermMention>();
  for (const { term, negated } of findTermSpans(text)) {
    mentions.set(mentionKey(term, negated), { term, negated });
  }
  return [...mentions.values()];
}

/** The key a sources set stores for one term and polarity. */
export function mentionKey(term: GlossaryTerm, negated: boolean): string {
  return `${term.id}:${negated ? "-" : "+"}`;
}

/** Digits without trailing decimal zeros and leading zeros: "026" → "26", "2.40" → "2.4". */
function canonicalNumber(units: string, decimals: string | null): string {
  const integer = units.replace(/^0+(?=\d)/, "");
  const fraction = (decimals ?? "").replace(/0+$/, "");
  return fraction === "" ? integer : `${integer}.${fraction}`;
}

/**
 * The numbers in one run of digits and separators. A separator followed by exactly three
 * digits is a thousands group ("26,000", "26 000", "26.000" are 26000); any other dot or comma
 * is a decimal mark ("2.4", "2,4"); any other space separates two numbers.
 */
function splitDigitRun(run: string): string[] {
  const parts = run.split(/([., ])/);
  const values: string[] = [];
  let units = parts[0] ?? "";
  let decimals: string | null = null;
  for (let index = 1; index < parts.length; index += 2) {
    const separator = parts[index];
    const digits = parts[index + 1] ?? "";
    if (decimals === null && digits.length === 3) {
      units += digits;
    } else if (decimals === null && separator !== " ") {
      decimals = digits;
    } else {
      values.push(canonicalNumber(units, decimals));
      units = digits;
      decimals = null;
    }
  }
  values.push(canonicalNumber(units, decimals));
  return values;
}

const DIGIT_RUN = /(?<![\p{L}\d.,])\d+(?:[., ]\d+)*/gu;
const TOKEN = /\p{L}+|\d+(?:[.,]\d+)*/gu;
const TOKEN_GAP_BREAK = /[;:!?(),\n]|\.(?!\d)/;
/** Words that end the look-ahead from a spelled number to its noun ("one of the lightest"). */
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "than",
  "that",
  "the",
  "this",
  "to",
  "with",
]);

function singular(word: string): string {
  if (COUNTED_NOUNS.has(word)) return word;
  if (word.endsWith("es") && COUNTED_NOUNS.has(word.slice(0, -2))) return word.slice(0, -2);
  return word.endsWith("s") ? word.slice(0, -1) : word;
}

/**
 * Spelled numbers zero to twenty that count something: one of the next three words (in the same
 * clause, before any stop word) is a counted noun or unit ("five programmable buttons", "twelve
 * thumb buttons", "eight 30 mm buttons"). "One of the lightest" is not a number.
 */
function spelledNumbers(text: string): string[] {
  const tokens = [...text.matchAll(TOKEN)].map((match) => ({
    word: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
  const values: string[] = [];
  tokens.forEach((token, index) => {
    const value = SPELLED_NUMBERS[token.word];
    if (value === undefined) return;
    let previousEnd = token.end;
    for (const candidate of tokens.slice(index + 1, index + 4)) {
      if (TOKEN_GAP_BREAK.test(text.slice(previousEnd, candidate.start))) break;
      if (STOP_WORDS.has(candidate.word)) break;
      if (COUNTED_NOUNS.has(singular(candidate.word))) {
        values.push(String(value));
        break;
      }
      previousEnd = candidate.end;
    }
  });
  return values;
}

/** Every number in the text: runs of digits (with or without a unit) and counted spelled numbers. */
export function findNumbers(text: string): string[] {
  const digits = [...text.matchAll(DIGIT_RUN)].flatMap((match) => splitDigitRun(match[0]));
  return [...digits, ...spelledNumbers(text)];
}

export type MoneyMention = {
  /** The amount in minor units, or `null` when the currency is not the złoty. */
  minor: number | null;
  start: number;
  end: number;
};

const PLN = new Set(["pln", "zł", "zl", "zloty", "zlotys", "złoty", "złotych"]);
const CURRENCY =
  "pln|złotych|złoty|zlotys|zloty|zł|zl|euros|euro|eur|usd|dollars|dollar|gbp|€|\\$|£";
const AMOUNT = "\\d+(?:[., ]\\d+)*";
const MONEY_AFTER = new RegExp(`(?<![\\p{L}\\d.,])(${AMOUNT}) ?(${CURRENCY})(?!\\p{L})`, "gu");
const MONEY_BEFORE = new RegExp(`(?<!\\p{L})(${CURRENCY}) ?(${AMOUNT})(?![\\d]|[.,]\\d)`, "gu");

/** "249", "249.00", "249,00", "1 234,56" → minor units; the last dot or comma with 1–2 digits is the decimal mark. */
function amountToMinor(amount: string): number {
  const decimals = /[.,](\d{1,2})$/.exec(amount);
  const units = (decimals ? amount.slice(0, decimals.index) : amount).replace(/[., ]/g, "");
  return Number(units) * 100 + Number((decimals?.[1] ?? "").padEnd(2, "0"));
}

/**
 * Money amounts: a number next to a currency ("249.00 PLN", "249,00 zł", "PLN 249", "$249").
 * Amounts in złoty are parsed into minor units, so "249,00" can never be read as 24 900.
 */
export function findMoney(text: string): MoneyMention[] {
  const found: MoneyMention[] = [];
  const add = (start: number, length: number, amount: string, currency: string) => {
    const end = start + length;
    if (found.some((other) => start < other.end && other.start < end)) return;
    found.push({ minor: PLN.has(currency) ? amountToMinor(amount) : null, start, end });
  };
  for (const match of text.matchAll(MONEY_AFTER)) {
    add(match.index, match[0].length, match[1] ?? "", match[2] ?? "");
  }
  for (const match of text.matchAll(MONEY_BEFORE)) {
    add(match.index, match[0].length, match[2] ?? "", match[1] ?? "");
  }
  return found;
}

/** The text with the given spans replaced by spaces, so other checks skip them. */
export function blankSpans(text: string, spans: ReadonlyArray<{ start: number; end: number }>) {
  let result = text;
  for (const { start, end } of spans) {
    result = result.slice(0, start) + " ".repeat(end - start) + result.slice(end);
  }
  return result;
}

import { formatPriceInput, isDemoSku, type DescriptionDraftInput } from "@commerceos/core";
import { findNumbers, findTermMentions, mentionKey, normalizeText } from "./description-text";

export { isDemoSku };

/** The four fields a draft may use, in the order the model receives them (descriptions spec A1). */
export const DESCRIPTION_FIELDS = ["name", "category", "price", "notes"] as const;
export type DescriptionField = (typeof DESCRIPTION_FIELDS)[number];

/** A5: without a category, the owner's notes need at least this many characters. */
export const MIN_NOTES_LENGTH = 20;

export type DescriptionSources = {
  /** Exactly what the model receives; a field that is not set is "". */
  fields: Readonly<Record<DescriptionField, string>>;
  /** The price the draft may quote, in minor units; `null` when not set. */
  priceMinor: number | null;
  demo: boolean;
  fieldsUsed: DescriptionField[];
  /** A5: a name plus a category or 20+ characters of notes; otherwise no LLM call. */
  insufficient: boolean;
  /** Every number in the fields, canonical ("26000", "2.4"). */
  numbers: ReadonlySet<string>;
  /** Every glossary term in the fields with its polarity (`mentionKey`). */
  mentions: ReadonlySet<string>;
};

/**
 * The sources of one draft (descriptions spec, step 3): the name, the category's name, the price
 * as a canonical `249.00 PLN` (never the pl-PL display) and the owner's notes, plus the numbers
 * and glossary terms they hold. The demo flag comes from the SKU. A price of 0.00 is a
 * placeholder (#41), not a price to quote, so it counts as not set.
 */
export function buildDescriptionSources(
  input: DescriptionDraftInput,
  categoryName: string | null,
): DescriptionSources {
  const priceMinor = input.price !== null && input.price > 0 ? input.price : null;
  const fields: Record<DescriptionField, string> = {
    name: input.name,
    category: categoryName ?? "",
    price: priceMinor === null ? "" : `${formatPriceInput(priceMinor)} PLN`,
    notes: input.notes,
  };
  const numbers = new Set<string>();
  const mentions = new Set<string>();
  for (const value of Object.values(fields)) {
    // Each field on its own, so a clause never runs from one field into the next.
    const text = normalizeText(value);
    findNumbers(text).forEach((number) => numbers.add(number));
    findTermMentions(text).forEach(({ term, negated }) => mentions.add(mentionKey(term, negated)));
  }
  return {
    fields,
    priceMinor,
    demo: isDemoSku(input.sku),
    fieldsUsed: DESCRIPTION_FIELDS.filter((field) => fields[field] !== ""),
    insufficient:
      fields.name === "" || (fields.category === "" && fields.notes.length < MIN_NOTES_LENGTH),
    numbers,
    mentions,
  };
}

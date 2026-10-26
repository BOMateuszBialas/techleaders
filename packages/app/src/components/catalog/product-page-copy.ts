/** Copy and text helpers of the product page (storefront v2, Phase 3). */

export const PRODUCT_TABS_LABEL = "Product details";

export const TAB_DESCRIPTION = "Description";
export const TAB_TECHNICAL = "Technical data";
export const TAB_DELIVERY = "Delivery and returns";

/** Shown instead of the table when a product has no technical rows (owner wording). */
export const TECHNICAL_DATA_EMPTY = "Technical data is not available for this product yet.";

/** Labels the technical values as fictional (storefront v2, Q10, AS-10). */
export const TECHNICAL_DATA_EXAMPLE_NOTE = "Example values for the demo store.";

const LEAD_MAX_LENGTH = 160;

/**
 * The lead text under the product name: the first sentence of the description, cut at a word
 * boundary when it is long. The full description stays in the Description tab.
 */
export function leadSentence(description: string): string {
  const text = description.trim().replace(/\s+/g, " ");
  const end = text.search(/[.!?](\s|$)/);
  const sentence = end === -1 ? text : text.slice(0, end + 1);
  if (sentence.length <= LEAD_MAX_LENGTH) return sentence;
  const cut = sentence.slice(0, LEAD_MAX_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

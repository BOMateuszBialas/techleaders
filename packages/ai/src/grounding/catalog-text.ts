/** The longest catalog name or SKU the Copilot sends to the model or checks (Copilot spec, SEC-02). */
export const CATALOG_TEXT_LIMIT = 120;

/**
 * A catalog name or SKU as the Copilot sees it (Copilot spec, SEC-02 and INJ-01): format
 * characters (zero-width, bidi overrides, BOM) and control characters are removed, so a name
 * cannot hide or reverse text for the grounding checks, and the length is capped. Only the copy
 * sent to the model and used for the checks is sanitized; the owner's product pages keep the
 * stored name.
 */
export function catalogText(text: string): string {
  const visible = text.replace(/[\p{Cc}\p{Cf}]/gu, "").trim();
  return Array.from(visible).slice(0, CATALOG_TEXT_LIMIT).join("");
}

/**
 * A control character other than a line feed (C0 including tab and carriage return, DEL, C1)
 * or an invisible format character (zero-width space and joiners, bidi controls, soft hyphen,
 * BOM). Grounding checks match words and numbers in model text with regexes, and a format
 * character inside a term ("Blue\u200Btooth", "dro\u200Bve") hides it from every check while the reader
 * still sees the term, so model text holding one is rejected, never stripped (NFKC keeps
 * `\p{Cf}`). Shared by the description and the Copilot grounding checks.
 */
export const HIDDEN_CHARACTER = /(?!\n)[\p{Cc}\p{Cf}]/u;

import type { DescriptionField, DescriptionUnavailableReason } from "@commerceos/ai";

/** Client-safe: the draft panel imports it, so it holds no server code. */
export const DESCRIPTION_DRAFTS_URL = "/api/admin/products/description-drafts";

export const DRAFT_BUTTON_LABEL = "Draft with AI";
export const NOT_CONFIGURED_TEXT =
  "AI drafting is not set up on this store (no AI key). Write the description yourself.";
export const IDLE_HINT =
  "Uses only the name, category, price and description in this form. Nothing is saved until you click Save.";
export const PENDING_TEXT = "Drafting… this can take up to 35 seconds";
export const DRAFT_HEADING = "AI draft, not saved";
export const DRAFT_WARNING =
  "Check every claim before you use it. The AI can phrase things you would not.";
export const REPLACE_LABEL = "Replace description with this draft";
export const DISCARD_LABEL = "Discard";
export const APPLIED_TEXT =
  "The draft is now in the Description field. Edit it and click Save to keep it.";
export const UNDO_LABEL = "Undo";
export const UNDO_UNAVAILABLE_TEXT =
  "Undo is no longer available: the description was edited, saved or submitted after Replace, and Undo would overwrite that. It was left as it is.";
export const RATE_LIMITED_TEXT =
  "You asked for many drafts in a short time. Try again in a few minutes.";
export const SESSION_ENDED_TEXT = "Your session has ended. Sign in again to draft with AI.";
export const UNAVAILABLE_TEXT = "AI drafting is unavailable right now.";

/** One sentence per reason no draft is shown (descriptions spec, UI/UX "Unavailable"). */
export const UNAVAILABLE_REASON_TEXT: Readonly<Record<DescriptionUnavailableReason, string>> = {
  not_configured: NOT_CONFIGURED_TEXT,
  insufficient_input:
    "Add a category or a few notes first: the draft can only use what you entered.",
  invalid_output:
    "The AI draft contained details that are not in your product data, so it is not shown. Try again or write it yourself.",
  timeout: "AI timed out.",
  daily_limit: "Daily AI limit reached. Try again tomorrow.",
  // The provider's own 429 (HTTP 200 here), not the per-owner limit.
  rate_limited: UNAVAILABLE_TEXT,
  provider_error: UNAVAILABLE_TEXT,
  auth: UNAVAILABLE_TEXT,
  refused: UNAVAILABLE_TEXT,
};

const FIELD_NAMES: Readonly<Record<DescriptionField, string>> = {
  name: "name",
  category: "category",
  price: "price",
  notes: "your notes",
};

/** "Based on: name, category, price, your notes". */
export function basedOnText(fields: readonly DescriptionField[]): string {
  return `Based on: ${fields.map((field) => FIELD_NAMES[field]).join(", ")}`;
}

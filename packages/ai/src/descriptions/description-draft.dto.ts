import type { LlmUnavailableReason } from "../ports/llm-provider.port";
import type { DescriptionField } from "./description-sources";

/** Why no draft is shown (descriptions spec, API Contracts); an LLM failure is never an HTTP error. */
export type DescriptionUnavailableReason =
  LlmUnavailableReason | "insufficient_input" | "daily_limit" | "invalid_output";

/**
 * `POST /api/admin/products/description-drafts` → `ApiResult<DescriptionDraftDto>`. A draft is
 * text for the owner to review; nothing is stored or written. No request field is echoed back.
 */
export type DescriptionDraftDto =
  | {
      kind: "draft";
      text: string;
      model: string;
      promptVersion: string;
      fieldsUsed: DescriptionField[];
      demoMarked: boolean;
    }
  | { kind: "unavailable"; reason: DescriptionUnavailableReason };

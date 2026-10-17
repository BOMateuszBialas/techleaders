import { z } from "zod";
import {
  COPILOT_INTENT_IDS,
  COPILOT_QUESTION_MAX_LENGTH,
} from "../../domain/copilot/copilot-intent";

export const ASK_COPILOT_MISSING_MESSAGE = "Type a question or pick a suggested one.";
export const ASK_COPILOT_BOTH_MESSAGE = "Send a typed question or a suggested one, not both.";

/**
 * `POST /api/admin/copilot/answers` (Copilot spec, API Contracts): exactly one of a typed
 * question (trimmed, 1–500 characters) or a suggested question's intent id.
 */
export const askCopilotSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(1, "Type a question.")
      .max(COPILOT_QUESTION_MAX_LENGTH, `Use at most ${COPILOT_QUESTION_MAX_LENGTH} characters.`)
      .optional(),
    intent: z.enum(COPILOT_INTENT_IDS, "Pick one of the suggested questions.").optional(),
  })
  .superRefine((value, context) => {
    if (value.question === undefined && value.intent === undefined) {
      context.addIssue({ code: "custom", message: ASK_COPILOT_MISSING_MESSAGE });
    } else if (value.question !== undefined && value.intent !== undefined) {
      context.addIssue({ code: "custom", message: ASK_COPILOT_BOTH_MESSAGE });
    }
  });

export type AskCopilotInput = z.infer<typeof askCopilotSchema>;

import type { CopilotAnswerDto, FallbackReason } from "@commerceos/ai";
import {
  FALLBACK_REASON_TEXT,
  RATE_LIMITED_TEXT,
  RULE_BASED_DESCRIPTION,
  RULE_BASED_LABEL,
  SESSION_ENDED_TEXT,
  UNAVAILABLE_TEXT,
  type PanelFailure,
} from "./copilot-copy";

/**
 * The state map of the Copilot answer and its failures (spec "Fallback and state map", S1 to S13).
 * Pure: the views render what these functions return, so every row is a unit test. A fallback is
 * information, not an error: `info` for a configuration or refusal state, `warning` for the rest
 * (owner-approved OA-3). Nothing here is `destructive`.
 */

export type NoticeVariant = "info" | "warning";

/** A notice above an answer. `testId` marks the text that carries the server's summary. */
export type AnswerNotice = {
  variant: NoticeVariant;
  title?: string;
  description: string;
  testId?: string;
};

/** A failure notice for the panel (S11 to S13): the text is the existing copy. */
export type FailureNotice = { message: string; signIn: boolean };

/**
 * S1 to S7: the variant of a rule-based answer, by its reason. A table typed on every reason, so a
 * new reason fails the build until it has a variant (no runtime default to leave uncovered).
 */
const REASON_VARIANT: Readonly<Record<FallbackReason, NoticeVariant>> = {
  not_configured: "info",
  timeout: "warning",
  rate_limited: "warning",
  provider_error: "warning",
  auth: "warning",
  refused: "info",
  daily_limit: "warning",
  invalid_output: "warning",
};

export function fallbackVariant(reason: FallbackReason): NoticeVariant {
  return REASON_VARIANT[reason];
}

/**
 * The notice above an answer, or `null` for an AI answer (nothing to explain). A declined or
 * unsupported question shows the server's summary as the notice (S8, S9), with no title.
 */
export function answerNotice(answer: CopilotAnswerDto): AnswerNotice | null {
  if (answer.kind === "declined" || answer.kind === "unsupported") {
    return { variant: "info", description: answer.summary, testId: "copilot-summary" };
  }
  if (answer.origin === "llm") return null;
  if (answer.fallbackReason === null) {
    return { variant: "info", title: RULE_BASED_LABEL, description: RULE_BASED_DESCRIPTION };
  }
  return {
    variant: fallbackVariant(answer.fallbackReason),
    title: FALLBACK_REASON_TEXT[answer.fallbackReason],
    description: RULE_BASED_DESCRIPTION,
  };
}

/**
 * The notice for a failed question (S11 to S13). A validation failure (400) is not a notice: it
 * is a field message under the question (S14), so the map returns `null` for it. An unknown or
 * missing failure is treated as unreachable.
 */
const FAILURE_NOTICE: Readonly<Record<PanelFailure, FailureNotice | null>> = {
  validation: null,
  session: { message: SESSION_ENDED_TEXT, signIn: true },
  rate_limited: { message: RATE_LIMITED_TEXT, signIn: false },
  unavailable: { message: UNAVAILABLE_TEXT, signIn: false },
};

export function failureNotice(failure: PanelFailure | undefined): FailureNotice | null {
  return FAILURE_NOTICE[failure ?? "unavailable"];
}

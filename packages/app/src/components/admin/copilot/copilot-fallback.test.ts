import type { CopilotAnswerDto } from "@commerceos/ai";
import { COPILOT_FALLBACK_REASONS } from "@commerceos/core";
import { describe, expect, it } from "vitest";
import {
  FALLBACK_REASON_TEXT,
  RATE_LIMITED_TEXT,
  RULE_BASED_DESCRIPTION,
  RULE_BASED_LABEL,
  SESSION_ENDED_TEXT,
  UNAVAILABLE_TEXT,
  type PanelFailure,
} from "./copilot-copy";
import { answerNotice, failureNotice, fallbackVariant } from "./copilot-fallback";

const ANSWERED: CopilotAnswerDto = {
  answerId: null,
  kind: "answered",
  intent: "focus",
  question: "What should I focus on?",
  origin: "rules",
  fallbackReason: "not_configured",
  model: null,
  period: null,
  summary: "In the last 7 days: paid orders 29.",
  summaryEvidence: [],
  recommendations: [],
  limitations: [],
  definitions: [],
};

describe("fallbackVariant", () => {
  it("uses info for a configuration gap and a refusal, and warning for every other reason", () => {
    const variants = Object.fromEntries(
      COPILOT_FALLBACK_REASONS.map((reason) => [reason, fallbackVariant(reason)]),
    );
    expect(variants).toEqual({
      not_configured: "info",
      timeout: "warning",
      rate_limited: "warning",
      provider_error: "warning",
      auth: "warning",
      refused: "info",
      daily_limit: "warning",
      invalid_output: "warning",
    });
  });
});

describe("answerNotice", () => {
  it("names every rule-based reason in its title, with the one description", () => {
    for (const reason of COPILOT_FALLBACK_REASONS) {
      expect(answerNotice({ ...ANSWERED, fallbackReason: reason })).toEqual({
        variant: fallbackVariant(reason),
        title: FALLBACK_REASON_TEXT[reason],
        description: RULE_BASED_DESCRIPTION,
      });
    }
  });

  it("shows the rule-based label when the answer has no reason", () => {
    expect(answerNotice({ ...ANSWERED, fallbackReason: null })).toEqual({
      variant: "info",
      title: RULE_BASED_LABEL,
      description: RULE_BASED_DESCRIPTION,
    });
  });

  it("has no notice for an AI answer", () => {
    expect(
      answerNotice({ ...ANSWERED, origin: "llm", fallbackReason: null, model: "m-1" }),
    ).toBeNull();
  });

  it("shows a declined or unsupported answer's summary as the info notice, without a title", () => {
    for (const kind of ["declined", "unsupported"] as const) {
      expect(
        answerNotice({ ...ANSWERED, kind, fallbackReason: null, summary: "Cannot answer." }),
      ).toEqual({ variant: "info", description: "Cannot answer.", testId: "copilot-summary" });
    }
  });
});

describe("failureNotice", () => {
  it("maps each failure to its existing text, and a session to the sign-in link", () => {
    const cases: [PanelFailure | undefined, { message: string; signIn: boolean } | null][] = [
      ["validation", null],
      ["session", { message: SESSION_ENDED_TEXT, signIn: true }],
      ["rate_limited", { message: RATE_LIMITED_TEXT, signIn: false }],
      ["unavailable", { message: UNAVAILABLE_TEXT, signIn: false }],
      [undefined, { message: UNAVAILABLE_TEXT, signIn: false }],
    ];
    for (const [failure, expected] of cases) {
      expect(failureNotice(failure)).toEqual(expected);
    }
  });
});

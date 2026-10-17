import { describe, expect, it } from "vitest";
import { COPILOT_INTENT_IDS } from "../../domain/copilot/copilot-intent";
import { ValidationError } from "../../errors/app-error";
import { parseInput } from "../parse-input";
import {
  ASK_COPILOT_BOTH_MESSAGE,
  ASK_COPILOT_MISSING_MESSAGE,
  askCopilotSchema,
} from "./ask-copilot.schema";

function errorOf(input: unknown): ValidationError {
  try {
    parseInput(askCopilotSchema, input);
  } catch (error) {
    if (error instanceof ValidationError) return error;
  }
  throw new Error("expected a ValidationError");
}

describe("askCopilotSchema", () => {
  it("accepts a trimmed typed question", () => {
    expect(askCopilotSchema.parse({ question: "  Which products sell best?  " })).toEqual({
      question: "Which products sell best?",
    });
  });

  it.each(COPILOT_INTENT_IDS)("accepts the suggested question %s", (intent) => {
    expect(askCopilotSchema.parse({ intent })).toEqual({ intent });
  });

  it("accepts exactly 500 characters and refuses 501", () => {
    expect(askCopilotSchema.safeParse({ question: "a".repeat(500) }).success).toBe(true);
    expect(errorOf({ question: "a".repeat(501) }).fieldErrors.question).toEqual([
      "Use at most 500 characters.",
    ]);
  });

  it("refuses a blank question under its field", () => {
    expect(errorOf({ question: "   " }).fieldErrors.question).toEqual(["Type a question."]);
  });

  it("refuses an unknown intent under its field", () => {
    expect(errorOf({ intent: "margin" }).fieldErrors.intent).toEqual([
      "Pick one of the suggested questions.",
    ]);
  });

  it("needs exactly one of question and intent", () => {
    expect(errorOf({}).message).toBe(ASK_COPILOT_MISSING_MESSAGE);
    expect(errorOf({ question: "Hi", intent: "focus" }).message).toBe(ASK_COPILOT_BOTH_MESSAGE);
  });
});

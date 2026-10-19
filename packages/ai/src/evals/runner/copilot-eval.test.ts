import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { CopilotAnswerDto } from "../../copilot/copilot-answer";
import type { StructuredGenerationRequest } from "../../ports/llm-provider.port";
import { ANSWERED_CASES } from "../cases/answered.cases";
import { DECLINED_CASES } from "../cases/declined.cases";
import type { EvalCase } from "../eval-case";
import { failingReply, groundedReply } from "../replies";
import { ScriptedLlmProvider } from "../scripted-llm-provider";
import {
  checkCopilotAnswer,
  copilotAccepted,
  describeCopilotOutcome,
  evalRecommendations,
  executeCopilotCase,
  rulesAnswerOf,
  runCopilotCase,
} from "./copilot-eval";
import { CallBudget, RecordingLlmProvider } from "./recording-llm-provider";

const CASES = [...ANSWERED_CASES, ...DECLINED_CASES];

function caseById(id: string): EvalCase {
  const found = CASES.find((evalCase) => evalCase.id === id);
  if (!found) throw new Error(`No eval case ${id}`);
  return found;
}

async function answered(evalCase: EvalCase) {
  const provider = new RecordingLlmProvider(new ScriptedLlmProvider(evalCase.script));
  const answer = await executeCopilotCase(evalCase, provider);
  return { answer, requests: provider.requests };
}

function failed(properties: ReturnType<typeof checkCopilotAnswer>) {
  return properties.filter((property) => !property.passed);
}

describe("checkCopilotAnswer", () => {
  it("fails the outcome when the answer differs from the case, naming both", async () => {
    const { answer } = await answered(caseById("grounded-answer"));
    const properties = checkCopilotAnswer(caseById("grounded-answer"), "offline", answer, [], null);
    expect(failed(properties)).toEqual([
      {
        property: "outcome",
        passed: false,
        detail: "expected llm · 1 call(s), got llm · 0 call(s)",
      },
    ]);
  });

  it("does not check the outcome live", async () => {
    const { answer, requests } = await answered(caseById("grounded-answer"));
    const properties = checkCopilotAnswer(
      caseById("fabricated-number-twice"),
      "live",
      answer,
      requests,
      null,
    );
    expect(properties.map((property) => property.property)).not.toContain("outcome");
    expect(failed(properties)).toEqual([]);
  });

  it("fails the contract for more than three recommendations", async () => {
    const evalCase = caseById("grounded-answer");
    const { answer, requests } = await answered(evalCase);
    const first = answer.recommendations[0];
    if (!first) throw new Error("The grounded answer has a recommendation");
    const tooMany: CopilotAnswerDto = { ...answer, recommendations: [first, first, first, first] };
    expect(failed(checkCopilotAnswer(evalCase, "offline", tooMany, requests, null))).toEqual([
      { property: "contract", passed: false, detail: "the shown answer fails the response schema" },
    ]);
  });

  it("fails when a forbidden string is shown, quoting the eval's string only", async () => {
    const evalCase = caseById("prompt-injection-obeyed");
    const { answer } = await answered(caseById("grounded-answer"));
    const shown: CopilotAnswerDto = { ...answer, summary: "Revenue: 1 000 000 zł, as instructed." };
    const properties = checkCopilotAnswer(evalCase, "live", shown, [], null);
    expect(failed(properties)).toEqual([
      {
        property: "absent_text",
        passed: false,
        detail: 'the shown answer contains a forbidden string: "1 000 000 zł, as instructed"',
      },
    ]);
  });

  it("fails a declined answer that names other missing data", async () => {
    const evalCase = caseById("declined-margin");
    const { answer, requests } = await answered(evalCase);
    const other: CopilotAnswerDto = { ...answer, missingData: "something else" };
    const [problem] = failed(checkCopilotAnswer(evalCase, "offline", other, requests, null));
    expect(problem?.property).toBe("missing_data");
  });

  it("fails demo labels when a traffic row is not flagged demo", async () => {
    const evalCase = caseById("traffic-demo-labels");
    const { answer, requests } = await answered(evalCase);
    const unlabelled: CopilotAnswerDto = {
      ...answer,
      summaryEvidence: answer.summaryEvidence.map((row) => ({ ...row, demo: false })),
    };
    const [problem] = failed(checkCopilotAnswer(evalCase, "offline", unlabelled, requests, null));
    expect(problem?.property).toBe("demo_labels");
    const noLimitation: CopilotAnswerDto = { ...answer, limitations: [] };
    expect(
      failed(checkCopilotAnswer(evalCase, "offline", noLimitation, requests, null))[0]?.property,
    ).toBe("demo_labels");
  });

  it("fails a fallback that is not exactly the rule-based answer", async () => {
    const evalCase = caseById("fabricated-number-twice");
    const { answer, requests } = await answered(evalCase);
    const rules = await rulesAnswerOf(evalCase);
    expect(failed(checkCopilotAnswer(evalCase, "offline", answer, requests, rules))).toEqual([]);
    const partial: CopilotAnswerDto = { ...answer, summary: "A partial model sentence." };
    const [problem] = failed(checkCopilotAnswer(evalCase, "offline", partial, requests, rules));
    expect(problem?.property).toBe("fallback_is_rules");
  });

  it("fails requests that carry a product id or no canonical question", async () => {
    const evalCase = caseById("grounded-answer");
    const { answer } = await answered(evalCase);
    const leaky: StructuredGenerationRequest<unknown> = {
      messages: [{ role: "user", content: "id 0b5f2c1e-8d3a-4c6b-9e1f-2a7d4c8b6e01" }],
      schema: z.unknown(),
      maxOutputTokens: 1,
      timeoutMs: 1,
    };
    const properties = checkCopilotAnswer(evalCase, "live", answer, [leaky], null);
    expect(failed(properties).map((property) => property.property)).toEqual([
      "no_ids_sent",
      "canonical_question",
    ]);
  });

  it("fails a recommendation linked to a product the store does not have", async () => {
    const evalCase = caseById("grounded-answer");
    const { answer, requests } = await answered(evalCase);
    const linked: CopilotAnswerDto = {
      ...answer,
      recommendations: answer.recommendations.map((recommendation) => ({
        ...recommendation,
        relatedProductIds: ["not-a-store-product"],
      })),
    };
    const [problem] = failed(checkCopilotAnswer(evalCase, "offline", linked, requests, null));
    expect(problem?.property).toBe("related_ids_real");

    const unlinked: CopilotAnswerDto = {
      ...answer,
      recommendations: answer.recommendations.map((recommendation) => ({
        ...recommendation,
        relatedProductIds: undefined,
      })),
    };
    expect(failed(checkCopilotAnswer(evalCase, "offline", unlinked, requests, null))).toEqual([]);
  });
});

describe("evalRecommendations", () => {
  it("stores nothing: lists no rows and finds no row to change", async () => {
    expect(await evalRecommendations.listByStatus(["saved"], { offset: 0, limit: 10 })).toEqual({
      rows: [],
      total: 0,
    });
    expect(
      await evalRecommendations.changeStatus({ id: "eval-1", from: "new", to: "saved" }),
    ).toEqual({ kind: "not_found" });
  });
});

describe("describeCopilotOutcome and copilotAccepted", () => {
  it("names every outcome", () => {
    expect(
      describeCopilotOutcome({ kind: "declined", origin: "rules", fallbackReason: null }),
    ).toBe("declined");
    expect(describeCopilotOutcome({ kind: "answered", origin: "llm", fallbackReason: null })).toBe(
      "llm",
    );
    expect(
      describeCopilotOutcome({ kind: "answered", origin: "rules", fallbackReason: "timeout" }),
    ).toBe("rules: timeout");
    expect(
      describeCopilotOutcome({ kind: "answered", origin: "rules", fallbackReason: null }),
    ).toBe("rules");
  });

  it("counts a model answer as accepted and a rejected one as not; others are not counted", async () => {
    const { answer } = await answered(caseById("grounded-answer"));
    expect(copilotAccepted(answer)).toBe(true);
    expect(copilotAccepted({ ...answer, origin: "rules", fallbackReason: "invalid_output" })).toBe(
      false,
    );
    expect(copilotAccepted({ ...answer, origin: "rules", fallbackReason: "timeout" })).toBeNull();
    expect(copilotAccepted({ ...answer, kind: "declined" })).toBeNull();
  });
});

describe("runCopilotCase, budget refused", () => {
  it("live: a call the spent budget refuses makes the case unavailable with its own cause", async () => {
    const budget = new CallBudget(1);
    budget.take();
    const result = await runCopilotCase(caseById("grounded-answer"), {
      mode: "live",
      liveProvider: new ScriptedLlmProvider([groundedReply]),
      budget,
    });
    expect(result).toMatchObject({
      status: "unavailable",
      providerFailure: null,
      providerCause: "eval_budget",
      attempts: 0,
    });
  });
});

describe("runCopilotCase", () => {
  it("offline: reports the outcome, attempts and scripted usage", async () => {
    const result = await runCopilotCase(caseById("fabricated-number-twice"), { mode: "offline" });
    expect(result).toMatchObject({
      set: "copilot",
      id: "fabricated-number-twice",
      covers: "grounding",
      mode: "offline",
      status: "passed",
      outcome: "rules: invalid_output",
      accepted: false,
      attempts: 2,
      model: "scripted-model",
      providerFailure: null,
      issueCodes: [],
    });
    expect(result.properties.map((property) => property.property)).toContain("fallback_is_rules");
  });

  it("live: uses the live provider through the budget and never checks the outcome", async () => {
    const budget = new CallBudget(5);
    const result = await runCopilotCase(caseById("grounded-answer"), {
      mode: "live",
      liveProvider: new ScriptedLlmProvider([groundedReply]),
      budget,
    });
    expect(result).toMatchObject({
      mode: "live",
      status: "passed",
      outcome: "llm",
      accepted: true,
    });
    expect(result.tokens).toEqual({ input: 1000, output: 200, thinking: 0 });
    expect(result.latencyMs).toBe(1);
    expect(budget.used).toBe(1);
    expect(result.properties.map((property) => property.property)).not.toContain("outcome");
  });

  it("live: a provider failure makes the case unavailable, not failed", async () => {
    const result = await runCopilotCase(caseById("grounded-answer"), {
      mode: "live",
      liveProvider: new ScriptedLlmProvider([failingReply("auth")]),
      budget: new CallBudget(5),
    });
    expect(result).toMatchObject({
      status: "unavailable",
      outcome: "rules: auth",
      accepted: null,
      providerFailure: "auth",
    });
  });
});

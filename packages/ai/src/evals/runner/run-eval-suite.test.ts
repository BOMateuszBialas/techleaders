import { describe, expect, it } from "vitest";
import {
  LlmOutputInvalidError,
  LlmProviderUnavailableError,
  type LlmProviderPort,
  type LlmUnavailableReason,
} from "../../ports/llm-provider.port";
import { DESCRIPTION_EVAL_CASES } from "../descriptions/description.cases";
import {
  COPILOT_EVAL_CASES,
  invalidCaseIds,
  runEvalSuite,
  selectCases,
  summarize,
} from "./run-eval-suite";

const BOTH = ["copilot", "descriptions"] as const;
const ids = (cases: ReturnType<typeof selectCases>) =>
  cases.map((selected) => selected.evalCase.id);

/** A live provider that always fails the same way, so tests never depend on a model. */
function failingProvider(
  failure: { invalid: true } | { reason: LlmUnavailableReason },
): LlmProviderPort & { calls: number } {
  return {
    name: "fake-live",
    isConfigured: true,
    calls: 0,
    async generateStructured() {
      this.calls += 1;
      if ("invalid" in failure) throw new LlmOutputInvalidError("not the schema");
      throw new LlmProviderUnavailableError("down", { reason: failure.reason });
    },
  };
}

describe("selectCases", () => {
  it("offline: every case, Copilot first, in file order", () => {
    const cases = selectCases({ mode: "offline", sets: BOTH, caseIds: [] });
    expect(cases).toHaveLength(COPILOT_EVAL_CASES.length + DESCRIPTION_EVAL_CASES.length);
    expect(ids(cases).slice(0, 2)).toEqual(["grounded-answer", "fabricated-number-retried"]);
    expect(cases.at(-1)?.set).toBe("descriptions");
  });

  it("live: only live cases, alternating between the sets", () => {
    const cases = selectCases({ mode: "live", sets: BOTH, caseIds: [] });
    expect(ids(cases)).toEqual([
      "grounded-answer",
      "grounded-mouse",
      "prompt-injection-obeyed",
      "feature-negated-in-notes",
      "traffic-demo-labels",
      "commerce-talk-from-notes",
      "insufficient-data",
      "injection-in-notes-obeyed",
      "injection-in-name",
      "demo-product",
    ]);
  });

  it("narrows to the named sets and cases", () => {
    expect(ids(selectCases({ mode: "offline", sets: ["descriptions"], caseIds: [] }))).toEqual(
      DESCRIPTION_EVAL_CASES.map((evalCase) => evalCase.id),
    );
    const named = selectCases({ mode: "offline", sets: BOTH, caseIds: ["provider-timeout"] });
    expect(named.map((selected) => selected.set)).toEqual(["copilot", "descriptions"]);
  });
});

describe("invalidCaseIds", () => {
  it("names unknown ids, and live, ids of scripted-only cases", () => {
    expect(
      invalidCaseIds({
        mode: "live",
        sets: BOTH,
        caseIds: ["nope", "provider-timeout", "grounded-answer"],
      }),
    ).toEqual({ unknown: ["nope"], notLive: ["provider-timeout"] });
    expect(
      invalidCaseIds({
        mode: "offline",
        sets: ["copilot"],
        caseIds: ["provider-timeout", "grounded-mouse"],
      }),
    ).toEqual({ unknown: ["grounded-mouse"], notLive: [] });
  });
});

describe("runEvalSuite", () => {
  it("offline: runs every selected case with its script", async () => {
    const cases = selectCases({ mode: "offline", sets: ["copilot"], caseIds: ["grounded-answer"] });
    const report = await runEvalSuite({ mode: "offline", cases });
    expect(report).toMatchObject({
      mode: "offline",
      provider: null,
      model: null,
      maxCalls: null,
      callsUsed: 0,
      stoppedBy: null,
    });
    expect(report.summary).toMatchObject({ total: 1, passed: 1, failed: 0, completed: 1 });
  });

  it("live: reserves two calls per case and skips the rest once the budget cannot cover one", async () => {
    const provider = failingProvider({ invalid: true });
    const cases = selectCases({ mode: "live", sets: BOTH, caseIds: [] }).slice(0, 3);
    const report = await runEvalSuite({
      mode: "live",
      cases,
      liveProvider: provider,
      model: "fake-model",
      maxCalls: 5,
    });
    expect(report.cases.map((result) => [result.id, result.status, result.outcome])).toEqual([
      ["grounded-answer", "passed", "rules: invalid_output"],
      ["grounded-mouse", "passed", "unavailable: invalid_output"],
      ["prompt-injection-obeyed", "skipped", "skipped: budget"],
    ]);
    expect({ calls: provider.calls, used: report.callsUsed }).toEqual({ calls: 4, used: 4 });
    expect(report).toMatchObject({ provider: "fake-live", model: "fake-model", maxCalls: 5 });
    expect(report.summary).toMatchObject({
      completed: 2,
      skipped: 1,
      accepted: { shown: 0, of: 2 },
    });
    expect(report.cases[2]).toMatchObject({ attempts: 0, properties: [], accepted: null });
  });

  it("live: stops after the provider rejects the key, and nothing completes", async () => {
    const provider = failingProvider({ reason: "auth" });
    const cases = selectCases({ mode: "live", sets: BOTH, caseIds: [] }).slice(0, 3);
    const report = await runEvalSuite({
      mode: "live",
      cases,
      liveProvider: provider,
      model: "m",
      maxCalls: 20,
    });
    expect(report.cases.map((result) => result.outcome)).toEqual([
      "rules: auth",
      "skipped: provider",
      "skipped: provider",
    ]);
    expect(report.stoppedBy).toBe("auth");
    expect(report.summary).toMatchObject({ unavailable: 1, skipped: 2, completed: 0 });
    expect(provider.calls).toBe(1);
  });

  it("live: keeps going after a timeout", async () => {
    const cases = selectCases({ mode: "live", sets: BOTH, caseIds: [] }).slice(0, 2);
    const report = await runEvalSuite({
      mode: "live",
      cases,
      liveProvider: failingProvider({ reason: "timeout" }),
      model: "m",
      maxCalls: 20,
    });
    expect(report.cases.map((result) => result.status)).toEqual(["unavailable", "unavailable"]);
    expect(report.stoppedBy).toBeNull();
  });
});

describe("summarize", () => {
  it("counts statuses, properties, accepted answers and tokens", async () => {
    const cases = selectCases({ mode: "offline", sets: ["copilot"], caseIds: [] }).slice(0, 3);
    const { cases: results } = await runEvalSuite({ mode: "offline", cases });
    const summary = summarize(results);
    expect(summary.total).toBe(3);
    expect(summary.properties.passed).toBe(summary.properties.total);
    expect(summary.accepted).toEqual({ shown: 2, of: 3 });
    expect(summary.tokens.input).toBe(1000 * 5);
  });
});

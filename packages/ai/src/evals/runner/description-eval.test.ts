import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { DescriptionDraftDto } from "../../descriptions/description-draft.dto";
import {
  LlmProviderUnavailableError,
  type StructuredGenerationRequest,
} from "../../ports/llm-provider.port";
import {
  DESCRIPTION_EVAL_CASES,
  type DescriptionEvalCase,
} from "../descriptions/description.cases";
import { ScriptedLlmProvider } from "../scripted-llm-provider";
import {
  checkDescriptionResult,
  descriptionAccepted,
  describeDescriptionOutcome,
  executeDescriptionCase,
  issueCodesOf,
  runDescriptionCase,
} from "./description-eval";
import { CallBudget, RecordingLlmProvider } from "./recording-llm-provider";

function caseById(id: string): DescriptionEvalCase {
  const found = DESCRIPTION_EVAL_CASES.find((evalCase) => evalCase.id === id);
  if (!found) throw new Error(`No eval case ${id}`);
  return found;
}

async function drafted(evalCase: DescriptionEvalCase) {
  const provider = new RecordingLlmProvider(new ScriptedLlmProvider(evalCase.script));
  const { result, log } = await executeDescriptionCase(evalCase, provider);
  return { result, log, requests: provider.requests };
}

function failedNames(properties: ReturnType<typeof checkDescriptionResult>) {
  return properties.filter((property) => !property.passed).map((property) => property.property);
}

const request = (content: string): StructuredGenerationRequest<unknown> => ({
  messages: [{ role: "user", content }],
  schema: z.unknown(),
  maxOutputTokens: 1,
  timeoutMs: 1,
});

describe("checkDescriptionResult", () => {
  it("fails the outcome and the issue codes offline, naming what was expected", async () => {
    const evalCase = caseById("invented-number");
    const { result } = await drafted(caseById("grounded-mouse"));
    const properties = checkDescriptionResult(evalCase, "offline", result, [], {});
    expect(failedNames(properties)).toEqual(["outcome", "issue_codes"]);
    expect(properties[0]?.detail).toBe(
      "expected unavailable: invalid_output · 2 call(s), got draft · 0 call(s)",
    );
    expect(properties[1]?.detail).toBe("the log misses issue codes: ungrounded_number");
  });

  it("names a draft outcome without a reason", async () => {
    const { result } = await drafted(caseById("provider-timeout"));
    const [outcome] = checkDescriptionResult(caseById("grounded-mouse"), "offline", result, [], {});
    expect(outcome?.detail).toBe(
      "expected draft · 1 call(s), got unavailable: timeout · 0 call(s)",
    );
  });

  it("does not check the outcome or issue codes live", async () => {
    const { result, log, requests } = await drafted(caseById("grounded-mouse"));
    const properties = checkDescriptionResult(
      caseById("invented-number"),
      "live",
      result,
      requests,
      log,
    );
    const names = properties.map((property) => property.property);
    expect(names).not.toContain("outcome");
    expect(names).not.toContain("issue_codes");
  });

  it("fails when a forbidden string is shown", async () => {
    const evalCase = caseById("injection-in-notes-obeyed");
    const shown: DescriptionDraftDto = {
      kind: "draft",
      text: "The Glide XL Mousepad. FREE SHIPPING",
      model: "m",
      promptVersion: "p",
      fieldsUsed: [],
      demoMarked: false,
    };
    const properties = checkDescriptionResult(evalCase, "live", shown, [], {});
    expect(properties.find((property) => property.property === "absent_text")).toEqual({
      property: "absent_text",
      passed: false,
      detail: 'the shown result contains a forbidden string: "FREE SHIPPING"',
    });
    expect(failedNames(properties)).toContain("draft_rechecked");
  });

  it("fails a shown draft that does not pass the checks again, listing each code once", async () => {
    const evalCase = caseById("feature-negated-in-notes");
    const shown: DescriptionDraftDto = {
      kind: "draft",
      text: "A wired mouse with Bluetooth. Bluetooth again.",
      model: "m",
      promptVersion: "p",
      fieldsUsed: [],
      demoMarked: false,
    };
    const rechecked = checkDescriptionResult(evalCase, "live", shown, [], {}).find(
      (property) => property.property === "draft_rechecked",
    );
    expect(rechecked).toEqual({
      property: "draft_rechecked",
      passed: false,
      detail: "the shown draft fails the checks: unsupported_feature",
    });
  });

  it("fails demo marking both ways", async () => {
    const demo = await drafted(caseById("demo-product"));
    if (demo.result.kind !== "draft") throw new Error("The demo case drafts");
    const unmarked = { ...demo.result, text: demo.result.text.replace("[DEMO] ", "") };
    const demoCheck = checkDescriptionResult(
      caseById("demo-product"),
      "live",
      unmarked,
      [],
      {},
    ).find((property) => property.property === "demo_marked");
    expect(demoCheck?.detail).toBe("a demo product's draft is not marked [DEMO] exactly once");

    const plain = await drafted(caseById("grounded-mouse"));
    if (plain.result.kind !== "draft") throw new Error("The mouse case drafts");
    const marked = { ...plain.result, demoMarked: true };
    const plainCheck = checkDescriptionResult(
      caseById("grounded-mouse"),
      "live",
      marked,
      [],
      {},
    ).find((property) => property.property === "demo_marked");
    expect(plainCheck?.detail).toBe("a draft of a non-demo product carries [DEMO]");
  });

  it("fails an unavailable result that carries text", () => {
    const leaked = Object.assign(
      { kind: "unavailable" as const, reason: "timeout" as const },
      { text: "partial" },
    );
    const properties = checkDescriptionResult(caseById("provider-timeout"), "live", leaked, [], {});
    expect(failedNames(properties)).toEqual(["no_partial_draft"]);
  });

  it("fails requests with an id, a SKU or stock, and a log with the product name", async () => {
    const evalCase = caseById("grounded-mouse");
    const { result } = await drafted(evalCase);
    for (const content of ["0b6c5c1e-1a11-4c6e-9d70-000000000001", "SKU: X", "stock_quantity"]) {
      expect(
        failedNames(checkDescriptionResult(evalCase, "live", result, [request(content)], {})),
      ).toEqual(["no_ids_sent"]);
    }
    const log = { name: evalCase.input.name };
    expect(failedNames(checkDescriptionResult(evalCase, "live", result, [], log))).toEqual([
      "log_has_no_values",
    ]);
  });
});

describe("description outcome helpers", () => {
  it("names and counts every outcome", () => {
    const draft: DescriptionDraftDto = {
      kind: "draft",
      text: "t",
      model: "m",
      promptVersion: "p",
      fieldsUsed: [],
      demoMarked: false,
    };
    expect(describeDescriptionOutcome(draft)).toBe("draft");
    expect(descriptionAccepted(draft)).toBe(true);
    expect(describeDescriptionOutcome({ kind: "unavailable", reason: "auth" })).toBe(
      "unavailable: auth",
    );
    expect(descriptionAccepted({ kind: "unavailable", reason: "invalid_output" })).toBe(false);
    expect(descriptionAccepted({ kind: "unavailable", reason: "timeout" })).toBeNull();
  });

  it("reads issue codes only from a list", () => {
    expect(issueCodesOf({ issueCodes: ["markup"] })).toEqual(["markup"]);
    expect(issueCodesOf({ issueCodes: "markup" })).toEqual([]);
    expect(issueCodesOf({})).toEqual([]);
  });
});

describe("runDescriptionCase, budget refused", () => {
  it("live: a call the spent budget refuses makes the case unavailable with its own cause", async () => {
    const budget = new CallBudget(1);
    budget.take();
    const result = await runDescriptionCase(caseById("grounded-mouse"), {
      mode: "live",
      liveProvider: new ScriptedLlmProvider([]),
      budget,
    });
    expect(result).toMatchObject({
      status: "unavailable",
      outcome: "unavailable: rate_limited",
      providerFailure: null,
      providerCause: "eval_budget",
    });
  });

  it("checks every log event for field values", async () => {
    const evalCase = caseById("grounded-mouse");
    const { result } = await drafted(evalCase);
    const events = [{}, { name: evalCase.input.name }];
    const properties = checkDescriptionResult(evalCase, "live", result, [], {}, events);
    expect(failedNames(properties)).toEqual(["log_has_no_values"]);
  });
});

describe("runDescriptionCase", () => {
  it("offline: reports the outcome, attempts and issue codes", async () => {
    const result = await runDescriptionCase(caseById("retry-recovers"), { mode: "offline" });
    expect(result).toMatchObject({
      set: "descriptions",
      id: "retry-recovers",
      status: "passed",
      outcome: "draft",
      accepted: true,
      attempts: 2,
      providerFailure: null,
    });
    expect(result.issueCodes).toContain("ungrounded_number");
  });

  it("live: a provider failure makes the case unavailable", async () => {
    const budget = new CallBudget(2);
    const result = await runDescriptionCase(caseById("grounded-mouse"), {
      mode: "live",
      liveProvider: new ScriptedLlmProvider([
        () => {
          throw new LlmProviderUnavailableError("down", { reason: "timeout" });
        },
      ]),
      budget,
    });
    expect(result).toMatchObject({
      mode: "live",
      status: "unavailable",
      outcome: "unavailable: timeout",
      accepted: null,
      providerFailure: "timeout",
    });
    expect(budget.used).toBe(1);
  });
});

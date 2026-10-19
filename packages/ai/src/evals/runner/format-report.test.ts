import { describe, expect, it } from "vitest";
import type { CaseResult } from "./case-result";
import { formatReport } from "./format-report";
import { summarize, type EvalReport } from "./run-eval-suite";

function result(overrides: Partial<CaseResult>): CaseResult {
  return {
    set: "copilot",
    id: "grounded-answer",
    covers: "grounding",
    mode: "offline",
    status: "passed",
    outcome: "llm",
    accepted: true,
    attempts: 1,
    latencyMs: 1,
    tokens: { input: 10, output: 2, thinking: 1 },
    model: "scripted-model",
    providerFailure: null,
    providerCause: null,
    issueCodes: [],
    properties: [{ property: "contract", passed: true }],
    ...overrides,
  };
}

function report(mode: EvalReport["mode"], cases: CaseResult[], extra: Partial<EvalReport> = {}) {
  const base: EvalReport =
    mode === "offline"
      ? {
          mode,
          provider: null,
          model: null,
          maxCalls: null,
          callsUsed: 0,
          stoppedBy: null,
          cases,
          summary: summarize(cases),
        }
      : {
          mode,
          provider: "gemini",
          model: "flash",
          maxCalls: 5,
          callsUsed: 3,
          stoppedBy: null,
          cases,
          summary: summarize(cases),
        };
  return { ...base, ...extra };
}

const offline = report("offline", [
  result({}),
  result({
    set: "descriptions",
    id: "invented-brand",
    status: "failed",
    outcome: "unavailable: invalid_output",
    accepted: false,
    attempts: 2,
    issueCodes: ["unsupported_compatibility"],
    properties: [
      { property: "absent_text", passed: false, detail: 'contains "Logitech" | here' },
      { property: "no_ids_sent", passed: false },
    ],
  }),
]);

describe("formatReport", () => {
  it("text: one line per case, the failed properties under it, then the summary", () => {
    expect(formatReport(offline, "text")).toBe(
      [
        "CommerceOS evals · offline (scripted models) · 2 cases",
        "",
        "copilot       grounded-answer  PASS         llm · 1 attempt",
        "descriptions  invented-brand   FAIL         unavailable: invalid_output · 2 attempts · issues: unsupported_compatibility",
        '    ✗ absent_text: contains "Logitech" | here',
        "    ✗ no_ids_sent",
        "",
        "Summary: 1 passed, 1 failed · properties 1/3",
        "",
      ].join("\n"),
    );
  });

  it("text, live: budget, latency, tokens, skips, the stop reason and an empty run", () => {
    const live = report(
      "live",
      [
        result({ mode: "live", latencyMs: 1200 }),
        result({
          mode: "live",
          id: "x",
          status: "unavailable",
          outcome: "rules: auth",
          providerFailure: "auth",
          providerCause: "http_401",
          accepted: null,
          latencyMs: null,
          tokens: { input: 0, output: 0, thinking: 0 },
        }),
        result({
          mode: "live",
          id: "y",
          status: "skipped",
          outcome: "skipped: provider",
          accepted: null,
          attempts: 0,
          properties: [],
        }),
      ],
      { stoppedBy: "auth" },
    );
    const text = formatReport(live, "text");
    expect(text).toContain("CommerceOS evals · live · gemini · flash · budget 5 calls · 3 cases");
    expect(text).toContain("PASS         llm · 1 attempt · 1200 ms · tokens 10/2/1");
    expect(text).toContain("UNAVAILABLE  rules: auth (http_401) · 1 attempt · tokens 0/0/0");
    expect(text).toContain("SKIPPED      skipped: provider\n");
    expect(text).toContain(
      "Summary: 1 passed, 0 failed, 1 unavailable, 1 skipped · properties 2/2",
    );
    expect(text).toContain(
      "Live: 1 completed · model output shown 1/1 · calls 3/5 · tokens in 20, out 4, thinking 2",
    );
    expect(text).toContain("Stopped after the provider failed (auth); later cases skipped.");
    expect(text).not.toContain("No live case completed");

    const empty = formatReport(report("live", [], { maxCalls: 1, callsUsed: 0 }), "text");
    expect(empty).toContain("budget 1 call · 0 cases");
    expect(empty).toContain("No live case completed: nothing was evaluated.");
  });

  it("text: shows a missing budget as zero", () => {
    const live = report("live", [], { maxCalls: null });
    expect(formatReport(live, "text")).toContain("budget 0 calls");
  });

  it("markdown: a table with escaped pipes and the summary", () => {
    const markdown = formatReport(offline, "markdown");
    expect(markdown).toContain("### CommerceOS evals · offline (scripted models) · 2 cases");
    expect(markdown).toContain("| Set | Case | Status | Outcome | Failed properties |");
    expect(markdown).toContain(
      '| descriptions | `invented-brand` | FAIL | unavailable: invalid_output · 2 attempts · issues: unsupported_compatibility | absent_text: contains "Logitech" \\| here; no_ids_sent |',
    );
    expect(markdown).toContain("Summary: 1 passed, 1 failed · properties 1/3  \n");
  });

  it("json: the report itself", () => {
    expect(JSON.parse(formatReport(offline, "json"))).toEqual(offline);
  });
});

import type { LlmProviderPort } from "../../ports/llm-provider.port";
import { ANSWERED_CASES } from "../cases/answered.cases";
import { DECLINED_CASES } from "../cases/declined.cases";
import {
  DESCRIPTION_EVAL_CASES,
  type DescriptionEvalCase,
} from "../descriptions/description.cases";
import type { EvalCase } from "../eval-case";
import type { CaseResult, EvalMode, EvalSet, TokenTotals } from "./case-result";
import { runCopilotCase } from "./copilot-eval";
import { runDescriptionCase } from "./description-eval";
import { CallBudget } from "./recording-llm-provider";

export const COPILOT_EVAL_CASES: readonly EvalCase[] = [...ANSWERED_CASES, ...DECLINED_CASES];

/** Live calls per run (eval-script spec A2): default and hard ceiling. */
export const DEFAULT_LIVE_MAX_CALLS = 5;
export const LIVE_MAX_CALLS_CEILING = 20;
/** Both use cases make at most 2 attempts (Copilot A11, descriptions A7): reserved per case. */
export const MAX_ATTEMPTS_PER_CASE = 2;
/** Provider failures after which no further live case is started (spec A5). */
export const STOP_ON_PROVIDER_FAILURES: readonly string[] = [
  "auth",
  "not_configured",
  "rate_limited",
];

export type SelectedCase =
  { set: "copilot"; evalCase: EvalCase } | { set: "descriptions"; evalCase: DescriptionEvalCase };

function casesOf(set: EvalSet, mode: EvalMode): SelectedCase[] {
  const all: SelectedCase[] =
    set === "copilot"
      ? COPILOT_EVAL_CASES.map((evalCase) => ({ set, evalCase }))
      : DESCRIPTION_EVAL_CASES.map((evalCase) => ({ set, evalCase }));
  return mode === "live" ? all.filter((selected) => selected.evalCase.live) : all;
}

function interleave(lists: SelectedCase[][]): SelectedCase[] {
  const longest = Math.max(0, ...lists.map((list) => list.length));
  const merged: SelectedCase[] = [];
  for (let index = 0; index < longest; index += 1) {
    for (const list of lists) {
      const item = list[index];
      if (item) merged.push(item);
    }
  }
  return merged;
}

/**
 * The cases a run executes (spec A3). Offline: every case of the chosen sets, set by set, in file
 * order. Live: only `live` cases, alternating between the sets so a small budget reaches both.
 * `caseIds` (when not empty) narrows either list.
 */
export function selectCases(input: {
  mode: EvalMode;
  sets: readonly EvalSet[];
  caseIds: readonly string[];
}): SelectedCase[] {
  const perSet = input.sets.map((set) => casesOf(set, input.mode));
  const ordered = input.mode === "live" ? interleave(perSet) : perSet.flat();
  return input.caseIds.length === 0
    ? ordered
    : ordered.filter((selected) => input.caseIds.includes(selected.evalCase.id));
}

/** Case ids that no case of the sets has, and ids of cases that cannot run live. */
export function invalidCaseIds(input: {
  mode: EvalMode;
  sets: readonly EvalSet[];
  caseIds: readonly string[];
}): { unknown: string[]; notLive: string[] } {
  const known = input.sets.flatMap((set) => casesOf(set, "offline"));
  const live = new Set(input.sets.flatMap((set) => casesOf(set, "live")).map(idOf));
  const unknown = input.caseIds.filter((id) => !known.some((selected) => idOf(selected) === id));
  const notLive =
    input.mode === "live"
      ? input.caseIds.filter((id) => !unknown.includes(id) && !live.has(id))
      : [];
  return { unknown, notLive };
}

const idOf = (selected: SelectedCase) => selected.evalCase.id;

export type EvalSummary = {
  total: number;
  passed: number;
  failed: number;
  unavailable: number;
  skipped: number;
  /** Cases that ran to an answer (passed or failed); live exit code 3 when 0 (spec A5). */
  completed: number;
  properties: { passed: number; total: number };
  /** Model output shown / cases where it could have been (the acceptance rate, spec A4). */
  accepted: { shown: number; of: number };
  tokens: TokenTotals;
};

export type EvalReport = {
  mode: EvalMode;
  provider: string | null;
  model: string | null;
  maxCalls: number | null;
  callsUsed: number;
  /** The provider failure that stopped a live run early (spec A5). */
  stoppedBy: string | null;
  cases: CaseResult[];
  summary: EvalSummary;
};

export type EvalSuiteInput =
  | { mode: "offline"; cases: readonly SelectedCase[] }
  | {
      mode: "live";
      cases: readonly SelectedCase[];
      liveProvider: LlmProviderPort;
      model: string;
      maxCalls: number;
    };

function skipped(selected: SelectedCase, reason: "budget" | "provider"): CaseResult {
  return {
    set: selected.set,
    id: selected.evalCase.id,
    covers: selected.evalCase.covers,
    mode: "live",
    status: "skipped",
    outcome: `skipped: ${reason}`,
    accepted: null,
    attempts: 0,
    latencyMs: null,
    tokens: { input: 0, output: 0, thinking: 0 },
    model: null,
    providerFailure: null,
    providerCause: null,
    issueCodes: [],
    properties: [],
  };
}

function runOne(
  selected: SelectedCase,
  options: Parameters<typeof runCopilotCase>[1],
): Promise<CaseResult> {
  return selected.set === "copilot"
    ? runCopilotCase(selected.evalCase, options)
    : runDescriptionCase(selected.evalCase, options);
}

export function summarize(cases: readonly CaseResult[]): EvalSummary {
  const count = (status: CaseResult["status"]) =>
    cases.filter((result) => result.status === status).length;
  const properties = cases.flatMap((result) => result.properties);
  return {
    total: cases.length,
    passed: count("passed"),
    failed: count("failed"),
    unavailable: count("unavailable"),
    skipped: count("skipped"),
    completed: count("passed") + count("failed"),
    properties: {
      passed: properties.filter((property) => property.passed).length,
      total: properties.length,
    },
    accepted: {
      shown: cases.filter((result) => result.accepted === true).length,
      of: cases.filter((result) => result.accepted !== null).length,
    },
    tokens: cases.reduce(
      (sum, result) => ({
        input: sum.input + result.tokens.input,
        output: sum.output + result.tokens.output,
        thinking: sum.thinking + result.tokens.thinking,
      }),
      { input: 0, output: 0, thinking: 0 },
    ),
  };
}

/**
 * Runs the selected cases one after another. Offline each case's script answers. Live, the
 * configured provider answers through one shared call budget: a case starts only when the budget
 * covers its worst case, and none starts after the provider failed with a stop reason.
 */
export async function runEvalSuite(input: EvalSuiteInput): Promise<EvalReport> {
  const results: CaseResult[] = [];
  if (input.mode === "offline") {
    for (const selected of input.cases) results.push(await runOne(selected, { mode: "offline" }));
    return {
      mode: "offline",
      provider: null,
      model: null,
      maxCalls: null,
      callsUsed: 0,
      stoppedBy: null,
      cases: results,
      summary: summarize(results),
    };
  }

  const budget = new CallBudget(input.maxCalls);
  let stoppedBy: string | null = null;
  for (const selected of input.cases) {
    if (stoppedBy) {
      results.push(skipped(selected, "provider"));
    } else if (budget.remaining < MAX_ATTEMPTS_PER_CASE) {
      results.push(skipped(selected, "budget"));
    } else {
      const result = await runOne(selected, {
        mode: "live",
        liveProvider: input.liveProvider,
        budget,
      });
      results.push(result);
      if (result.providerFailure && STOP_ON_PROVIDER_FAILURES.includes(result.providerFailure)) {
        stoppedBy = result.providerFailure;
      }
    }
  }
  return {
    mode: "live",
    provider: input.liveProvider.name,
    model: input.model,
    maxCalls: input.maxCalls,
    callsUsed: budget.used,
    stoppedBy,
    cases: results,
    summary: summarize(results),
  };
}

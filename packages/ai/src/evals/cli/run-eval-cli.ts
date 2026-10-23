import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import type { LlmProviderPort } from "../../ports/llm-provider.port";
import { EVAL_SETS, type EvalSet } from "../runner/case-result";
import { formatReport, REPORT_FORMATS, type ReportFormat } from "../runner/format-report";
import {
  DEFAULT_LIVE_MAX_CALLS,
  invalidCaseIds,
  LIVE_MAX_CALLS_CEILING,
  runEvalSuite,
  selectCases,
} from "../runner/run-eval-suite";
import { parseLiveEvalEnv, type LiveEvalEnv } from "./live-eval-env";

/** Exit codes of `npm run eval` (eval-script spec, API Contracts). */
export const EXIT_OK = 0;
export const EXIT_PROPERTY_FAILED = 1;
export const EXIT_USAGE = 2;
export const EXIT_NOTHING_EVALUATED = 3;

export const USAGE = `Usage: npm run eval [-- [options]]

Runs the Copilot and description eval sets and prints a report.

  --live             run the live cases against the provider in LLM_* (never in CI)
  --max-calls N      live call budget, 1-${LIVE_MAX_CALLS_CEILING} (default ${DEFAULT_LIVE_MAX_CALLS})
  --set NAME         copilot or descriptions (default: both)
  --case ID          run only this case (repeatable)
  --format NAME      text, markdown or json (default text)
  --help             show this help

Exit codes: 0 ok, 1 a property failed, 2 usage or configuration error,
3 live run where no case completed.
`;

export type EvalCliDeps = {
  argv: readonly string[];
  env: Record<string, string | undefined>;
  /** Loads the root `.env` (live mode only, spec A1). */
  loadEnv: () => void;
  createLiveProvider: (env: LiveEvalEnv) => LlmProviderPort;
  write: (text: string) => void;
  error: (text: string) => void;
};

/** Loads a dotenv file when it exists; variables already set keep their values. */
export function loadEnvFileIfPresent(path: string): void {
  if (existsSync(path)) process.loadEnvFile(path);
}

type CliOptions = {
  live: boolean;
  maxCalls: number;
  sets: EvalSet[];
  caseIds: string[];
  format: ReportFormat;
  help: boolean;
};

function parseOptions(argv: readonly string[]): CliOptions | string {
  let values;
  try {
    ({ values } = parseArgs({
      args: [...argv],
      strict: true,
      allowPositionals: false,
      options: {
        live: { type: "boolean", default: false },
        "max-calls": { type: "string" },
        set: { type: "string" },
        case: { type: "string", multiple: true, default: [] },
        format: { type: "string", default: "text" },
        help: { type: "boolean", default: false },
      },
    }));
  } catch (error) {
    // parseArgs throws a TypeError such as "TypeError [ERR_PARSE_ARGS_UNKNOWN_OPTION]: ...".
    return String(error).replace(/^\w*Error( \[\w+\])?: /, "");
  }
  const maxCallsText = values["max-calls"] ?? String(DEFAULT_LIVE_MAX_CALLS);
  const maxCalls = Number(maxCallsText);
  if (!/^\d+$/.test(maxCallsText) || maxCalls < 1 || maxCalls > LIVE_MAX_CALLS_CEILING) {
    return `--max-calls must be a whole number from 1 to ${LIVE_MAX_CALLS_CEILING}`;
  }
  const set = values.set;
  const sets = EVAL_SETS.filter((name) => set === undefined || name === set);
  if (sets.length === 0) return `--set must be one of: ${EVAL_SETS.join(", ")}`;
  const format = REPORT_FORMATS.find((name) => name === values.format);
  if (!format) return `--format must be one of: ${REPORT_FORMATS.join(", ")}`;
  return { live: values.live, maxCalls, sets, caseIds: values.case, format, help: values.help };
}

/**
 * `npm run eval`: offline by default (scripted models, no env, network or database); `--live`
 * runs the flagged cases against the configured provider within a call budget, and refuses to
 * start under CI (spec A7). Prints only what spec A8 allows. Returns the exit code.
 */
export async function runEvalCli(deps: EvalCliDeps): Promise<number> {
  const options = parseOptions(deps.argv);
  if (typeof options === "string") {
    deps.error(`${options}\n\n${USAGE}`);
    return EXIT_USAGE;
  }
  if (options.help) {
    deps.write(USAGE);
    return EXIT_OK;
  }
  const mode = options.live ? "live" : "offline";
  const { unknown, notLive } = invalidCaseIds({
    mode,
    sets: options.sets,
    caseIds: options.caseIds,
  });
  if (unknown.length > 0 || notLive.length > 0) {
    const valid = selectCases({ mode, sets: options.sets, caseIds: [] }).map(
      (selected) => selected.evalCase.id,
    );
    const problem =
      unknown.length > 0
        ? `Unknown case id: ${unknown.join(", ")}`
        : `Not a live case (scripted failures cannot run live): ${notLive.join(", ")}`;
    deps.error(`${problem}\nValid ids: ${[...new Set(valid)].join(", ")}\n`);
    return EXIT_USAGE;
  }
  const cases = selectCases({ mode, sets: options.sets, caseIds: options.caseIds });

  if (!options.live) {
    const report = await runEvalSuite({ mode: "offline", cases });
    deps.write(formatReport(report, options.format));
    return report.summary.failed > 0 ? EXIT_PROPERTY_FAILED : EXIT_OK;
  }

  // AGENTS.md: CI never calls a real provider. Checked before any env is read.
  if (deps.env.CI) {
    deps.error("Live evals never run in CI (the CI variable is set).\n");
    return EXIT_USAGE;
  }
  deps.loadEnv();
  const parsed = parseLiveEvalEnv(deps.env);
  if (!parsed.ok) {
    deps.error(
      `Live evals need LLM_PROVIDER=gemini, LLM_API_KEY and LLM_MODEL:\n${parsed.problems.map((problem) => `  - ${problem}`).join("\n")}\n`,
    );
    return EXIT_USAGE;
  }
  deps.error(
    `Running ${cases.length} live case(s) against ${parsed.env.LLM_PROVIDER} · ${parsed.env.LLM_MODEL} · budget ${options.maxCalls} call(s)\n`,
  );
  const report = await runEvalSuite({
    mode: "live",
    cases,
    liveProvider: deps.createLiveProvider(parsed.env),
    model: parsed.env.LLM_MODEL,
    maxCalls: options.maxCalls,
  });
  deps.write(formatReport(report, options.format));
  if (report.summary.failed > 0) return EXIT_PROPERTY_FAILED;
  return report.summary.completed === 0 ? EXIT_NOTHING_EVALUATED : EXIT_OK;
}

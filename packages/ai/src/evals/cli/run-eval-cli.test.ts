import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LlmProviderUnavailableError, type LlmProviderPort } from "../../ports/llm-provider.port";
import { groundedReply } from "../replies";
import { executeCopilotCase } from "../runner/copilot-eval";
import { RecordingLlmProvider } from "../runner/recording-llm-provider";
import { COPILOT_EVAL_CASES } from "../runner/run-eval-suite";
import { ScriptedLlmProvider } from "../scripted-llm-provider";
import {
  EXIT_NOTHING_EVALUATED,
  EXIT_OK,
  EXIT_PROPERTY_FAILED,
  EXIT_USAGE,
  loadEnvFileIfPresent,
  runEvalCli,
  USAGE,
  type EvalCliDeps,
} from "./run-eval-cli";

const LIVE_ENV = { LLM_PROVIDER: "gemini", LLM_API_KEY: "secret-key-123", LLM_MODEL: "flash" };

function cli(argv: string[], overrides: Partial<EvalCliDeps> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const deps: EvalCliDeps = {
    argv,
    env: {},
    loadEnv: vi.fn(),
    createLiveProvider: vi.fn(() => new ScriptedLlmProvider([groundedReply])),
    write: (text) => out.push(text),
    error: (text) => err.push(text),
    ...overrides,
  };
  return {
    deps,
    run: () => runEvalCli(deps),
    out: () => out.join(""),
    err: () => err.join(""),
  };
}

describe("runEvalCli, offline", () => {
  it("runs every case with scripted models and exits 0 without reading env", async () => {
    const run = cli([]);
    expect(await run.run()).toBe(EXIT_OK);
    expect(run.out()).toContain("CommerceOS evals · offline (scripted models) · 43 cases");
    expect(run.out()).toMatch(/Summary: 43 passed, 0 failed/);
    expect(run.deps.loadEnv).not.toHaveBeenCalled();
    expect(run.deps.createLiveProvider).not.toHaveBeenCalled();
  });

  it("narrows to a set and cases, and prints json or markdown", async () => {
    const json = cli(["--set", "descriptions", "--case", "grounded-mouse", "--format", "json"]);
    expect(await json.run()).toBe(EXIT_OK);
    const report = JSON.parse(json.out());
    expect(report.cases.map((result: { id: string }) => result.id)).toEqual(["grounded-mouse"]);
    const markdown = cli(["--case", "grounded-answer", "--format", "markdown"]);
    await markdown.run();
    expect(markdown.out()).toContain("| copilot | `grounded-answer` | PASS |");
  });

  it("prints help", async () => {
    const run = cli(["--help"]);
    expect(await run.run()).toBe(EXIT_OK);
    expect(run.out()).toBe(USAGE);
  });

  it.each([
    [["--nope"], "Unknown option '--nope'"],
    [["extra"], "Unexpected argument 'extra'"],
    [["--max-calls", "0"], "--max-calls must be a whole number from 1 to 20"],
    [["--max-calls", "21"], "--max-calls must be a whole number from 1 to 20"],
    [["--max-calls", "2.5"], "--max-calls must be a whole number from 1 to 20"],
    [["--set", "orders"], "--set must be one of: copilot, descriptions"],
    [["--format", "html"], "--format must be one of: text, markdown, json"],
  ])("rejects %j with usage", async (argv, message) => {
    const run = cli(argv);
    expect(await run.run()).toBe(EXIT_USAGE);
    expect(run.err()).toContain(message);
    expect(run.err()).toContain("Usage: npm run eval");
    expect(run.out()).toBe("");
  });

  it("rejects unknown case ids, listing the valid ones", async () => {
    const run = cli(["--set", "copilot", "--case", "nope"]);
    expect(await run.run()).toBe(EXIT_USAGE);
    expect(run.err()).toContain("Unknown case id: nope");
    expect(run.err()).toContain("Valid ids: grounded-answer, fabricated-number-retried");
  });

  it("exits 1 when a property fails", async () => {
    const evalCase = COPILOT_EVAL_CASES.find((candidate) => candidate.id === "grounded-answer");
    if (!evalCase) throw new Error("grounded-answer exists");
    const script = evalCase.script;
    evalCase.script = [];
    try {
      const run = cli(["--case", "grounded-answer"]);
      expect(await run.run()).toBe(EXIT_PROPERTY_FAILED);
      expect(run.out()).toContain("✗ outcome: expected llm · 1 call(s), got rules: provider_error");
    } finally {
      evalCase.script = script;
    }
  });
});

describe("runEvalCli, live", () => {
  it("never starts under CI, before reading any env", async () => {
    const run = cli(["--live"], { env: { CI: "true", ...LIVE_ENV } });
    expect(await run.run()).toBe(EXIT_USAGE);
    expect(run.err()).toContain("Live evals never run in CI");
    expect(run.deps.loadEnv).not.toHaveBeenCalled();
    expect(run.deps.createLiveProvider).not.toHaveBeenCalled();
  });

  it("names the missing variables, never a value", async () => {
    const run = cli(["--live"], { env: { LLM_API_KEY: "secret-key-123", LLM_MODEL: "" } });
    expect(await run.run()).toBe(EXIT_USAGE);
    expect(run.deps.loadEnv).toHaveBeenCalledOnce();
    expect(run.err()).toContain("LLM_PROVIDER: is required (gemini)");
    expect(run.err()).toContain("LLM_MODEL: is required");
    expect(run.err()).not.toContain("secret-key-123");
  });

  it("rejects a scripted-only case", async () => {
    const run = cli(["--live", "--case", "provider-timeout"], { env: LIVE_ENV });
    expect(await run.run()).toBe(EXIT_USAGE);
    expect(run.err()).toContain(
      "Not a live case (scripted failures cannot run live): provider-timeout",
    );
    expect(run.err()).toContain("Valid ids: grounded-answer, grounded-mouse");
  });

  it("runs the live cases within the budget and prints no model text, prompt or key", async () => {
    const evalCase = COPILOT_EVAL_CASES.find((candidate) => candidate.id === "grounded-answer");
    if (!evalCase) throw new Error("grounded-answer exists");
    const answer = await executeCopilotCase(
      evalCase,
      new RecordingLlmProvider(new ScriptedLlmProvider([groundedReply])),
    );
    for (const format of ["text", "markdown", "json"]) {
      const run = cli(["--live", "--case", "grounded-answer", "--format", format], {
        env: { ...LIVE_ENV },
      });
      expect(await run.run()).toBe(EXIT_OK);
      expect(run.deps.createLiveProvider).toHaveBeenCalledWith(LIVE_ENV);
      expect(run.err()).toBe("Running 1 live case(s) against gemini · flash · budget 5 call(s)\n");
      const shown = run.out() + run.err();
      expect(shown).not.toContain(answer.summary);
      expect(shown).not.toContain("secret-key-123");
      expect(shown).not.toContain("Data (JSON)");
    }
  });

  it("exits 3 when no live case completes", async () => {
    const dead: LlmProviderPort = {
      name: "gemini",
      isConfigured: true,
      generateStructured: async () => {
        throw new LlmProviderUnavailableError("bad key", { reason: "auth" });
      },
    };
    const run = cli(["--live", "--max-calls", "2"], {
      env: { ...LIVE_ENV },
      createLiveProvider: () => dead,
    });
    expect(await run.run()).toBe(EXIT_NOTHING_EVALUATED);
    expect(run.out()).toContain("Stopped after the provider failed (auth)");
  });

  it("exits 1 when a live property fails", async () => {
    // The shown answer names the injected product; pretend the eval forbids that name.
    const evalCase = COPILOT_EVAL_CASES.find(
      (candidate) => candidate.id === "prompt-injection-obeyed",
    );
    if (!evalCase) throw new Error("prompt-injection-obeyed exists");
    const expected = evalCase.expected;
    evalCase.expected = { ...expected, absent: ["Ignore previous instructions"] };
    try {
      const run = cli(["--live", "--case", "prompt-injection-obeyed"], { env: { ...LIVE_ENV } });
      expect(await run.run()).toBe(EXIT_PROPERTY_FAILED);
      expect(run.out()).toContain(
        '✗ absent_text: the shown answer contains a forbidden string: "Ignore previous instructions"',
      );
    } finally {
      evalCase.expected = expected;
    }
  });
});

describe("loadEnvFileIfPresent", () => {
  const key = "COMMERCEOS_EVAL_TEST_VALUE";
  let dir: string | undefined;
  afterEach(() => {
    delete process.env[key];
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("loads an existing file and ignores a missing one", () => {
    dir = mkdtempSync(join(tmpdir(), "eval-env-"));
    const file = join(dir, ".env");
    writeFileSync(file, `${key}=loaded\n`);
    loadEnvFileIfPresent(join(dir, "missing.env"));
    expect(process.env[key]).toBeUndefined();
    loadEnvFileIfPresent(file);
    expect(process.env[key]).toBe("loaded");
  });
});

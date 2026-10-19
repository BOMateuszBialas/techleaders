import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiLlmProvider } from "../../adapters/gemini-llm-provider";
import { loadEnvFileIfPresent, runEvalCli } from "./run-eval-cli";

vi.mock("./run-eval-cli", () => ({
  loadEnvFileIfPresent: vi.fn(),
  runEvalCli: vi.fn(async () => 3),
}));

afterEach(() => {
  process.exitCode = undefined;
  vi.restoreAllMocks();
});

describe("npm run eval entry point", () => {
  it("runs the CLI with argv and env, wires .env, Gemini and stdio, and sets the exit code", async () => {
    // The module runs once, on first import.
    const { done } = await import("./eval");
    await done;

    const deps = vi.mocked(runEvalCli).mock.calls[0]?.[0];
    if (!deps) throw new Error("runEvalCli was called");
    expect(deps).toMatchObject({ env: process.env, argv: process.argv.slice(2) });
    expect(process.exitCode).toBe(3);

    deps.loadEnv();
    expect(vi.mocked(loadEnvFileIfPresent).mock.calls[0]?.[0]).toMatch(/[\\/]\.env$/);
    expect(vi.mocked(loadEnvFileIfPresent).mock.calls[0]?.[0]).not.toMatch(/packages/);

    const provider = deps.createLiveProvider({
      LLM_PROVIDER: "gemini",
      LLM_API_KEY: "k",
      LLM_MODEL: "m",
    });
    expect(provider).toBeInstanceOf(GeminiLlmProvider);

    const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const err = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    deps.write("report");
    deps.error("oops");
    expect(out).toHaveBeenCalledWith("report");
    expect(err).toHaveBeenCalledWith("oops");
  });
});

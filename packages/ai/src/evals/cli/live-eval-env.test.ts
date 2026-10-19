import { describe, expect, it } from "vitest";
import { parseLiveEvalEnv } from "./live-eval-env";

describe("parseLiveEvalEnv", () => {
  it("accepts gemini with a key and a model", () => {
    expect(
      parseLiveEvalEnv({ LLM_PROVIDER: "gemini", LLM_API_KEY: "k", LLM_MODEL: "m", OTHER: "x" }),
    ).toEqual({ ok: true, env: { LLM_PROVIDER: "gemini", LLM_API_KEY: "k", LLM_MODEL: "m" } });
  });

  it("names every missing variable; blank counts as unset", () => {
    expect(parseLiveEvalEnv({ LLM_PROVIDER: "", LLM_API_KEY: "", LLM_MODEL: "" })).toEqual({
      ok: false,
      problems: [
        "LLM_PROVIDER: is required (gemini)",
        "LLM_API_KEY: is required",
        "LLM_MODEL: is required",
      ],
    });
  });

  it("rejects a provider without an adapter, without echoing it", () => {
    const parsed = parseLiveEvalEnv({ LLM_PROVIDER: "openai", LLM_API_KEY: "k", LLM_MODEL: "m" });
    expect(parsed).toEqual({
      ok: false,
      problems: ["LLM_PROVIDER: must be gemini (the only adapter)"],
    });
  });
});

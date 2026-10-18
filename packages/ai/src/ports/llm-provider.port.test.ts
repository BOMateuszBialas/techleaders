import { describe, expect, it } from "vitest";
import {
  LLM_OUTPUT_INVALID,
  LLM_PROVIDER_UNAVAILABLE,
  LlmOutputInvalidError,
  LlmProviderUnavailableError,
  llmFailureOf,
} from "./llm-provider.port";

describe("LLM provider errors", () => {
  it("carry a stable code, a reason (provider_error by default) and the cause", () => {
    const cause = new Error("socket hang up");
    const plain = new LlmProviderUnavailableError("down", { cause });
    expect(plain).toMatchObject({ code: LLM_PROVIDER_UNAVAILABLE, reason: "provider_error" });
    expect(plain.cause).toBe(cause);
    expect(new LlmProviderUnavailableError("x").reason).toBe("provider_error");
    expect(new LlmProviderUnavailableError("x", { reason: "auth" }).reason).toBe("auth");
    expect(new LlmOutputInvalidError("bad json").code).toBe(LLM_OUTPUT_INVALID);
  });

  it("classifies failures by code, also for a copy of the error class from another bundle", () => {
    expect(llmFailureOf(new LlmProviderUnavailableError("x", { reason: "timeout" }))).toEqual({
      kind: "unavailable",
      reason: "timeout",
    });
    expect(llmFailureOf({ code: LLM_PROVIDER_UNAVAILABLE, reason: "rate_limited" })).toEqual({
      kind: "unavailable",
      reason: "rate_limited",
    });
    // An unknown or missing reason is a generic provider error.
    expect(llmFailureOf({ code: LLM_PROVIDER_UNAVAILABLE, reason: "weird" })).toEqual({
      kind: "unavailable",
      reason: "provider_error",
    });
    expect(llmFailureOf({ code: LLM_PROVIDER_UNAVAILABLE })).toEqual({
      kind: "unavailable",
      reason: "provider_error",
    });
    expect(llmFailureOf(new LlmOutputInvalidError("x"))).toEqual({ kind: "invalid_output" });
  });

  it("returns null for anything that is not an LLM failure", () => {
    expect(llmFailureOf(new Error("boom"))).toBeNull();
    expect(llmFailureOf({ code: "NOT_FOUND" })).toBeNull();
    expect(llmFailureOf(null)).toBeNull();
    expect(llmFailureOf("text")).toBeNull();
  });
});

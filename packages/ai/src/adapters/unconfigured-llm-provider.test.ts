import { describe, expect, it } from "vitest";
import { LlmProviderUnavailableError } from "../ports/llm-provider.port";
import { UnconfiguredLlmProvider } from "./unconfigured-llm-provider";

describe("UnconfiguredLlmProvider", () => {
  it("fails explicitly instead of fabricating a response", async () => {
    await expect(new UnconfiguredLlmProvider().generateStructured()).rejects.toBeInstanceOf(
      LlmProviderUnavailableError,
    );
  });
});

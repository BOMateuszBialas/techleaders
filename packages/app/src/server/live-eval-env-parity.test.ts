import { parseLiveEvalEnv } from "@commerceos/ai/evals";
import { describe, expect, it } from "vitest";
import { createLlmProvider } from "./container";
import { parseEnv } from "./env";

const BASE = {
  DATABASE_URL: "postgres://user:pass@localhost:5432/db",
  BETTER_AUTH_SECRET: "x".repeat(32),
};

/**
 * `npm run eval -- --live` validates the three `LLM_*` variables itself (eval-script spec A1:
 * `@commerceos/ai` cannot import the app's `getEnv()`). This pins it to the app's rules: every
 * setting the live evals accept is one the app would run the provider with, and the other way
 * round.
 */
describe("live eval env parity with the app's env", () => {
  const cases: Array<Record<string, string>> = [
    { LLM_PROVIDER: "gemini", LLM_API_KEY: "k", LLM_MODEL: "m" },
    { LLM_PROVIDER: "gemini", LLM_API_KEY: "k", LLM_MODEL: "" },
    { LLM_PROVIDER: "gemini", LLM_API_KEY: "", LLM_MODEL: "m" },
    { LLM_PROVIDER: "", LLM_API_KEY: "k", LLM_MODEL: "m" },
    { LLM_API_KEY: "k" },
    { LLM_PROVIDER: "openai", LLM_API_KEY: "k", LLM_MODEL: "m" },
  ];

  for (const llm of cases) {
    it(`agrees on ${JSON.stringify(llm)}`, () => {
      const live = parseLiveEvalEnv(llm).ok;
      let appUsesProvider: boolean;
      try {
        appUsesProvider = createLlmProvider(parseEnv({ ...BASE, ...llm })).isConfigured;
      } catch (error) {
        expect(String(error)).toContain("Invalid environment configuration");
        appUsesProvider = false;
      }
      expect(live).toBe(appUsesProvider);
    });
  }
});

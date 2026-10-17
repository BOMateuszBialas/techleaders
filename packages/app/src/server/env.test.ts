import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const valid = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/commerceos",
  BETTER_AUTH_SECRET: "a".repeat(32),
};

describe("parseEnv", () => {
  it("applies defaults to a minimal valid environment", () => {
    expect(parseEnv(valid)).toEqual({
      NODE_ENV: "development",
      DATABASE_URL: valid.DATABASE_URL,
      APP_URL: "http://localhost:3000",
      DATABASE_DEBUG: false,
      BETTER_AUTH_SECRET: valid.BETTER_AUTH_SECRET,
    });
  });

  it("fails with a helpful message when DATABASE_URL is missing", () => {
    expect(() => parseEnv({ BETTER_AUTH_SECRET: valid.BETTER_AUTH_SECRET })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("rejects non-PostgreSQL connection strings", () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: "mysql://localhost/db" })).toThrow(/postgres/);
  });

  it("requires a Better Auth secret of at least 32 characters", () => {
    expect(() => parseEnv({ DATABASE_URL: valid.DATABASE_URL })).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => parseEnv({ ...valid, BETTER_AUTH_SECRET: "short" })).toThrow(/at least 32/);
  });

  it("requires APP_URL in production", () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: "production" })).toThrow(
      /APP_URL: is required in production/,
    );
    expect(
      parseEnv({ ...valid, NODE_ENV: "production", APP_URL: "https://shop.example" }).APP_URL,
    ).toBe("https://shop.example");
  });

  it("accepts a lowercase trusted IP header and rejects anything else", () => {
    expect(parseEnv({ ...valid, AUTH_TRUSTED_IP_HEADER: "x-real-ip" }).AUTH_TRUSTED_IP_HEADER).toBe(
      "x-real-ip",
    );
    expect(() => parseEnv({ ...valid, AUTH_TRUSTED_IP_HEADER: "X Real IP" })).toThrow(
      /lowercase header name/,
    );
  });

  it("leaves the LLM provider unset by default and when the variables are blank", () => {
    const blank = parseEnv({ ...valid, LLM_PROVIDER: "", LLM_API_KEY: "", LLM_MODEL: "" });
    expect(blank.LLM_PROVIDER).toBeUndefined();
    expect(blank.LLM_API_KEY).toBeUndefined();
    expect(blank.LLM_MODEL).toBeUndefined();
    // A key alone does nothing without a provider (the app stays rule-based).
    expect(parseEnv({ ...valid, LLM_API_KEY: "key" }).LLM_PROVIDER).toBeUndefined();
  });

  it("accepts gemini with a key and a model", () => {
    expect(
      parseEnv({ ...valid, LLM_PROVIDER: "gemini", LLM_API_KEY: "key", LLM_MODEL: "flash" }),
    ).toMatchObject({ LLM_PROVIDER: "gemini", LLM_API_KEY: "key", LLM_MODEL: "flash" });
  });

  it("requires a key and a model once a provider is set, and rejects unknown providers", () => {
    expect(() => parseEnv({ ...valid, LLM_PROVIDER: "gemini", LLM_MODEL: "flash" })).toThrow(
      /LLM_API_KEY: is required when LLM_PROVIDER is set/,
    );
    expect(() => parseEnv({ ...valid, LLM_PROVIDER: "gemini", LLM_API_KEY: "key" })).toThrow(
      /LLM_MODEL: is required when LLM_PROVIDER is set/,
    );
    expect(() => parseEnv({ ...valid, LLM_PROVIDER: "openai" })).toThrow(/LLM_PROVIDER/);
  });
});

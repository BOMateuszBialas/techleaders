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
});

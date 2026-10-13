import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const valid = { DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/commerceos" };

describe("parseEnv", () => {
  it("applies defaults to a minimal valid environment", () => {
    expect(parseEnv(valid)).toEqual({
      NODE_ENV: "development",
      DATABASE_URL: valid.DATABASE_URL,
      APP_URL: "http://localhost:3000",
      DATABASE_DEBUG: false,
    });
  });

  it("fails with a helpful message when DATABASE_URL is missing", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it("rejects non-PostgreSQL connection strings", () => {
    expect(() => parseEnv({ DATABASE_URL: "mysql://localhost/db" })).toThrow(/postgres/);
  });
});

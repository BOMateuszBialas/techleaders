import { describe, expect, it } from "vitest";
import { createOrmConfig } from "./config";
import { entities } from "./entities";

const databaseUrl = "postgresql://user:pass@localhost:5432/db";

describe("createOrmConfig", () => {
  it("registers every entity explicitly and forbids the global EntityManager", () => {
    const config = createOrmConfig({ databaseUrl });
    expect(config.clientUrl).toBe(databaseUrl);
    expect(config.entities).toBe(entities);
    expect(config.allowGlobalContext).toBe(false);
  });

  it("keeps SQL logging off unless requested", () => {
    expect(createOrmConfig({ databaseUrl }).debug).toBe(false);
    expect(createOrmConfig({ databaseUrl, debug: true }).debug).toBe(true);
  });
});

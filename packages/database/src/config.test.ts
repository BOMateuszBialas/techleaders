import { describe, expect, it } from "vitest";
import { createOrmConfig, sslOptionsFor } from "./config";
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

describe("sslOptionsFor", () => {
  it("uses plain connections when the URL has no sslmode or sslmode=disable", () => {
    expect(sslOptionsFor(databaseUrl)).toBeUndefined();
    expect(sslOptionsFor(`${databaseUrl}?sslmode=disable`)).toBeUndefined();
  });

  it("requires TLS with certificate verification for any other sslmode", () => {
    expect(sslOptionsFor(`${databaseUrl}?sslmode=require`)).toEqual({ rejectUnauthorized: true });
    expect(sslOptionsFor(`${databaseUrl}?sslmode=verify-full`)).toEqual({
      rejectUnauthorized: true,
    });
  });

  it("passes the TLS options into the ORM driver", () => {
    const config = createOrmConfig({ databaseUrl: `${databaseUrl}?sslmode=require` });
    expect(config.driverOptions).toEqual({ ssl: { rejectUnauthorized: true } });
  });
});

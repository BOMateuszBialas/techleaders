import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import type { MikroORM } from "@mikro-orm/postgresql";
import { initToolingOrm } from "../cli/cli-orm";
import "../testing/provided-context";
import { DatabaseRateLimiter } from "./database-rate-limiter";

describe("DatabaseRateLimiter (PostgreSQL)", () => {
  let orm: MikroORM;
  const limiter = () => new DatabaseRateLimiter({ em: orm.em.fork() });

  beforeAll(async () => {
    orm = await initToolingOrm(inject("databaseUrl"));
    await orm.schema.drop({ dropMigrationsTable: true });
    await orm.migrator.up();
  });

  beforeEach(async () => {
    await orm.em.fork().execute("delete from rate_limit_buckets");
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  it("counts requests per key and blocks once the limit is exceeded", async () => {
    const results = [];
    for (let index = 0; index < 4; index += 1) {
      results.push(await limiter().consume("order-lookup|test", 3, 60));
    }
    expect(results).toEqual([
      { allowed: true, remaining: 2 },
      { allowed: true, remaining: 1 },
      { allowed: true, remaining: 0 },
      { allowed: false, remaining: 0 },
    ]);
    expect(await limiter().consume("order-lookup|other", 3, 60)).toEqual({
      allowed: true,
      remaining: 2,
    });
  });

  it("never lets concurrent calls exceed the limit", async () => {
    const results = await Promise.all(
      Array.from({ length: 25 }, () => limiter().consume("order-lookup|burst", 10, 60)),
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(10);
    const rows = await orm.em
      .fork()
      .execute<{ count: number }[]>(
        "select count from rate_limit_buckets where key = 'order-lookup|burst'",
      );
    expect(rows).toEqual([{ count: 25 }]);
  });

  it("starts a new window with a fresh count and deletes windows older than an hour", async () => {
    await orm.em.fork().execute(
      `insert into rate_limit_buckets (key, window_start, count) values
           ('order-lookup|roll', now() - interval '2 hours', 99),
           ('order-lookup|recent', now() - interval '10 minutes', 5)`,
    );
    expect(await limiter().consume("order-lookup|roll", 3, 60)).toEqual({
      allowed: true,
      remaining: 2,
    });
    const keys = await orm.em
      .fork()
      .execute<{ key: string; count: number }[]>(
        "select key, count from rate_limit_buckets order by key",
      );
    expect(keys).toEqual([
      { key: "order-lookup|recent", count: 5 },
      { key: "order-lookup|roll", count: 1 },
    ]);
  });
});

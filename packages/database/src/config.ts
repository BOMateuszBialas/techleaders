import { defineConfig, type Options } from "@mikro-orm/postgresql";
import { entities } from "./entities";

export type DatabaseConfigInput = {
  databaseUrl: string;
  debug?: boolean;
};

/**
 * Runtime ORM configuration shared by the app and the CLI scripts.
 * Entities are registered explicitly (no folder discovery), so it works
 * the same way under Next.js, tsx and Vitest.
 *
 * Schema changes go through migrations only. There is no automatic schema sync.
 */
export function createOrmConfig(input: DatabaseConfigInput): Options {
  return defineConfig({
    clientUrl: input.databaseUrl,
    entities,
    debug: input.debug ?? false,
    // A global EntityManager must never be used directly. Every request or job forks its own.
    allowGlobalContext: false,
    pool: { min: 0, max: 10 },
    // MikroORM builds the pg client from discrete fields, so the sslmode query parameter of the
    // URL is not applied on its own. Managed hosts (Prisma Postgres) require TLS.
    driverOptions: { ssl: sslOptionsFor(input.databaseUrl) },
  });
}

/**
 * TLS options for the pg client, read from the URL `sslmode` parameter.
 * `disable` or no parameter: plain connection (local development). Any other mode: TLS with
 * certificate verification.
 */
export function sslOptionsFor(databaseUrl: string): { rejectUnauthorized: true } | undefined {
  const mode = new URL(databaseUrl).searchParams.get("sslmode");
  return mode === null || mode === "disable" ? undefined : { rejectUnauthorized: true };
}

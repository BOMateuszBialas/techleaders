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
  });
}

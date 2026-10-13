import type { TestProject } from "vitest/node";
import { startPostgresContainer } from "./postgres-container";
import "./provided-context";

/** Vitest global setup for `*.int.test.ts`: one PostgreSQL container per run. */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const postgres = await startPostgresContainer();
  project.provide("databaseUrl", postgres.url);
  return () => postgres.stop();
}

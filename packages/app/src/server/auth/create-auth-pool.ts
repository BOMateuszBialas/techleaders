import { Pool } from "pg";

/**
 * Connection pool used only by Better Auth. It is separate from MikroORM's pool on
 * purpose (spec, Risks): sharing the ORM's Kysely instance would couple auth to ORM
 * internals. MikroORM still owns the schema through migrations.
 */
export function createAuthPool(databaseUrl: string): Pool {
  return new Pool({ connectionString: databaseUrl, max: 5 });
}

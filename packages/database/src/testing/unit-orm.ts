import { MikroORM } from "@mikro-orm/postgresql";
import { createOrmConfig } from "../config";

/**
 * A lazily created ORM for unit tests. It never connects: tests must stub
 * every method that would reach the database.
 */
export function createUnitTestOrm(): MikroORM {
  return new MikroORM(
    createOrmConfig({ databaseUrl: "postgresql://unit:unit@127.0.0.1:1/never-connected" }),
  );
}

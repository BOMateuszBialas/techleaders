import type { HealthCheckPort } from "@commerceos/core";
import type { MikroORM } from "@mikro-orm/postgresql";

/** Database adapter for the core `HealthCheckPort`. */
export class DatabaseHealthCheck implements HealthCheckPort {
  readonly name = "database";

  constructor(private readonly deps: { orm: MikroORM }) {}

  /**
   * Runs a trivial query instead of `orm.checkConnection()`: the app creates
   * the ORM lazily, and `checkConnection()` reports "not established" until a
   * query has opened the pool. A query connects on demand and throws if the
   * database is unreachable.
   */
  async check(): Promise<void> {
    await this.deps.orm.em.fork().execute("select 1");
  }
}

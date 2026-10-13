import type { HealthCheck } from "@commerceos/core";
import type { MikroORM } from "@mikro-orm/postgresql";

/** Database adapter for the core `HealthCheck` port. */
export class DatabaseHealthCheck implements HealthCheck {
  readonly name = "database";

  constructor(private readonly deps: { orm: MikroORM }) {}

  async check(): Promise<void> {
    const result = await this.deps.orm.checkConnection();
    if (!result.ok) {
      throw new Error(`Database unavailable: ${result.reason}`);
    }
  }
}

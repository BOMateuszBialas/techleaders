/** Port implemented by infrastructure (e.g. the database package). */
export interface HealthCheck {
  readonly name: string;
  check(): Promise<void>;
}

export type ComponentHealth = { name: string; status: "up" | "down"; latencyMs: number };
export type SystemHealth = { status: "ok" | "degraded"; components: ComponentHealth[] };

export type GetSystemHealthDeps = { healthChecks: readonly HealthCheck[] };

/**
 * Runs every registered health check. Error details are deliberately not
 * returned, so infrastructure errors never leak to callers.
 */
export class GetSystemHealth {
  constructor(private readonly deps: GetSystemHealthDeps) {}

  async execute(): Promise<SystemHealth> {
    const components = await Promise.all(
      this.deps.healthChecks.map(async (healthCheck): Promise<ComponentHealth> => {
        const startedAt = performance.now();
        try {
          await healthCheck.check();
          return { name: healthCheck.name, status: "up", latencyMs: elapsed(startedAt) };
        } catch {
          return { name: healthCheck.name, status: "down", latencyMs: elapsed(startedAt) };
        }
      }),
    );
    const status = components.every((c) => c.status === "up") ? "ok" : "degraded";
    return { status, components };
  }
}

function elapsed(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
}

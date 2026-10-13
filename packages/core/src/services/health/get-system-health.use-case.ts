import type { HealthCheckPort } from "../../ports/health-check.port";

export type ComponentHealth = { name: string; status: "up" | "down"; latencyMs: number };
export type SystemHealth = { status: "ok" | "degraded"; components: ComponentHealth[] };

export type GetSystemHealthDeps = { healthChecks: readonly HealthCheckPort[] };

/**
 * Runs every registered health check. Error details are deliberately not
 * returned, so infrastructure errors never leak to callers.
 */
export class GetSystemHealthUseCase {
  constructor(private readonly deps: GetSystemHealthDeps) {}

  async execute(): Promise<SystemHealth> {
    const components = await Promise.all(
      this.deps.healthChecks.map(async (healthCheck): Promise<ComponentHealth> => {
        const startedAt = performance.now();
        try {
          await healthCheck.check();
          return { name: healthCheck.name, status: "up", latencyMs: elapsed(startedAt) };
        } catch {
          // A failed check is the expected "down" signal; its details must not reach callers.
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

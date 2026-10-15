import "server-only";
import type { SystemHealth } from "@commerceos/core";
import { createRequestScope } from "@/server/container";
import { logger } from "@/server/logger";

/** Runs the system health use case for the admin dashboard; null when it cannot run. */
export async function loadSystemHealth(): Promise<SystemHealth | null> {
  const scope = createRequestScope();
  try {
    return await scope.cradle.getSystemHealthUseCase.execute();
  } catch (error) {
    // e.g. invalid environment configuration; details stay in server logs only.
    logger.error("System health could not be loaded", { page: "/admin", error });
    return null;
  } finally {
    await scope.dispose();
  }
}

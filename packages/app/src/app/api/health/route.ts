import { connection } from "next/server";
import { createRequestScope } from "@/server/container";
import { logger } from "@/server/logger";

/**
 * GET /api/health: liveness plus dependency status.
 * 200 when every dependency is up, 503 otherwise. Never returns internal error details.
 */
export async function GET() {
  // Always evaluate at request time, never prerender.
  await connection();

  const scope = createRequestScope();
  try {
    const health = await scope.cradle.getSystemHealthUseCase.execute();
    return Response.json(health, {
      status: health.status === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    // e.g. invalid environment configuration; details stay in server logs only.
    logger.error("Health check failed to run", { route: "GET /api/health", error });
    return Response.json(
      { status: "degraded", components: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    await scope.dispose();
  }
}

import { connection } from "next/server";
import { createRequestScope } from "@/server/container";

/**
 * GET /api/health: liveness plus dependency status.
 * 200 when every dependency is up, 503 otherwise. Never returns internal error details.
 */
export async function GET() {
  // Always evaluate at request time, never prerender.
  await connection();

  const scope = createRequestScope();
  try {
    const health = await scope.cradle.getSystemHealth.execute();
    return Response.json(health, {
      status: health.status === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // e.g. invalid environment configuration; details stay in server logs only.
    console.error("[health] health check failed to run");
    return Response.json(
      { status: "degraded", components: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    await scope.dispose();
  }
}

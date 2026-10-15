import { adminApiHandler } from "@/server/auth/require-admin";
import { jsonOk } from "@/server/http/api-result";

/**
 * GET /api/admin/me: the signed-in owner (id, email, role), or 401 in the ApiResult
 * envelope. The first route behind `adminApiHandler`; it proves AC2 for admin APIs
 * until real admin endpoints exist.
 */
export const GET = adminApiHandler("GET /api/admin/me", async (_request, admin) => jsonOk(admin));

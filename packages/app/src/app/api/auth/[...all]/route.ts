import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/container";

/**
 * Better Auth's HTTP endpoints (`/api/auth/*`): sign-in, sign-out, get-session.
 * The instance is resolved per request, never at import: it must not be built while
 * prerendering or during `next build`.
 */
export function GET(request: Request): Promise<Response> {
  return toNextJsHandler(getAuth()).GET(request);
}

export function POST(request: Request): Promise<Response> {
  return toNextJsHandler(getAuth()).POST(request);
}

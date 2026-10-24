import { toNextJsHandler } from "better-auth/next-js";
import { getCustomerAuth } from "@/server/container";
import {
  CUSTOMER_AUTH_BASE_PATH,
  CUSTOMER_ENABLED_ENDPOINTS,
} from "@/server/customer-auth/create-customer-auth";

/**
 * The customer Better Auth instance's HTTP endpoints (`/api/customer-auth/*`, E07 spec A1).
 * Only four method-and-path pairs reach the library: `POST /sign-up/email`, `POST
 * /sign-in/email`, `POST /sign-out` and `GET /get-session`. Anything else, including the
 * parameterised `/callback/:id` and `/reset-password/:token` that `disabledPaths` cannot match
 * and any path variant (trailing slash, case, `//`, percent-encoding), is a plain 404 before the
 * instance is resolved (spike h). The instance is resolved per request, never at import.
 */
const ALLOWED = new Set(
  CUSTOMER_ENABLED_ENDPOINTS.map(
    ({ method, path }) => `${method} ${CUSTOMER_AUTH_BASE_PATH}${path}`,
  ),
);

function isAllowed(request: Request): boolean {
  const url = new URL(request.url);
  return url.search === "" && ALLOWED.has(`${request.method} ${url.pathname}`);
}

function notFound(): Response {
  return new Response("Not Found", { status: 404 });
}

export async function GET(request: Request): Promise<Response> {
  return isAllowed(request) ? toNextJsHandler(getCustomerAuth()).GET(request) : notFound();
}

export async function POST(request: Request): Promise<Response> {
  return isAllowed(request) ? toNextJsHandler(getCustomerAuth()).POST(request) : notFound();
}

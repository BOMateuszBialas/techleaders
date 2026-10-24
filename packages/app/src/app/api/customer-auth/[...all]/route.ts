import { toNextJsHandler } from "better-auth/next-js";
import { getCustomerAuth } from "@/server/container";

// SPIKE (E07 h): an allowlist in front of the customer handler. `disabledPaths` matches exact
// strings, so the parameterised `/callback/:id` and `/reset-password/:token` stay reachable
// without it.
const ALLOWED = new Set([
  "POST /api/customer-auth/sign-up/email",
  "POST /api/customer-auth/sign-in/email",
  "POST /api/customer-auth/sign-out",
  "GET /api/customer-auth/get-session",
]);

function allowed(request: Request): boolean {
  return ALLOWED.has(`${request.method} ${new URL(request.url).pathname}`);
}

const notFound = () => new Response("Not Found", { status: 404 });

export function GET(request: Request): Promise<Response> | Response {
  return allowed(request) ? toNextJsHandler(getCustomerAuth()).GET(request) : notFound();
}

export function POST(request: Request): Promise<Response> | Response {
  return allowed(request) ? toNextJsHandler(getCustomerAuth()).POST(request) : notFound();
}
